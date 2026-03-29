from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings."""
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@db:5432/codechecker"
    
    # Security
    SECRET_KEY: str = "super_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 1 day
    API_V1_STR: str = "/api/v1"
    
    # MinIO
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "submissions"
    MINIO_SECURE: bool = False

    # Archival scheduler
    ARCHIVE_SCHEDULER_ENABLED: bool = True
    ARCHIVE_SWEEP_INTERVAL_SECONDS: int = 60
    ARCHIVE_SWEEP_BATCH_SIZE: int = 200

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
