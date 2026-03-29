# This file handles object storage for source code files.

# It allows the backend to:
# 1. create a MinIO bucket if needed
# 2. upload files
# 3. download files
# 4. delete files
# 5. check if file type is allowed

# ALLOWED FILE TYPES
# - .java
# - .cpp
# - .zip

# NOTE ABOUT HTTPS
# This code can connect to MinIO using either HTTP or HTTPS.
# That depends on the value of MINIO_SECURE.
#
# If MINIO_SECURE=true, MinIO client will try HTTPS.
# If MINIO_SECURE=false, MinIO client will use plain HTTP.

import os
from minio import Minio
from minio.error import S3Error

class ObjectStorage:
    """
    Simple helper class for MinIO object storage.

    This class wraps common storage actions:
    - create bucket
    - upload file
    - download file
    - remove file
    """

    def __init__(self):
        """
        Read storage settings from environment variables
        and create the MinIO client.
        """

        # Example:
        # MINIO_ENDPOINT=minio:9000
        self.endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")

        # Example:
        # MINIO_ACCESS_KEY=minioadmin
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")

        # Example:
        # MINIO_SECRET_KEY=minioadmin
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")

        # Bucket name where files will be stored
        self.bucket_name = os.getenv("MINIO_BUCKET", "source-files")

        # Controls HTTP vs HTTPS
        # "true" -> HTTPS
        # "false" -> HTTP
        secure_value = os.getenv("MINIO_SECURE", "false").lower()
        self.secure = secure_value == "true"

        # Create MinIO client
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )

    def ensure_bucket_exists(self):
        """
        Create the bucket if it does not already exist.
        """
        try:
            bucket_exists = self.client.bucket_exists(self.bucket_name)

            if not bucket_exists:
                self.client.make_bucket(self.bucket_name)
                print(f"Bucket '{self.bucket_name}' created.")
            else:
                print(f"Bucket '{self.bucket_name}' already exists.")

        except S3Error as e:
            print(f"Bucket check/create failed: {e}")
            raise

    def is_allowed_file(self, filename: str) -> bool:
        """
        Check if the file extension is allowed.

        Allowed:
        - .java
        - .cpp
        - .zip
        """
        if not filename:
            return False

        lower_name = filename.lower()

        return (
            lower_name.endswith(".java")
            or lower_name.endswith(".cpp")
            or lower_name.endswith(".zip")
        )

    def upload_file(self, local_file_path: str, object_name: str):
        """
        Upload a local file into object storage.

        Parameters:
        - local_file_path: path of file on local disk
        - object_name: name/key to use inside MinIO

        Returns:
        - object_name if upload succeeds
        """
        try:
            # Make sure bucket exists first
            self.ensure_bucket_exists()

            # Upload file from local disk into MinIO bucket
            self.client.fput_object(
                self.bucket_name,
                object_name,
                local_file_path
            )

            print(f"Uploaded '{local_file_path}' as '{object_name}'.")
            return object_name

        except S3Error as e:
            print(f"Upload failed: {e}")
            raise

    def download_file(self, object_name: str, local_file_path: str):
        """
        Download a file from object storage to local disk.

        Parameters:
        - object_name: file key inside MinIO
        - local_file_path: where to save downloaded file locally

        Returns:
        - local_file_path if download succeeds
        """
        try:
            self.client.fget_object(
                self.bucket_name,
                object_name,
                local_file_path
            )

            print(f"Downloaded '{object_name}' to '{local_file_path}'.")
            return local_file_path

        except S3Error as e:
            print(f"Download failed: {e}")
            raise

    def delete_file(self, object_name: str):
        """
        Delete a file from object storage.

        Parameters:
        - object_name: file key inside MinIO
        """
        try:
            self.client.remove_object(self.bucket_name, object_name)
            print(f"Deleted '{object_name}' from bucket.")

        except S3Error as e:
            print(f"Delete failed: {e}")
            raise