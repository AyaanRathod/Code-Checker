import uuid
from typing import List, Dict, Optional
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db, AsyncSessionLocal
from app.api.dependencies import get_current_user
from app.models.instructor import Instructor
from app.repositories.assignment_repository import assignment_repository
from app.repositories.submission_repository import submission_repository
from app.repositories.stored_file_repository import stored_file_repository
from app.repositories.comparison_result_repository import comparison_result_repository

from app.services.storage_service import storage_service
from app.services.analysis_service import analysis_service
from app.services.archival_service import effective_status
from app.schemas.comparison_result import ComparisonResultCreate, ComparisonResultResponse

router = APIRouter()
logger = logging.getLogger(__name__)


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
    Background worker function that performs an N x N comparison
    of all active submissions in the assignment, plus optional
    cross-repo comparisons against selected repositories.
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
                return # Nothing to compare

            # Get stored files for each submission
            sub_files = {}
            for sub in submissions:
                # We fetch files
                from sqlalchemy import select, delete
                from sqlalchemy.orm import joinedload
                from app.models.stored_file import StoredFile
                result = await db.execute(select(StoredFile).where(StoredFile.submission_id == sub.id).order_by(StoredFile.storage_path))
                files = list(result.scalars().all())
                sub_files[sub.id] = files

            # We need the language from the assignment
            lang = assignment.language

            # Build boilerplate fingerprint hashes to exclude from comparisons
            from app.models.boilerplate import Boilerplate
            from app.analysis import scorer

            bp_query = await db.execute(select(Boilerplate).where(Boilerplate.assignment_id == assignment_id))
            boilerplate_records = bp_query.scalars().all()

            boilerplate_hashes: set = set()
            for bp in boilerplate_records:
                try:
                    if bp.content:
                        bp_code = bp.content
                    else:
                        bp_bytes = storage_service.download_file(bp.storage_path)
                        bp_code = bp_bytes.decode('utf-8')
                    bp_fp = analysis_service.strip_and_fingerprint(bp_code, lang)
                    boilerplate_hashes.update(fp_item['hash'] for fp_item in bp_fp)
                except Exception:
                    logger.exception("Error processing boilerplate", extra={"boilerplate_id": str(bp.id)})

            # We pull code down from MinIO, fingerprint, store fingerprints in memory
            # Then we compare them.
            fingerprints = {}
            # Track (submission_id, file_index) -> filename for per-file metadata
            sub_file_names = {}

            for sid, files in sub_files.items():
                combined_fp = []
                for file_idx, f in enumerate(files):
                    # Extract filename from storage_path
                    fname = f.storage_path.rsplit('/', 1)[-1] if '/' in f.storage_path else f.storage_path
                    sub_file_names[(sid, file_idx)] = fname
                    try:
                        if f.fingerprint_hash:
                            for fp_item in f.fingerprint_hash:
                                tagged = dict(fp_item)
                                tagged['file_index'] = file_idx
                                combined_fp.append(tagged)
                        else:
                            code_bytes = storage_service.download_file(f.storage_path)
                            code_str = code_bytes.decode('utf-8')
                            fp = analysis_service.strip_and_fingerprint(code_str, lang)
                            for fp_item in fp:
                                fp_item['file_index'] = file_idx
                            combined_fp.extend(fp)
                    except Exception:
                        logger.exception("Error downloading/parsing stored file", extra={"storage_path": f.storage_path})

                # Remove boilerplate fingerprints before comparison
                if boilerplate_hashes and combined_fp:
                    combined_fp = scorer.remove_boilerplate(combined_fp, boilerplate_hashes)

                fingerprints[sid] = combined_fp

            # Clear previous comparison results for this assignment before re-running
            from app.models.comparison_result import ComparisonResult

            sub_id_list = [s.id for s in submissions]
            await db.execute(
                delete(ComparisonResult).where(
                    (ComparisonResult.source_submission_id.in_(sub_id_list)) |
                    (ComparisonResult.target_submission_id.in_(sub_id_list))
                )
            )

            from collections import defaultdict

            sub_ids = list(submissions)
            for i in range(len(sub_ids)):
                for j in range(i + 1, len(sub_ids)):
                    source = sub_ids[i]
                    target = sub_ids[j]

                    s_fp = fingerprints.get(source.id, [])
                    t_fp = fingerprints.get(target.id, [])

                    if not s_fp or not t_fp:
                        continue

                    score, ranges_a, ranges_b, matched_pairs = analysis_service.calculate_similarity_score(s_fp, t_fp)

                    # Create DB record for all comparisons, even if score is 0
                    if score >= 0:
                        # Group match ranges by file_index for per-file metadata
                        s_file_ranges = defaultdict(list)
                        for r in ranges_a:
                            s_file_ranges[r.get("file_index", 0)].append({"start": r["start"], "end": r["end"]})

                        t_file_ranges = defaultdict(list)
                        for r in ranges_b:
                            t_file_ranges[r.get("file_index", 0)].append({"start": r["start"], "end": r["end"]})

                        source_files_meta = []
                        for fi in sorted(s_file_ranges.keys()):
                            fname = sub_file_names.get((source.id, fi), f"file_{fi}")
                            source_files_meta.append({"file_index": fi, "filename": fname, "ranges": s_file_ranges[fi]})

                        target_files_meta = []
                        for fi in sorted(t_file_ranges.keys()):
                            fname = sub_file_names.get((target.id, fi), f"file_{fi}")
                            target_files_meta.append({"file_index": fi, "filename": fname, "ranges": t_file_ranges[fi]})

                        metadata = {
                            "source_files": source_files_meta,
                            "target_files": target_files_meta,
                            "matched_pairs": matched_pairs
                        }
                        data = ComparisonResultCreate(
                            source_submission_id=source.id,
                            target_submission_id=target.id,
                            similarity_score=score,
                            match_metadata=metadata
                        )
                        await comparison_result_repository.create(db, data)

            # ---- Cross-repo comparisons ----
            if repository_ids:
                from app.models.repository import Repository
                from app.models.repository_submission import RepositorySubmission

                for repo_id in repository_ids:
                    repo = await db.execute(select(Repository).where(Repository.id == repo_id))
                    repo_obj = repo.scalars().first()
                    if not repo_obj:
                        continue

                    # Fetch repo submissions with their files
                    rs_query = await db.execute(
                        select(RepositorySubmission)
                        .options(joinedload(RepositorySubmission.stored_files))
                        .where(RepositorySubmission.repository_id == repo_id)
                    )
                    repo_subs = rs_query.scalars().unique().all()

                    # Fingerprint each repo submission
                    repo_fingerprints = {}
                    repo_file_names = {}

                    for rs in repo_subs:
                        combined_fp = []
                        for file_idx, f in enumerate(rs.stored_files or []):
                            fname = f.storage_path.rsplit('/', 1)[-1] if '/' in f.storage_path else f.storage_path
                            repo_file_names[(rs.id, file_idx)] = fname
                            try:
                                if f.fingerprint_hash:
                                    for fp_item in f.fingerprint_hash:
                                        tagged = dict(fp_item)
                                        tagged['file_index'] = file_idx
                                        combined_fp.append(tagged)
                                else:
                                    code_bytes = storage_service.download_file(f.storage_path)
                                    code_str = code_bytes.decode('utf-8')
                                    fp = analysis_service.strip_and_fingerprint(code_str, lang)
                                    for fp_item in fp:
                                        fp_item['file_index'] = file_idx
                                    combined_fp.extend(fp)
                            except Exception:
                                logger.exception("Error fingerprinting repo file", extra={"storage_path": f.storage_path})

                        if boilerplate_hashes and combined_fp:
                            combined_fp = scorer.remove_boilerplate(combined_fp, boilerplate_hashes)

                        repo_fingerprints[rs.id] = combined_fp

                    # Compare each current submission against each repo submission
                    for sub in submissions:
                        s_fp = fingerprints.get(sub.id, [])
                        if not s_fp:
                            continue

                        for rs in repo_subs:
                            t_fp = repo_fingerprints.get(rs.id, [])
                            if not t_fp:
                                continue

                            score, ranges_a, ranges_b, matched_pairs = analysis_service.calculate_similarity_score(s_fp, t_fp)

                            if score >= 0:
                                s_file_ranges = defaultdict(list)
                                for r in ranges_a:
                                    s_file_ranges[r.get("file_index", 0)].append({"start": r["start"], "end": r["end"]})

                                t_file_ranges = defaultdict(list)
                                for r in ranges_b:
                                    t_file_ranges[r.get("file_index", 0)].append({"start": r["start"], "end": r["end"]})

                                source_files_meta = []
                                for fi in sorted(s_file_ranges.keys()):
                                    fname = sub_file_names.get((sub.id, fi), f"file_{fi}")
                                    source_files_meta.append({"file_index": fi, "filename": fname, "ranges": s_file_ranges[fi]})

                                target_files_meta = []
                                for fi in sorted(t_file_ranges.keys()):
                                    fname = repo_file_names.get((rs.id, fi), f"file_{fi}")
                                    target_files_meta.append({"file_index": fi, "filename": fname, "ranges": t_file_ranges[fi]})

                                repo_alias = f"REPO-{str(rs.id).replace('-', '')[:8].upper()}"
                                metadata = {
                                    "source_files": source_files_meta,
                                    "target_files": target_files_meta,
                                    "matched_pairs": matched_pairs,
                                    "repo_name": repo_obj.name,
                                    "repo_label": repo_alias
                                }
                                data = ComparisonResultCreate(
                                    source_submission_id=sub.id,
                                    target_repo_submission_id=rs.id,
                                    comparison_type="cross_repo",
                                    similarity_score=score,
                                    match_metadata=metadata
                                )
                                await comparison_result_repository.create(db, data)

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
    from sqlalchemy import select
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

    # Queue worker
    background_tasks.add_task(perform_full_analysis, assignment_id, repo_ids)
    return {"message": "Analysis started in background"}
