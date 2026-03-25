import uuid
from typing import List, Dict
import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, AsyncSessionLocal
from app.api.dependencies import get_current_user
from app.models.instructor import Instructor
from app.repositories.assignment_repository import assignment_repository
from app.repositories.submission_repository import submission_repository
from app.repositories.stored_file_repository import stored_file_repository
from app.repositories.comparison_result_repository import comparison_result_repository

from app.services.storage_service import storage_service
from app.services.analysis_service import analysis_service
from app.schemas.comparison_result import ComparisonResultCreate, ComparisonResultResponse

router = APIRouter()
logger = logging.getLogger(__name__)

async def perform_full_analysis(assignment_id: uuid.UUID):
    """
    Background worker function that performs an N x N comparison
    of all active submissions in the assignment.
    """
    async with AsyncSessionLocal() as db:
        try:
            submissions = await submission_repository.get_active_by_assignment(db, assignment_id)
            if len(submissions) < 2:
                return # Nothing to compare

            # Get stored files for each submission
            sub_files = {}
            for sub in submissions:
                # We fetch files
                from sqlalchemy import select, delete
                from app.models.stored_file import StoredFile
                result = await db.execute(select(StoredFile).where(StoredFile.submission_id == sub.id))
                files = list(result.scalars().all())
                sub_files[sub.id] = files

            # We need the language from the assignment
            assignment = await assignment_repository.get(db, assignment_id)
            if not assignment:
                return
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

            for sid, files in sub_files.items():
                combined_fp = []
                for f in files:
                    try:
                        if f.fingerprint_hash:
                            combined_fp.extend(f.fingerprint_hash)
                        else:
                            code_bytes = storage_service.download_file(f.storage_path)
                            code_str = code_bytes.decode('utf-8')
                            fp = analysis_service.strip_and_fingerprint(code_str, lang)
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

            sub_ids = list(submissions)
            for i in range(len(sub_ids)):
                for j in range(i + 1, len(sub_ids)):
                    source = sub_ids[i]
                    target = sub_ids[j]

                    s_fp = fingerprints.get(source.id, [])
                    t_fp = fingerprints.get(target.id, [])

                    if not s_fp or not t_fp:
                        continue

                    score, ranges_a, ranges_b = analysis_service.calculate_similarity_score(s_fp, t_fp)

                    # Create DB record if score > 0 (or some threshold) to save space
                    if score > 0:
                        metadata = {
                            "source_ranges": ranges_a,
                            "target_ranges": ranges_b
                        }
                        data = ComparisonResultCreate(
                            source_submission_id=source.id,
                            target_submission_id=target.id,
                            similarity_score=score,
                            match_metadata=metadata
                        )
                        await comparison_result_repository.create(db, data)

            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("Background analysis failed", extra={"assignment_id": str(assignment_id)})

@router.post("/{assignment_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def trigger_analysis(
    assignment_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_instructor: Instructor = Depends(get_current_user)
):
    """
    Starts the similarity analysis asynchronously.
    """
    from sqlalchemy import select
    from app.models.assignment import Assignment
    from app.models.course import Course

    query = select(Assignment).join(Course).where(Assignment.id == assignment_id, Course.instructor_id == current_instructor.id)
    result = await db.execute(query)
    assignment = result.scalars().first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not authorized to analyze this assignment")

    # Queue worker
    background_tasks.add_task(perform_full_analysis, assignment_id)
    return {"message": "Analysis started in background"}
