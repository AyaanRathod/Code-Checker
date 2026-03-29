from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.comparison_result import ComparisonResult
from app.models.course import Course
from app.models.stored_file import StoredFile
from app.models.submission import Submission

ARCHIVE_GRACE_DAYS = 30


def effective_status(assignment: Assignment, now: Optional[datetime] = None) -> str:
    """Compute assignment display status using deadline and grace rules."""
    if assignment.status == "Archived":
        return "Archived"

    current = now or datetime.now(timezone.utc)
    if assignment.deadline:
        if assignment.status in ("Open", "Closed") and assignment.deadline + timedelta(days=ARCHIVE_GRACE_DAYS) <= current:
            return "Archived"
        if assignment.status == "Open" and assignment.deadline <= current:
            return "Closed"
    return assignment.status


async def finalize_archive(db: AsyncSession, assignment: Assignment) -> None:
    """Finalize archival: strip PII, clear analysis, and create a repository snapshot."""
    if assignment.status == "Archived":
        return

    assignment.status = "Archived"

    await db.execute(
        update(Submission)
        .where(Submission.assignment_id == assignment.id)
        .values(student_name_encrypted=None, student_id_encrypted=None)
    )

    sub_ids_query = select(Submission.id).where(Submission.assignment_id == assignment.id)
    sub_ids = [row[0] for row in (await db.execute(sub_ids_query)).all()]
    if sub_ids:
        await db.execute(
            delete(ComparisonResult).where(
                (ComparisonResult.source_submission_id.in_(sub_ids))
                | (ComparisonResult.target_submission_id.in_(sub_ids))
            )
        )

    from app.models.repository import Repository
    from app.models.repository_submission import RepositorySubmission

    course_query = await db.execute(select(Course).where(Course.id == assignment.course_id))
    course = course_query.scalars().first()
    repo_name = f"{course.course_code} - {assignment.title}" if course else assignment.title

    repo = Repository(
        instructor_id=course.instructor_id if course else None,
        name=repo_name,
        language=assignment.language,
        source_assignment_id=assignment.id,
        submission_count=len(sub_ids),
    )
    db.add(repo)
    await db.flush()

    for sid in sub_ids:
        repo_sub = RepositorySubmission(
            repository_id=repo.id,
            label=str(sid)[:8],
        )
        db.add(repo_sub)
        await db.flush()

        await db.execute(
            update(StoredFile)
            .where(StoredFile.submission_id == sid)
            .values(repository_submission_id=repo_sub.id)
        )

    await db.flush()


async def finalize_overdue_archives(db: AsyncSession, batch_size: int = 200) -> int:
    """Archive due assignments in bounded batches. Returns count archived in this run."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=ARCHIVE_GRACE_DAYS)
    query = (
        select(Assignment)
        .where(Assignment.status.in_(["Open", "Closed"]))
        .where(Assignment.deadline.is_not(None))
        .where(Assignment.deadline <= cutoff)
        .order_by(Assignment.deadline.asc())
        .limit(batch_size)
        .with_for_update(skip_locked=True)
    )
    assignments = (await db.execute(query)).scalars().all()

    archived_count = 0
    for assignment in assignments:
        if effective_status(assignment, now=now) == "Archived" and assignment.status != "Archived":
            await finalize_archive(db, assignment)
            archived_count += 1

    return archived_count
