import asyncio
import uuid
from collections import defaultdict
from typing import List, Optional
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Body
from sqlalchemy import insert as sa_insert, select, delete
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db, AsyncSessionLocal
from app.api.dependencies import get_current_user
from app.models.instructor import Instructor
from app.models.stored_file import StoredFile
from app.models.boilerplate import Boilerplate
from app.models.comparison_result import ComparisonResult
from app.models.repository import Repository
from app.models.repository_submission import RepositorySubmission
from app.repositories.assignment_repository import assignment_repository
from app.repositories.submission_repository import submission_repository
from app.repositories.comparison_result_repository import comparison_result_repository
from app.services.storage_service import storage_service
from app.services.analysis_service import analysis_service
from app.services.archival_service import effective_status
from app.schemas.comparison_result import ComparisonResultCreate, ComparisonResultResponse
from app.analysis import scorer
from app.analysis.scorer import calculate_similarity

router = APIRouter()
logger = logging.getLogger(__name__)

# Pairs below this score are not stored — reduces DB writes significantly at scale.
MIN_SCORE_THRESHOLD = 0.0


def _score_pairs(fp_list: list, pairs: list) -> list:
    """
    Synchronous scoring loop run in a thread executor so the event loop stays
    free while all CPU-bound fingerprint comparisons complete.

    Returns list of (i, j, score, ranges_a, ranges_b, matched_pairs).
    """
    results = []
    for i, j in pairs:
        fp_a = fp_list[i]
        fp_b = fp_list[j]
        if not fp_a or not fp_b:
            continue
        score, ranges_a, ranges_b, matched_pairs = calculate_similarity(fp_a, fp_b)
        if score < MIN_SCORE_THRESHOLD:
            continue
        results.append((i, j, score, ranges_a, ranges_b, matched_pairs))
    return results


def _score_cross_pairs(sub_fps: list, repo_fps: list) -> list:
    """
    Synchronous cross-repo scoring loop run in a thread executor.
    sub_fps: list of (index, fingerprint)
    repo_fps: list of (index, fingerprint)
    Returns list of (sub_idx, rs_idx, score, ranges_a, ranges_b, matched_pairs).
    """
    results = []
    for sub_idx, s_fp in sub_fps:
        if not s_fp:
            continue
        for rs_idx, t_fp in repo_fps:
            if not t_fp:
                continue
            score, ranges_a, ranges_b, matched_pairs = calculate_similarity(s_fp, t_fp)
            if score < MIN_SCORE_THRESHOLD:
                continue
            results.append((sub_idx, rs_idx, score, ranges_a, ranges_b, matched_pairs))
    return results


async def _build_submission_fingerprint(sid, files, lang, boilerplate_hashes, loop):
    """
    Download (concurrently via executor) and fingerprint all files for one submission.
    Returns (sid, combined_fp, file_names) where file_names is {file_idx: fname}.
    """
    combined_fp = []
    file_names = {}
    for file_idx, f in enumerate(files):
        fname = f.storage_path.rsplit('/', 1)[-1] if '/' in f.storage_path else f.storage_path
        file_names[file_idx] = fname
        try:
            if f.fingerprint_hash:
                for fp_item in f.fingerprint_hash:
                    tagged = dict(fp_item)
                    tagged['file_index'] = file_idx
                    combined_fp.append(tagged)
            else:
                code_bytes = await loop.run_in_executor(None, storage_service.download_file, f.storage_path)
                code_str = code_bytes.decode('utf-8')
                fp = analysis_service.strip_and_fingerprint(code_str, lang)
                for fp_item in fp:
                    fp_item['file_index'] = file_idx
                combined_fp.extend(fp)
        except Exception:
            logger.exception("Error downloading/parsing stored file", extra={"storage_path": f.storage_path})

    if boilerplate_hashes and combined_fp:
        combined_fp = scorer.remove_boilerplate(combined_fp, boilerplate_hashes)

    return sid, combined_fp, file_names


def _build_match_metadata(ranges_a, ranges_b, source_file_names, target_file_names, matched_pairs, extra=None):
    """Build the match_metadata dict from scoring output."""
    s_file_ranges = defaultdict(list)
    for r in ranges_a:
        s_file_ranges[r.get("file_index", 0)].append({"start": r["start"], "end": r["end"]})

    t_file_ranges = defaultdict(list)
    for r in ranges_b:
        t_file_ranges[r.get("file_index", 0)].append({"start": r["start"], "end": r["end"]})

    source_files_meta = [
        {"file_index": fi, "filename": source_file_names.get(fi, f"file_{fi}"), "ranges": s_file_ranges[fi]}
        for fi in sorted(s_file_ranges.keys())
    ]
    target_files_meta = [
        {"file_index": fi, "filename": target_file_names.get(fi, f"file_{fi}"), "ranges": t_file_ranges[fi]}
        for fi in sorted(t_file_ranges.keys())
    ]

    metadata = {
        "source_files": source_files_meta,
        "target_files": target_files_meta,
        "matched_pairs": matched_pairs,
    }
    if extra:
        metadata.update(extra)
    return metadata


