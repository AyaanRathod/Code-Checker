import uuid
import io
import os
import zipfile
import logging
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models.instructor import Instructor
from app.models.repository import Repository
from app.models.repository_submission import RepositorySubmission
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.submission import Submission
from app.models.stored_file import StoredFile
from app.services.storage_service import storage_service
from app.services.analysis_service import analysis_service
from app.services.sanitization_service import sanitization_service
from app.services.encryption_service import encryption_service

router = APIRouter()
logger = logging.getLogger(__name__)

LANGUAGE_EXTENSIONS = {
    "JAVA": {".java"},
    "C": {".c", ".h"},
    "CPP": {".cpp", ".cc", ".cxx", ".h", ".hpp"},
}


def _anonymize_submission_label(repo_id: uuid.UUID, label: str) -> str:
    """Create a stable non-reversible alias for imported repository submissions."""
    digest = hashlib.sha256(f"{repo_id}:{label}".encode("utf-8")).hexdigest()
    return f"REPO-{digest[:10].upper()}"


@router.get("/")
async def list_repositories(
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    """List all repositories belonging to the current instructor."""
    query = (
        select(Repository)
        .where(Repository.instructor_id == current_user.id)
        .order_by(Repository.created_at.desc())
    )
    result = await db.execute(query)
    repos = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "name": r.name,
            "language": r.language,
            "source_assignment_id": str(r.source_assignment_id) if r.source_assignment_id else None,
            "submission_count": r.submission_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in repos
    ]


