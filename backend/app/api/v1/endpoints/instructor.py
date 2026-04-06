from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import io
import zipfile
import logging
import uuid
import secrets

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.instructor import Instructor
from app.models.course import Course
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.boilerplate import Boilerplate
from app.models.comparison_result import ComparisonResult
from app.models.stored_file import StoredFile
from app.services.storage_service import storage_service
from app.services.archival_service import effective_status, finalize_archive
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from sqlalchemy.orm import joinedload, aliased
from app.services.encryption_service import encryption_service

logger = logging.getLogger(__name__)
router = APIRouter()
CANADA_TZ = ZoneInfo("America/Toronto")

LANGUAGE_EXTENSIONS = {"JAVA": ".java", "C": ".c", "CPP": ".cpp"}


# ── private helpers ───────────────────────────────────────────────────────────

def _mask_id(encrypted: Optional[str]) -> str:
    """Decrypt and mask a student ID for display (e.g. ab****cd)."""
    if not encrypted:
        return "REDACTED"
    raw = _safe_decrypt(encrypted, "Unknown")
    return (raw[:2] + "****" + raw[-2:]) if len(raw) > 4 else "****"


def _safe_decrypt(encrypted: Optional[str], fallback: str = "Unknown") -> str:
    if not encrypted:
        return fallback
    try:
        return encryption_service.decrypt(encrypted) or fallback
    except Exception:
        logger.warning("Failed to decrypt value; returning fallback")
        return fallback


def _decrypt_id(submission) -> str:
    """Return raw student ID for folder naming, falling back to UUID prefix."""
    if submission.student_id_encrypted:
        try:
            return encryption_service.decrypt(submission.student_id_encrypted)
        except Exception:
            return str(submission.id)[:8]
    return str(submission.id)[:8]


def _safe_name(s: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in s)


def _repo_alias(repo_submission) -> str:
    """Stable, non-reversible alias for repository comparison identities."""
    if not repo_submission:
        return "REPO-UNKNOWN"
    compact = str(repo_submission.id).replace("-", "")
    return f"REPO-{compact[:8].upper()}"


def _repo_display(meta: dict, repo_submission) -> str:
    repo_name = meta.get("repo_name", "Repository")
    return f"[{repo_name}] {_repo_alias(repo_submission)}"


def _build_range_lookup(items: list) -> tuple[dict, dict]:
    by_index, by_name = {}, {}
    for item in items:
        ranges = item.get("ranges", [])
        if "file_index" in item:
            try:
                by_index[int(item["file_index"])] = ranges
            except (TypeError, ValueError):
                pass
        if fname := item.get("filename"):
            by_name[fname] = ranges
    return by_index, by_name


def _files_to_output(files, by_index: dict, by_name: dict) -> list:
    out = []
    for i, f in enumerate(files):
        fname = f.storage_path.rsplit("/", 1)[-1] if "/" in f.storage_path else f.storage_path
        try:
            code = storage_service.download_file(f.storage_path).decode("utf-8")
        except Exception as e:
            code = f"Error downloading file: {str(e)}"
        out.append({"file_index": i, "filename": fname, "code": code, "ranges": by_index.get(i, by_name.get(fname, []))})
    return out


# ── endpoints ────────────────────────────────────────────────────────────────

@router.get("/assignments", response_model=List[dict])
async def get_instructor_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
) -> Any:
    rows = (await db.execute(
        select(Assignment, Course)
        .join(Course, Assignment.course_id == Course.id)
        .where(Course.instructor_id == current_user.id)
        .order_by(Assignment.created_at.desc())
    )).all()

    response_data = []
    needs_commit = False
    for assignment, course in rows:
        eff = effective_status(assignment)
        if eff == "Archived" and assignment.status != "Archived":
            await finalize_archive(db, assignment)
            needs_commit = True

        sub_count = await db.scalar(select(func.count(Submission.id)).where(Submission.assignment_id == assignment.id))
        flag_count = await db.scalar(select(func.count(Submission.id)).where(
            Submission.assignment_id == assignment.id, Submission.is_flagged == True
        ))
        response_data.append({
            "id": str(assignment.id),
            "title": assignment.title,
            "course": course.course_code,
            "status": eff,
            "count": sub_count or 0,
            "flags": flag_count or 0,
            "access_key": assignment.access_key,
            "language": assignment.language,
            "deadline": assignment.deadline
        })

    if needs_commit:
        await db.commit()
    return response_data