class AnalysisRequest(BaseModel):
    repository_ids: Optional[List[uuid.UUID]] = None


def _restored_status(assignment) -> str:
    """Restore the persisted lifecycle status after analysis completes."""
    if assignment.status == "Archived":
        return "Archived"
    if assignment.deadline and assignment.deadline <= datetime.now(timezone.utc):
        return "Closed"
    return "Open"


async def perform_full_analysis(assignment_id: uuid.UUID, repository_ids: Optional[List[uuid.UUID]] = None):
    """
    Background worker: N×N comparison of all active submissions, plus optional
    cross-repo comparisons. Optimised for 200+ submission scale:
      - Concurrent MinIO downloads via asyncio.gather + run_in_executor
      - Scoring loop offloaded to thread executor (frees event loop)
      - Single bulk INSERT instead of per-pair ORM creates
      - Pairs below MIN_SCORE_THRESHOLD are discarded
    """
    async with AsyncSessionLocal() as db:
        try:
            assignment = await assignment_repository.get(db, assignment_id)
            if not assignment:
                return

            submissions = await submission_repository.get_active_by_assignment(db, assignment_id)
            if len(submissions) < 2:
                assignment.status = _restored_status(assignment)
                await db.commit()
                return

            # Fetch stored files for all submissions
            sub_files = {}
            for sub in submissions:
                result = await db.execute(
                    select(StoredFile)
                    .where(StoredFile.submission_id == sub.id)
                    .order_by(StoredFile.storage_path)
                )
                sub_files[sub.id] = list(result.scalars().all())

            lang = assignment.language

            # Build boilerplate fingerprint hashes
            bp_query = await db.execute(
                select(Boilerplate).where(Boilerplate.assignment_id == assignment_id)
            )
            boilerplate_records = bp_query.scalars().all()

            boilerplate_hashes: set = set()
            for bp in boilerplate_records:
                try:
                    bp_code = bp.content if bp.content else storage_service.download_file(bp.storage_path).decode('utf-8')
                    bp_fp = analysis_service.strip_and_fingerprint(bp_code, lang)
                    boilerplate_hashes.update(fp_item['hash'] for fp_item in bp_fp)
                except Exception:
                    logger.exception("Error processing boilerplate", extra={"boilerplate_id": str(bp.id)})

            # ── Fix 1: Concurrent MinIO downloads ─────────────────────────────
            loop = asyncio.get_event_loop()
            fp_tasks = [
                _build_submission_fingerprint(sid, files, lang, boilerplate_hashes, loop)
                for sid, files in sub_files.items()
            ]
            fp_results = await asyncio.gather(*fp_tasks, return_exceptions=True)

            fingerprints = {}
            sub_file_names = {}  # {sid: {file_idx: fname}}
            for r in fp_results:
                if isinstance(r, Exception):
                    logger.exception("Error building submission fingerprint")
                    continue
                sid, combined_fp, file_names = r
                fingerprints[sid] = combined_fp
                sub_file_names[sid] = file_names

            # Clear previous comparison results before re-running
            sub_id_list = [s.id for s in submissions]
            await db.execute(
                delete(ComparisonResult).where(
                    (ComparisonResult.source_submission_id.in_(sub_id_list)) |
                    (ComparisonResult.target_submission_id.in_(sub_id_list))
                )
            )

            # ── Fix 2: Scoring in thread executor + Fix 4: Skip low scores ────
            sub_list = list(submissions)
            fp_list = [fingerprints.get(sub.id, []) for sub in sub_list]
            pairs = [(i, j) for i in range(len(sub_list)) for j in range(i + 1, len(sub_list))]

            scored = await loop.run_in_executor(None, _score_pairs, fp_list, pairs)

            # ── Fix 3: Bulk INSERT ─────────────────────────────────────────────
            now = datetime.now(timezone.utc)
            results_batch = []
            for i, j, score, ranges_a, ranges_b, matched_pairs in scored:
                source = sub_list[i]
                target = sub_list[j]
                metadata = _build_match_metadata(
                    ranges_a, ranges_b,
                    sub_file_names.get(source.id, {}),
                    sub_file_names.get(target.id, {}),
                    matched_pairs,
                )
                results_batch.append({
                    "id": uuid.uuid4(),
                    "source_submission_id": source.id,
                    "target_submission_id": target.id,
                    "target_repo_submission_id": None,
                    "comparison_type": "internal",
                    "similarity_score": score,
                    "match_metadata": metadata,
                    "created_at": now,
                })

            if results_batch:
                await db.execute(sa_insert(ComparisonResult), results_batch)

            # ── Cross-repo comparisons ─────────────────────────────────────────
            if repository_ids:
                for repo_id in repository_ids:
                    repo_result = await db.execute(select(Repository).where(Repository.id == repo_id))
                    repo_obj = repo_result.scalars().first()
                    if not repo_obj:
                        continue

                    rs_query = await db.execute(
                        select(RepositorySubmission)
                        .options(joinedload(RepositorySubmission.stored_files))
                        .where(RepositorySubmission.repository_id == repo_id)
                    )
                    repo_subs = rs_query.scalars().unique().all()

                    # Concurrent MinIO downloads for repo submissions
                    repo_fp_tasks = [
                        _build_submission_fingerprint(rs.id, rs.stored_files or [], lang, boilerplate_hashes, loop)
                        for rs in repo_subs
                    ]
                    repo_fp_results = await asyncio.gather(*repo_fp_tasks, return_exceptions=True)

                    repo_fingerprints = {}
                    repo_file_names = {}
                    for r in repo_fp_results:
                        if isinstance(r, Exception):
                            logger.exception("Error building repo submission fingerprint")
                            continue
                        rsid, combined_fp, file_names = r
                        repo_fingerprints[rsid] = combined_fp
                        repo_file_names[rsid] = file_names

                    # Score cross pairs in thread executor
                    sub_fps = [(i, fingerprints.get(sub.id, [])) for i, sub in enumerate(sub_list)]
                    rs_fps = [(j, repo_fingerprints.get(rs.id, [])) for j, rs in enumerate(repo_subs)]

                    cross_scored = await loop.run_in_executor(None, _score_cross_pairs, sub_fps, rs_fps)

                    # Bulk INSERT cross-repo results
                    cross_batch = []
                    for sub_idx, rs_idx, score, ranges_a, ranges_b, matched_pairs in cross_scored:
                        sub = sub_list[sub_idx]
                        rs = repo_subs[rs_idx]
                        repo_alias = f"REPO-{str(rs.id).replace('-', '')[:8].upper()}"
                        metadata = _build_match_metadata(
                            ranges_a, ranges_b,
                            sub_file_names.get(sub.id, {}),
                            repo_file_names.get(rs.id, {}),
                            matched_pairs,
                            extra={"repo_name": repo_obj.name, "repo_label": repo_alias},
                        )
                        cross_batch.append({
                            "id": uuid.uuid4(),
                            "source_submission_id": sub.id,
                            "target_submission_id": None,
                            "target_repo_submission_id": rs.id,
                            "comparison_type": "cross_repo",
                            "similarity_score": score,
                            "match_metadata": metadata,
                            "created_at": now,
                        })

                    if cross_batch:
                        await db.execute(sa_insert(ComparisonResult), cross_batch)

            assignment.status = _restored_status(assignment)
            await db.commit()

        except Exception:
            await db.rollback()
            assignment = await assignment_repository.get(db, assignment_id)
            if assignment and assignment.status != "Archived":
                assignment.status = _restored_status(assignment)
                await db.commit()
            logger.exception("Background analysis failed", extra={"assignment_id": str(assignment_id)})


@router.post("/{assignment_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def trigger_analysis(
    assignment_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    body: Optional[AnalysisRequest] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_instructor: Instructor = Depends(get_current_user)
):
    """
    Starts the similarity analysis asynchronously.
    Optionally accepts repository_ids to run cross-repo comparisons.
    """
    from app.models.assignment import Assignment
    from app.models.course import Course

    query = select(Assignment).join(Course).where(Assignment.id == assignment_id, Course.instructor_id == current_instructor.id)
    result = await db.execute(query)
    assignment = result.scalars().first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not authorized to analyze this assignment")

    if assignment.status == "Archived":
        raise HTTPException(status_code=400, detail="Cannot run analysis on an archived assignment")

    repo_ids = body.repository_ids if body and body.repository_ids else None

    assignment.status = "Analyzing..."
    await db.commit()

    background_tasks.add_task(perform_full_analysis, assignment_id, repo_ids)
    return {"message": "Analysis started in background"}
