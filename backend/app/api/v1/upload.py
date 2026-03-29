# This file defines an API endpoint for uploading source code
# files (.java, .cpp, .zip) to MinIO object storage.

# It uses the ObjectStorage class created earlier.

# FLOW
# 1. Receive file from client
# 2. Validate file type
# 3. Save temporarily on local disk
# 4. Upload to MinIO
# 5. Delete local temp file
# 6. Return object name (storage key)
# ------------------------------------------------------------

from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import uuid

# Import storage helper
from app.core.object_storage import ObjectStorage

# Create router instance
router = APIRouter()

# Create storage object
storage = ObjectStorage()


@router.post("/upload")
async def upload_source_file(file: UploadFile = File(...)):
    """
    Upload a source code file to object storage.

    Accepts:
    - .java
    - .cpp
    - .zip

    Returns:
    - object_name (used to retrieve file later)
    """

    # Step 1: Validate file type
    if not storage.is_allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Only .java, .cpp, and .zip files are allowed"
        )

    try:
        # Step 2: Create temporary folder if not exists
        temp_folder = "temp_uploads"
        os.makedirs(temp_folder, exist_ok=True)

        # Step 3: Save file temporarily to disk
        temp_file_path = os.path.join(temp_folder, file.filename)

        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(await file.read())

        # Step 4: Generate unique object name
        # (prevents overwriting files with same name)
        object_name = f"{uuid.uuid4()}_{file.filename}"

        # Step 5: Upload file to MinIO
        storage.upload_file(temp_file_path, object_name)

        # Step 6: Delete temporary file
        os.remove(temp_file_path)

        # Step 7: Return success response
        return {
            "message": "File uploaded successfully",
            "object_name": object_name
        }

    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )