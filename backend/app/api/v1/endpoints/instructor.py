from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import io
import zipfile
import logging

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.instructor import Instructor
from app.models.course import Course
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.comparison_result import ComparisonResult
from app.models.stored_file import StoredFile
from app.models.boilerplate import Boilerplate
from app.services.storage_service import storage_service
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from sqlalchemy.orm import joinedload
from app.services.encryption_service import encryption_service
import uuid
import secrets

logger = logging.getLogger(__name__)

router = APIRouter()
CANADA_TZ = ZoneInfo("America/Toronto")


def effective_status(assignment: Assignment) -> str:
    """Return the display status: 'Closed' if deadline has passed and status is 'Open', otherwise the stored status."""
    if assignment.status == "Open" and assignment.deadline:
        if assignment.deadline < datetime.now(timezone.utc):
            return "Closed"
    return assignment.status

@router.get("/assignments", response_model=List[dict])
async def get_instructor_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
) -> Any:
    """Retrieve all assignments belonging to the current instructor with submission counts."""
    # We join assignments -> courses -> instructors
    query = (
        select(Assignment, Course)
        .join(Course, Assignment.course_id == Course.id)
        .where(Course.instructor_id == current_user.id)
        .order_by(Assignment.created_at.desc())
    )
    result = await db.execute(query)
    rows = result.all()
    
    response_data = []
    
    for assignment, course in rows:
        # Count submissions
        sub_query = select(func.count(Submission.id)).where(Submission.assignment_id == assignment.id)
        sub_count = await db.scalar(sub_query)
        
        # Count flagged
        flag_query = select(func.count(Submission.id)).where(
            Submission.assignment_id == assignment.id, 
            Submission.is_flagged == True
        )
        flag_count = await db.scalar(flag_query)

        response_data.append({
            "id": str(assignment.id),
            "title": assignment.title,
            "course": course.course_code,
            "status": effective_status(assignment),
            "count": sub_count or 0,
            "flags": flag_count or 0,
            "access_key": assignment.access_key,
            "language": assignment.language,
            "deadline": assignment.deadline
        })
        
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
    """Create a new assignment for a course. Autogenerates Course if missing.
    Optionally accepts a boilerplate file whose code will be excluded from similarity analysis."""

    if not course_code or not title or not deadline:
        raise HTTPException(status_code=400, detail="course_code, title, and deadline are required")

    # Find or create course for this instructor
    course_query = select(Course).where(Course.course_code == course_code, Course.instructor_id == current_user.id)
    course_result = await db.execute(course_query)
    course = course_result.scalars().first()

    if not course:
        course = Course(course_code=course_code, term="Current", instructor_id=current_user.id)
        db.add(course)
        await db.flush()

    # Generate unique access key
    access_key = f"{course_code.replace(' ', '').lower()}-{secrets.token_hex(4)}"

    try:
        parsed_deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid deadline format")

    if parsed_deadline.tzinfo is None:
        # Treat datetime-local input as Canada time.
        parsed_deadline = parsed_deadline.replace(tzinfo=CANADA_TZ)

    deadline_utc = parsed_deadline.astimezone(timezone.utc)

    new_assignment = Assignment(
        course_id=course.id,
        title=title,
        access_key=access_key,
        language=language.upper(),
        deadline=deadline_utc
    )
    db.add(new_assignment)
    await db.flush()

    # Handle optional boilerplate file upload
    if boilerplate_file and boilerplate_file.filename:
        file_bytes = await boilerplate_file.read()
        if file_bytes:
            object_name = f"boilerplate/{new_assignment.id}/{boilerplate_file.filename}"
            storage_service.upload_file(object_name, file_bytes, content_type="text/plain")
            content_str = file_bytes.decode("utf-8", errors="replace")
            bp = Boilerplate(
                assignment_id=new_assignment.id,
                storage_path=object_name,
                content=content_str
            )
            db.add(bp)

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
    """Update an existing assignment. Only provided fields are changed. Submissions are not affected."""
    # Verify ownership
    a_query = (
        select(Assignment, Course)
        .join(Course, Assignment.course_id == Course.id)
        .where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    )
    a_result = await db.execute(a_query)
    row = a_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment, course = row

    # Update fields that were provided
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
        # Find or create the new course
        new_course_query = select(Course).where(Course.course_code == course_code, Course.instructor_id == current_user.id)
        new_course_result = await db.execute(new_course_query)
        new_course = new_course_result.scalars().first()
        if not new_course:
            new_course = Course(course_code=course_code, term="Current", instructor_id=current_user.id)
            db.add(new_course)
            await db.flush()
        assignment.course_id = new_course.id
        course = new_course

    # Handle optional boilerplate file replacement
    if boilerplate_file and boilerplate_file.filename:
        file_bytes = await boilerplate_file.read()
        if file_bytes:
            # Delete existing boilerplate records for this assignment
            existing_bp_query = select(Boilerplate).where(Boilerplate.assignment_id == assignment_id)
            existing_bps = (await db.execute(existing_bp_query)).scalars().all()
            for old_bp in existing_bps:
                try:
                    storage_service.delete_file(old_bp.storage_path)
                except Exception:
                    pass
                await db.delete(old_bp)

            object_name = f"boilerplate/{assignment.id}/{boilerplate_file.filename}"
            storage_service.upload_file(object_name, file_bytes, content_type="text/plain")
            content_str = file_bytes.decode("utf-8", errors="replace")
            bp = Boilerplate(
                assignment_id=assignment.id,
                storage_path=object_name,
                content=content_str
            )
            db.add(bp)

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
    query = select(Assignment, Course).join(Course, Assignment.course_id == Course.id).where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    assignment, course = row
    return {
        "id": str(assignment.id),
        "title": assignment.title,
        "course": course.course_code,
        "status": effective_status(assignment),
        "access_key": assignment.access_key,
        "deadline": assignment.deadline,
        "language": assignment.language
    }