@router.post("/assignments", response_model=dict)
async def create_assignment(
    course_code: str = Form(...),
    title: str = Form(...),
    language: str = Form("JAVA"),
    deadline: str = Form(...),
    boilerplate_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
) -> Any:
    if not course_code or not title or not deadline:
        raise HTTPException(status_code=400, detail="course_code, title, and deadline are required")

    course = (await db.execute(
        select(Course).where(Course.course_code == course_code, Course.instructor_id == current_user.id)
    )).scalars().first()
    if not course:
        course = Course(course_code=course_code, term="Current", instructor_id=current_user.id)
        db.add(course)
        await db.flush()

    try:
        parsed_deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid deadline format")
    if parsed_deadline.tzinfo is None:
        parsed_deadline = parsed_deadline.replace(tzinfo=CANADA_TZ)

    new_assignment = Assignment(
        course_id=course.id,
        title=title,
        access_key=f"{course_code.replace(' ', '').lower()}-{secrets.token_hex(4)}",
        language=language.upper(),
        deadline=parsed_deadline.astimezone(timezone.utc)
    )
    db.add(new_assignment)
    await db.flush()

    if boilerplate_file and boilerplate_file.filename:
        file_bytes = await boilerplate_file.read()
        if file_bytes:
            object_name = f"boilerplate/{new_assignment.id}/{boilerplate_file.filename}"
            storage_service.upload_file(object_name, file_bytes, content_type="text/plain")
            db.add(Boilerplate(
                assignment_id=new_assignment.id,
                storage_path=object_name,
                content=file_bytes.decode("utf-8", errors="replace")
            ))

    await db.commit()
    await db.refresh(new_assignment)
    return {
        "id": str(new_assignment.id),
        "title": new_assignment.title,
        "course": course.course_code,
        "status": new_assignment.status,
        "count": 0,
        "flags": 0,
        "access_key": new_assignment.access_key
    }