@router.post("/upload")
async def upload_repository(
    name: str = Form(...),
    language: str = Form("JAVA"),
    import_to_assignment: bool = Form(False),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    """Upload a .zip of .zips to create a new repository.
    The outer zip is the repo. Each inner zip is a submission (folder name = label).
    Each file inside the inner zip becomes a StoredFile."""

    if not file.filename or not file.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a .zip archive")

    file_bytes = await file.read()
    try:
        outer_zip = zipfile.ZipFile(io.BytesIO(file_bytes))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file")

    lang = language.upper()
    allowed_exts = LANGUAGE_EXTENSIONS.get(lang)
    if not allowed_exts:
        raise HTTPException(status_code=400, detail="Unsupported language. Use JAVA, C, or CPP")

    assignment = None
    if import_to_assignment:
        course = (await db.execute(
            select(Course).where(
                Course.instructor_id == current_user.id,
                Course.course_code == "REPO_IMPORT",
                Course.term == "Current"
            )
        )).scalars().first()

        if not course:
            course = Course(
                course_code="REPO_IMPORT",
                term="Current",
                instructor_id=current_user.id,
            )
            db.add(course)
            await db.flush()

        assignment = Assignment(
            course_id=course.id,
            title=f"[Repo Import] {name}",
            access_key=f"repoimp-{secrets.token_hex(4)}",
            language=lang,
            deadline=datetime.now(timezone.utc) + timedelta(days=30),
            status="Open",
        )
        db.add(assignment)
        await db.flush()

    repo = Repository(
        instructor_id=current_user.id,
        name=name,
        language=lang,
        submission_count=0
    )
    db.add(repo)
    await db.flush()

    submission_count = 0
    uploaded_objects: List[str] = []

    try:
        for entry_name in outer_zip.namelist():
            if entry_name.endswith('/') or not entry_name.lower().endswith('.zip'):
                continue

            try:
                inner_bytes = outer_zip.read(entry_name)
            except Exception:
                logger.warning("Skipping unreadable inner zip entry: %s", entry_name)
                continue

            try:
                inner_zip = zipfile.ZipFile(io.BytesIO(inner_bytes))
            except zipfile.BadZipFile:
                logger.warning("Skipping invalid inner zip: %s", entry_name)
                continue

            label = os.path.splitext(os.path.basename(entry_name))[0]
            anonymized_label = _anonymize_submission_label(repo.id, label)
            repo_sub = RepositorySubmission(
                repository_id=repo.id,
                label=anonymized_label
            )
            db.add(repo_sub)
            await db.flush()

            submission = None
            if assignment:
                # Active submissions should behave like normal assignment submissions,
                # so preserve the original inner-zip label for reveal flows.
                active_identity = label.strip() or anonymized_label
                submission = Submission(
                    assignment_id=assignment.id,
                    student_name_encrypted=None,
                    student_id_encrypted=encryption_service.encrypt(active_identity),
                    timestamp=datetime.now(timezone.utc),
                    status="Active",
                    attempt_number=1,
                )
                db.add(submission)
                await db.flush()

            files_added = 0
            for inner_file_name in inner_zip.namelist():
                if inner_file_name.endswith('/'):
                    continue

                ext = os.path.splitext(inner_file_name)[1].lower()
                if ext not in allowed_exts:
                    continue

                try:
                    content_bytes = inner_zip.read(inner_file_name)
                except Exception:
                    continue

                if not content_bytes:
                    continue

                code_str = content_bytes.decode('utf-8', errors='ignore')
                sanitized_code = sanitization_service.strip_comments(code_str, lang)
                sanitized_bytes = sanitized_code.encode('utf-8')
                if not sanitized_bytes.strip():
                    continue

                line_count = len(sanitized_code.splitlines())
                fp = analysis_service.strip_and_fingerprint(sanitized_code, lang)

                normalized_path = inner_file_name.replace('\\', '/').lstrip('/')
                safe_name = normalized_path.replace('/', '__')
                file_hash = hashlib.sha256(sanitized_bytes).hexdigest()
                storage_name = f"{safe_name}__{file_hash[:8]}"
                storage_path = f"repositories/{repo.id}/{repo_sub.id}/{storage_name}"
                storage_service.upload_file(storage_path, sanitized_bytes, content_type="text/plain")
                uploaded_objects.append(storage_path)

                stored = StoredFile(
                    submission_id=submission.id if submission else None,
                    repository_submission_id=repo_sub.id,
                    storage_path=storage_path,
                    file_hash=file_hash,
                    byte_size=len(sanitized_bytes),
                    line_count=line_count,
                    fingerprint_hash=[dict(fp_item) for fp_item in fp]
                )
                db.add(stored)
                files_added += 1

            if files_added > 0:
                submission_count += 1
            else:
                if submission:
                    await db.delete(submission)
                await db.delete(repo_sub)

        if submission_count == 0:
            if assignment:
                await db.delete(assignment)
            await db.delete(repo)
            await db.commit()
            raise HTTPException(
                status_code=400,
                detail=f"No valid {lang} source files were found in inner zip submissions"
            )

        repo.submission_count = submission_count
        await db.commit()
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        for object_name in uploaded_objects:
            try:
                storage_service.delete_file(object_name)
            except Exception:
                logger.warning("Failed to rollback MinIO object: %s", object_name)
        raise HTTPException(status_code=500, detail="Repository upload failed during processing")

    return {
        "id": str(repo.id),
        "name": repo.name,
        "language": repo.language,
        "submission_count": submission_count,
        "imported_to_assignment_id": str(assignment.id) if assignment else None,
        "imported_to_assignment_title": assignment.title if assignment else None,
        "message": f"Repository created with {submission_count} submissions"
    }


@router.delete("/{repository_id}")
async def delete_repository(
    repository_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user)
):
    """Delete a repository and all its stored files from MinIO."""
    repo = (await db.execute(
        select(Repository).where(Repository.id == repository_id, Repository.instructor_id == current_user.id)
    )).scalars().first()

    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Get all stored files to clean up MinIO
    repo_subs = (await db.execute(
        select(RepositorySubmission).where(RepositorySubmission.repository_id == repository_id)
    )).scalars().all()

    for rs in repo_subs:
        files = (await db.execute(
            select(StoredFile).where(StoredFile.repository_submission_id == rs.id)
        )).scalars().all()
        for f in files:
            try:
                storage_service.delete_file(f.storage_path)
            except Exception:
                logger.warning("Failed to delete MinIO object: %s", f.storage_path)

    await db.delete(repo)
    await db.commit()

    return {"message": "Repository deleted successfully"}
