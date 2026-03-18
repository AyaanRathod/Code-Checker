import os
import uuid
import hashlib
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories.assignment_repository import assignment_repository
from app.repositories.submission_repository import submission_repository
from app.repositories.stored_file_repository import stored_file_repository
from app.schemas.submission import SubmissionCreate
from app.schemas.stored_file import StoredFileCreate
from app.services.encryption_service import encryption_service
from app.services.sanitization_service import sanitization_service
from app.services.storage_service import storage_service

router = APIRouter()

@router.post("/submit", status_code=status.HTTP_201_CREATED)
async def submit_assignment(
    access_key: str = Form(...),
    student_name: str = Form(...),
    student_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit an assignment using an access key.
    """
    # 1. Validate Access Key
    assignment = await assignment_repository.get_by_access_key(db, access_key)
    if not assignment:
        raise HTTPException(status_code=404, detail="Invalid access key.")
        
    # 2. Check Deadline
    if datetime.now(timezone.utc) > assignment.deadline:
        raise HTTPException(status_code=400, detail="Assignment deadline has passed.")
        
    # 3. Encrypt Identity
    encrypted_name = encryption_service.encrypt(student_name)
    encrypted_id = encryption_service.encrypt(student_id)
    
    # 4. Check Attempt Counts and Archive previous
    all_assignment_submissions = await submission_repository.get_all_by_assignment(db, assignment.id)
    previous_submissions = []
    
    # 4a. Decrypt and match student IDs locally since Fernet is non-deterministic
    for sub in all_assignment_submissions:
        try:
            if sub.student_id_encrypted:
                decrypted_id = encryption_service.decrypt(sub.student_id_encrypted)
                if decrypted_id == student_id:
                    previous_submissions.append(sub)
        except Exception:
            continue
    
    if len(previous_submissions) >= 3:
        raise HTTPException(status_code=400, detail="Maximum submission limit (3) reached.")
        
    expected_attempt = len(previous_submissions) + 1
    
    # Archive previous ones
    for sub in previous_submissions:
        if sub.status == 'Active':
            sub.status = 'Archived'
            await db.flush() # Will be committed at end

    # 5. Extract and Sanitize Files
    file_content = await file.read()
    extracted_files = sanitization_service.extract_files(file_content, file.filename)
    
    if not extracted_files:
        raise HTTPException(status_code=400, detail="No valid source code files found (.c, .cpp, .java).")

    # 6. Create Submission Record
    sub_data = SubmissionCreate(
        assignment_id=assignment.id,
        student_name_encrypted=encrypted_name,
        student_id_encrypted=encrypted_id
    )
    new_submission = await submission_repository.create(db, sub_data)
    
    # Update attempt number
    new_submission.attempt_number = expected_attempt
    await db.flush()
    
    # 7. Process each file
    for orig_filename, content in extracted_files:
        try:
            content_str = content.decode('utf-8', errors='ignore')
        except Exception:
            # If it's pure binary or really mangled, skip
            continue
            
        sanitized_code = sanitization_service.strip_comments(content_str, assignment.language)
        sanitized_bytes = sanitized_code.encode('utf-8')
        
        # Calculate Hash
        file_hash = hashlib.sha256(sanitized_bytes).hexdigest()
        
        # MinIO Path: assignment_id/submission_id/uuid
        st_object_name = f"{assignment.id}/{new_submission.id}/{uuid.uuid4()}"
        
        # Upload to MinIO
        storage_service.upload_file(st_object_name, sanitized_bytes, content_type="text/plain")
        
        # Create StoredFile Record
        line_count = len(sanitized_code.splitlines())
        stored_file_data = StoredFileCreate(
            submission_id=new_submission.id,
            storage_path=st_object_name,
            file_hash=file_hash,
            byte_size=len(sanitized_bytes),
            line_count=line_count
        )
        await stored_file_repository.create(db, stored_file_data)
        
    return {
        "message": "Submission successful",
        "submission_id": new_submission.id,
        "attempt": expected_attempt,
        "timestamp": new_submission.timestamp
    }