@router.patch("/assignments/{assignment_id}", response_model=dict)
async def update_assignment(
    assignment_id: uuid.UUID,
    title: Optional[str] = Form(None),
    course_code: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    deadline: Optional[str] = Form(None),
    boilerplate_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
) -> Any:
    row = (await db.execute(
        select(Assignment, Course)
        .join(Course, Assignment.course_id == Course.id)
        .where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment, course = row

    if title is not None:
        assignment.title = title
    if language is not None:
        assignment.language = language.upper()
    if deadline is not None:
        try:
            parsed_deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid deadline format")
        if parsed_deadline.tzinfo is None:
            parsed_deadline = parsed_deadline.replace(tzinfo=CANADA_TZ)
        assignment.deadline = parsed_deadline.astimezone(timezone.utc)
    if course_code is not None and course_code != course.course_code:
        new_course = (await db.execute(
            select(Course).where(Course.course_code == course_code, Course.instructor_id == current_user.id)
        )).scalars().first()
        if not new_course:
            new_course = Course(course_code=course_code, term="Current", instructor_id=current_user.id)
            db.add(new_course)
            await db.flush()
        assignment.course_id = new_course.id
        course = new_course

    if boilerplate_file and boilerplate_file.filename:
        file_bytes = await boilerplate_file.read()
        if file_bytes:
            existing_bps = (await db.execute(select(Boilerplate).where(Boilerplate.assignment_id == assignment_id))).scalars().all()
            for old_bp in existing_bps:
                try:
                    storage_service.delete_file(old_bp.storage_path)
                except Exception:
                    pass
                await db.delete(old_bp)
            object_name = f"boilerplate/{assignment.id}/{boilerplate_file.filename}"
            storage_service.upload_file(object_name, file_bytes, content_type="text/plain")
            db.add(Boilerplate(assignment_id=assignment.id, storage_path=object_name, content=file_bytes.decode("utf-8", errors="replace")))

    await db.commit()
    await db.refresh(assignment)
    return {
        "id": str(assignment.id),
        "title": assignment.title,
        "course": course.course_code,
        "status": effective_status(assignment),
        "count": 0,
        "flags": 0,
        "access_key": assignment.access_key,
        "language": assignment.language,
        "deadline": assignment.deadline
    }


@router.get("/assignments/{assignment_id}")
async def get_assignment(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    row = (await db.execute(
        select(Assignment, Course).join(Course, Assignment.course_id == Course.id)
        .where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment, course = row
    eff = effective_status(assignment)
    if eff == "Archived" and assignment.status != "Archived":
        await finalize_archive(db, assignment)
        await db.commit()
    return {
        "id": str(assignment.id),
        "title": assignment.title,
        "course": course.course_code,
        "status": eff,
        "access_key": assignment.access_key,
        "deadline": assignment.deadline,
        "language": assignment.language
    }


@router.post("/assignments/{assignment_id}/archive")
async def archive_assignment(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    row = (await db.execute(
        select(Assignment, Course)
        .join(Course, Assignment.course_id == Course.id)
        .where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment, _ = row
    if assignment.status == "Archived":
        return {"message": "Assignment is already archived", "status": "Archived"}
    await finalize_archive(db, assignment)
    await db.commit()
    return {"message": "Assignment archived successfully. Student identities have been permanently removed.", "status": "Archived"}


@router.get("/assignments/{assignment_id}/submissions")
async def get_assignment_submissions(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    if not (await db.execute(
        select(Assignment).join(Course).where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    )).scalars().first():
        raise HTTPException(status_code=404, detail="Assignment not found")

    submissions = (await db.execute(
        select(Submission).options(joinedload(Submission.stored_files))
        .where(Submission.assignment_id == assignment_id)
        .order_by(Submission.timestamp.desc())
    )).scalars().unique().all()

    return [
        {
            "id": str(sub.id),
            "masked_student_id": _mask_id(sub.student_id_encrypted),
            "timestamp": sub.timestamp.isoformat() if sub.timestamp else None,
            "attempt_number": sub.attempt_number or 1,
            "status": sub.status or "Active",
            "is_flagged": sub.is_flagged or False,
            "file_count": len(sub.stored_files) if sub.stored_files else 0,
            "total_lines": sum(f.line_count for f in sub.stored_files) if sub.stored_files else 0,
            "total_bytes": sum(f.byte_size for f in sub.stored_files) if sub.stored_files else 0,
        }
        for sub in submissions
    ]


@router.get("/assignments/{assignment_id}/comparisons")
async def get_comparisons(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    if not (await db.execute(
        select(Assignment).join(Course).where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    )).scalars().first():
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Use a targeted column select instead of full ORM hydration + joinedload.
    # This avoids loading match_metadata (large JSONB) and 3 sets of related ORM objects
    # for every row — critical at 200+ submissions where there can be 20 000+ pairs.
    TargetSub = aliased(Submission)

    rows = (await db.execute(
        select(
            ComparisonResult.id,
            ComparisonResult.target_submission_id,
            ComparisonResult.target_repo_submission_id,
            ComparisonResult.similarity_score,
            ComparisonResult.comparison_type,
            Submission.student_id_encrypted.label("src_encrypted"),
            TargetSub.student_id_encrypted.label("tgt_encrypted"),
            # Extract only repo_name from JSONB at the DB level — avoids transferring
            # the entire match_metadata payload across the wire for every row.
            ComparisonResult.match_metadata["repo_name"].as_string().label("repo_name"),
        )
        .select_from(ComparisonResult)
        .join(Submission, ComparisonResult.source_submission_id == Submission.id)
        .outerjoin(TargetSub, ComparisonResult.target_submission_id == TargetSub.id)
        .where(Submission.assignment_id == assignment_id)
        .order_by(ComparisonResult.similarity_score.desc())
    )).all()

    response_data = []
    for row in rows:
        src_id = _safe_decrypt(row.src_encrypted, "Unknown")
        src_display = (src_id[:2] + "****" + src_id[-2:]) if len(src_id) > 4 else "Student_A"
        comp_type = row.comparison_type or "internal"

        if comp_type == "cross_repo" and row.target_repo_submission_id:
            repo_name = row.repo_name or "Repository"
            compact = str(row.target_repo_submission_id).replace("-", "")
            tgt_display = f"[{repo_name}] REPO-{compact[:8].upper()}"
        else:
            tgt_id = _safe_decrypt(row.tgt_encrypted, "Unknown")
            tgt_display = (tgt_id[:2] + "****" + tgt_id[-2:]) if len(tgt_id) > 4 else "Student_B"

        response_data.append({
            "id": str(row.id),
            "source_student": src_display,
            "target_student": tgt_display,
            "source_student_name": "",
            "target_student_name": "",
            "score": float(row.similarity_score),
            "comparison_type": comp_type,
            "status": "High Risk" if row.similarity_score > 80 else "Review" if row.similarity_score > 60 else "Normal"
        })
    return response_data


@router.get("/comparisons/{comparison_id}")
async def get_comparison_detail(
    comparison_id: uuid.UUID,
    reveal: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    from app.models.repository_submission import RepositorySubmission

    comparison = (await db.execute(
        select(ComparisonResult)
        .options(
            joinedload(ComparisonResult.source_submission),
            joinedload(ComparisonResult.target_submission),
            joinedload(ComparisonResult.target_repo_submission)
        )
        .where(ComparisonResult.id == comparison_id)
    )).scalars().first()
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")

    if not (await db.execute(
        select(Assignment).join(Course).where(
            Assignment.id == comparison.source_submission.assignment_id,
            Course.instructor_id == current_user.id
        )
    )).scalars().first():
        raise HTTPException(status_code=403, detail="Unauthorized")

    comp_type = comparison.comparison_type or "internal"
    meta = comparison.match_metadata or {}

    raw_source = _safe_decrypt(comparison.source_submission.student_id_encrypted, "Unknown Source")
    source_masked = (raw_source[:2] + "****" + raw_source[-2:]) if len(raw_source) > 4 else "****"
    source_identity = raw_source if reveal else source_masked
    source_name_raw = _safe_decrypt(comparison.source_submission.student_name_encrypted, "")
    source_name = source_name_raw if reveal else ""

    s_files = (await db.execute(select(StoredFile).where(StoredFile.submission_id == comparison.source_submission.id).order_by(StoredFile.storage_path))).scalars().all()
    source_files_out = _files_to_output(s_files, *_build_range_lookup(meta.get("source_files", [])))

    tgt_by = _build_range_lookup(meta.get("target_files", []))
    response_meta = dict(meta)
    if comp_type == "cross_repo" and comparison.target_repo_submission_id:
        raw_target = _repo_display(meta, comparison.target_repo_submission)
        target_identity = raw_target
        response_meta["repo_label"] = _repo_alias(comparison.target_repo_submission)
        target_name = ""
        t_files = (await db.execute(select(StoredFile).where(StoredFile.repository_submission_id == comparison.target_repo_submission_id).order_by(StoredFile.storage_path))).scalars().all()
    else:
        raw_target = _safe_decrypt(comparison.target_submission.student_id_encrypted if comparison.target_submission else None, "Unknown Target")
        target_masked = (raw_target[:2] + "****" + raw_target[-2:]) if len(raw_target) > 4 else "****"
        target_identity = raw_target if reveal else target_masked
        target_name_raw = _safe_decrypt(comparison.target_submission.student_name_encrypted if comparison.target_submission else None, "")
        target_name = target_name_raw if reveal else ""
        t_files = (await db.execute(select(StoredFile).where(StoredFile.submission_id == comparison.target_submission.id).order_by(StoredFile.storage_path))).scalars().all()
    target_files_out = _files_to_output(t_files, *tgt_by)

    return {
        "id": str(comparison.id),
        "score": float(comparison.similarity_score),
        "comparison_type": comp_type,
        "source_submission_id": str(comparison.source_submission_id),
        "target_submission_id": str(comparison.target_submission_id) if comparison.target_submission_id else None,
        "target_repo_submission_id": str(comparison.target_repo_submission_id) if comparison.target_repo_submission_id else None,
        "source_student_decrypted": source_identity,
        "target_student_decrypted": target_identity,
        "source_student_name": source_name,
        "target_student_name": target_name,
        "source_code": source_files_out[0]["code"] if source_files_out else "No Source File Found",
        "target_code": target_files_out[0]["code"] if target_files_out else "No Target File Found",
        "source_files": source_files_out,
        "target_files": target_files_out,
        "metadata": response_meta
    }


@router.get("/submissions/{submission_id}/download")
async def download_single_submission(
    submission_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    submission = (await db.execute(
        select(Submission).options(joinedload(Submission.stored_files)).where(Submission.id == submission_id)
    )).scalars().unique().first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    assignment = (await db.execute(
        select(Assignment).join(Course).where(Assignment.id == submission.assignment_id, Course.instructor_id == current_user.id)
    )).scalars().first()
    if not assignment:
        raise HTTPException(status_code=403, detail="Unauthorized")
    if not submission.stored_files:
        raise HTTPException(status_code=404, detail="No files found for this submission")

    ext = LANGUAGE_EXTENSIONS.get(assignment.language, ".txt")
    folder_name = _safe_name(_decrypt_id(submission))

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, sf in enumerate(submission.stored_files, start=1):
            try:
                file_bytes = storage_service.download_file(sf.storage_path)
                filename = f"file_{idx}{ext}" if len(submission.stored_files) > 1 else f"{folder_name}{ext}"
                zf.writestr(f"{folder_name}/{filename}", file_bytes)
            except Exception as e:
                logger.warning(f"Failed to download file {sf.storage_path}: {e}")

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{folder_name}_submission.zip"'}
    )


@router.get("/assignments/{assignment_id}/download")
async def download_submissions(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    row = (await db.execute(
        select(Assignment, Course).join(Course, Assignment.course_id == Course.id)
        .where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment, course = row
    ext = LANGUAGE_EXTENSIONS.get(assignment.language, ".txt")

    submissions = (await db.execute(
        select(Submission).options(joinedload(Submission.stored_files))
        .where(Submission.assignment_id == assignment_id, Submission.status == "Active")
    )).scalars().unique().all()
    if not submissions:
        raise HTTPException(status_code=404, detail="No active submissions found for this assignment")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for submission in submissions:
            safe_student_id = _safe_name(_decrypt_id(submission))
            inner_zip_buffer = io.BytesIO()
            with zipfile.ZipFile(inner_zip_buffer, "w", zipfile.ZIP_DEFLATED) as inner_zf:
                files_added = False
                for idx, sf in enumerate(submission.stored_files, start=1):
                    try:
                        file_bytes = storage_service.download_file(sf.storage_path)
                        filename = f"file_{idx}{ext}" if len(submission.stored_files) > 1 else f"{safe_student_id}{ext}"
                        inner_zf.writestr(filename, file_bytes)
                        files_added = True
                    except Exception as e:
                        logger.warning(f"Failed to download file {sf.storage_path}: {e}")
            if files_added:
                inner_zip_buffer.seek(0)
                zf.writestr(f"{safe_student_id}.zip", inner_zip_buffer.read())

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{course.course_code}_{_safe_name(assignment.title)}_submissions.zip"'}
    )
