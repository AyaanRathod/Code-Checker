from minio import Minio
from minio.error import S3Error
from app.core.config import get_settings
import io

settings = get_settings()

class StorageService:
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Ensure the target bucket exists, create if it doesn't."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as err:
            print(f"Error ensuring bucket exists: {err}")
            # In production, we'd log this properly

    def upload_file(self, object_name: str, file_data: bytes, content_type: str = "application/octet-stream") -> str:
        """Uploads a file to MinIO and returns the path."""
        try:
            file_stream = io.BytesIO(file_data)
            self.client.put_object(
                self.bucket_name,
                object_name,
                file_stream,
                length=len(file_data),
                content_type=content_type
            )
            # The storage path is just the object name within the bucket
            return object_name
        except S3Error as err:
            raise Exception(f"Failed to upload to storage: {err}")

    def download_file(self, object_name: str) -> bytes:
        """Downloads a file from MinIO."""
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            return response.read()
        except S3Error as err:
            raise Exception(f"Failed to download from storage: {err}")
        finally:
            if 'response' in locals():
                response.close()
                response.release_conn()

    def delete_file(self, object_name: str):
        """Deletes a file from MinIO."""
        try:
            self.client.remove_object(self.bucket_name, object_name)
        except S3Error as err:
            raise Exception(f"Failed to delete from storage: {err}")

storage_service = StorageService()