@router.get("/assignments/{assignment_id}/comparisons")
async def get_comparisons(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    # Verify ownership
    a_query = select(Assignment).join(Course).where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    a_result = await db.execute(a_query)
    if not a_result.scalars().first():
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    # Get all comparisons
    query = (
        select(ComparisonResult)
        .options(joinedload(ComparisonResult.source_submission), joinedload(ComparisonResult.target_submission))
        .join(Submission, ComparisonResult.source_submission_id == Submission.id)
        .where(Submission.assignment_id == assignment_id)
        .order_by(ComparisonResult.similarity_score.desc())
    )
    result = await db.execute(query)
    comparisons = result.scalars().all()
    
    response_data = []
    for c in comparisons:
        # Decrypt IDs for display, handle None safely
        src_id = encryption_service.decrypt(c.source_submission.student_id_encrypted) if c.source_submission.student_id_encrypted else "Unknown"
        tgt_id = encryption_service.decrypt(c.target_submission.student_id_encrypted) if c.target_submission.student_id_encrypted else "Unknown"
        
        # Mask IDs minimally (e.g. keep first and last 2 digits, mask middle)
        if len(src_id) > 4:
            src_display = src_id[:2] + "****" + src_id[-2:]
        else:
            src_display = "Student_A"
            
        if len(tgt_id) > 4:
            tgt_display = tgt_id[:2] + "****" + tgt_id[-2:]
        else:
            tgt_display = "Student_B"
            
        response_data.append({
            "id": str(c.id),
            "source_student": src_display,
            "target_student": tgt_display,
            "raw_source_id": src_id,
            "raw_target_id": tgt_id,
            "score": float(c.similarity_score),
            "status": "High Risk" if c.similarity_score > 80 else "Review" if c.similarity_score > 60 else "Normal"
        })
        
    return response_data
    return response_data

@router.get("/comparisons/{comparison_id}")
async def get_comparison_detail(
    comparison_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    query = (
        select(ComparisonResult)
        .options(joinedload(ComparisonResult.source_submission), joinedload(ComparisonResult.target_submission))
        .where(ComparisonResult.id == comparison_id)
    )
    result = await db.execute(query)
    comparison = result.scalars().first()
    
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")
        
    # Security: Ensure this comparison belongs to this instructor via assignment->course
    from app.models.course import Course
    a_query = select(Assignment).join(Course).where(
        Assignment.id == comparison.source_submission.assignment_id,
        Course.instructor_id == current_user.id
    )
    a_result = await db.execute(a_query)
    if not a_result.scalars().first():
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Decrypt IDs
    raw_source = encryption_service.decrypt(comparison.source_submission.student_id_encrypted) or "Unknown Source"
    raw_target = encryption_service.decrypt(comparison.target_submission.student_id_encrypted) or "Unknown Target"
    
    sf_query = select(StoredFile).where(StoredFile.submission_id == comparison.source_submission.id)
    s_files = (await db.execute(sf_query)).scalars().all()
    
    tf_query = select(StoredFile).where(StoredFile.submission_id == comparison.target_submission.id)
    t_files = (await db.execute(tf_query)).scalars().all()
    
    s_code = "No Source File Found"
    if s_files:
        try:
            s_code = storage_service.download_file(s_files[0].storage_path).decode('utf-8')
        except Exception as e:
            s_code = f"Error downloading source code: {str(e)}"
            
    t_code = "No Target File Found"
    if t_files:
        try:
            t_code = storage_service.download_file(t_files[0].storage_path).decode('utf-8')
        except Exception as e:
            t_code = f"Error downloading target code: {str(e)}"
            
    return {
        "id": str(comparison.id),
        "score": float(comparison.similarity_score),
        "source_submission_id": str(comparison.source_submission_id),
        "target_submission_id": str(comparison.target_submission_id),
        "source_student_decrypted": raw_source,
        "target_student_decrypted": raw_target,
        "source_code": s_code,
        "target_code": t_code,
        "metadata": comparison.match_metadata or {}
    }


LANGUAGE_EXTENSIONS = {
    "JAVA": ".java",
    "C": ".c",
    "CPP": ".cpp",
}


@router.get("/submissions/{submission_id}/download")
async def download_single_submission(
    submission_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    """Download all files for a single submission as a zip."""
    # Fetch submission with stored files
    sub_query = (
        select(Submission)
        .options(joinedload(Submission.stored_files))
        .where(Submission.id == submission_id)
    )
    sub_result = await db.execute(sub_query)
    submission = sub_result.scalars().unique().first()

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Verify instructor owns this assignment via course
    a_query = (
        select(Assignment)
        .join(Course)
        .where(Assignment.id == submission.assignment_id, Course.instructor_id == current_user.id)
    )
    a_result = await db.execute(a_query)
    assignment = a_result.scalars().first()
    if not assignment:
        raise HTTPException(status_code=403, detail="Unauthorized")

    ext = LANGUAGE_EXTENSIONS.get(assignment.language, ".txt")

    # Decrypt student ID for folder/file naming
    student_id = "unknown"
    if submission.student_id_encrypted:
        try:
            student_id = encryption_service.decrypt(submission.student_id_encrypted)
        except Exception:
            student_id = str(submission.id)[:8]

    folder_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in student_id)

    if not submission.stored_files:
        raise HTTPException(status_code=404, detail="No files found for this submission")

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
    zip_filename = f"{folder_name}_submission.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'}
    )


@router.get("/assignments/{assignment_id}/download")
async def download_submissions(
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    """Download all submissions for an assignment as a zip file.
    Structure: {student_id}/file_1.ext, {student_id}/file_2.ext, ...
    """
    # Verify assignment ownership
    a_query = (
        select(Assignment, Course)
        .join(Course, Assignment.course_id == Course.id)
        .where(Assignment.id == assignment_id, Course.instructor_id == current_user.id)
    )
    a_result = await db.execute(a_query)
    row = a_result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment, course = row
    ext = LANGUAGE_EXTENSIONS.get(assignment.language, ".txt")

    # Fetch all active submissions with their stored files
    sub_query = (
        select(Submission)
        .options(joinedload(Submission.stored_files))
        .where(
            Submission.assignment_id == assignment_id,
            Submission.status == "Active"
        )
    )
    sub_result = await db.execute(sub_query)
    submissions = sub_result.scalars().unique().all()

    if not submissions:
        raise HTTPException(status_code=404, detail="No active submissions found for this assignment")

    # Build zip in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for submission in submissions:
            # Decrypt student ID for folder name
            student_id = "unknown"
            if submission.student_id_encrypted:
                try:
                    student_id = encryption_service.decrypt(submission.student_id_encrypted)
                except Exception:
                    student_id = str(submission.id)[:8]

            # Sanitize folder name (remove characters unsafe for paths)
            folder_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in student_id)

            for idx, sf in enumerate(submission.stored_files, start=1):
                try:
                    file_bytes = storage_service.download_file(sf.storage_path)
                    filename = f"file_{idx}{ext}" if len(submission.stored_files) > 1 else f"{folder_name}{ext}"
                    zf.writestr(f"{folder_name}/{filename}", file_bytes)
                except Exception as e:
                    logger.warning(f"Failed to download file {sf.storage_path}: {e}")

    zip_buffer.seek(0)
    safe_title = "".join(c if c.isalnum() or c in "-_ " else "_" for c in assignment.title)
    zip_filename = f"{course.course_code}_{safe_title}_submissions.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'}
    )
