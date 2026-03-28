import uuid
import io
import os
import zipfile
import logging
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
from app.models.stored_file import StoredFile
from app.services.storage_service import storage_service
from app.services.analysis_service import analysis_service

router = APIRouter()
logger = logging.getLogger(__name__)

LANGUAGE_EXTENSIONS = {".java": "JAVA", ".c": "C", ".cpp": "CPP", ".h": "C"}


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

    repo = Repository(
        instructor_id=current_user.id,
        name=name,
        language=lang,
        submission_count=0
    )
    db.add(repo)
    await db.flush()

    submission_count = 0

    for entry_name in outer_zip.namelist():
        # Only process inner .zip files at the top level
        if not entry_name.lower().endswith('.zip') or '/' in entry_name.rstrip('/'):
            continue

        label = os.path.splitext(os.path.basename(entry_name))[0]
        inner_bytes = outer_zip.read(entry_name)

        try:
            inner_zip = zipfile.ZipFile(io.BytesIO(inner_bytes))
        except zipfile.BadZipFile:
            logger.warning("Skipping invalid inner zip: %s", entry_name)
            continue

        repo_sub = RepositorySubmission(
            repository_id=repo.id,
            label=label
        )
        db.add(repo_sub)
        await db.flush()

        files_added = 0
        for inner_file_name in inner_zip.namelist():
            if inner_file_name.endswith('/'):
                continue  # Skip directories

            # Read file content
            try:
                content_bytes = inner_zip.read(inner_file_name)
            except Exception:
                continue

            if not content_bytes:
                continue

            basename = os.path.basename(inner_file_name)
            code_str = content_bytes.decode('utf-8', errors='replace')
            line_count = code_str.count('\n') + 1

            # Fingerprint the file
            fp = analysis_service.strip_and_fingerprint(code_str, lang)

            # Upload to MinIO
            import hashlib
            file_hash = hashlib.sha256(content_bytes).hexdigest()
            storage_path = f"repositories/{repo.id}/{repo_sub.id}/{basename}"
            storage_service.upload_file(storage_path, content_bytes, content_type="text/plain")

            stored = StoredFile(
                repository_submission_id=repo_sub.id,
                storage_path=storage_path,
                file_hash=file_hash,
                byte_size=len(content_bytes),
                line_count=line_count,
                fingerprint_hash=[dict(fp_item) for fp_item in fp]
            )
            db.add(stored)
            files_added += 1

        if files_added > 0:
            submission_count += 1
        else:
            await db.delete(repo_sub)

    repo.submission_count = submission_count
    await db.commit()

    return {
        "id": str(repo.id),
        "name": repo.name,
        "language": repo.language,
        "submission_count": submission_count,
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
