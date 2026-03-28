from app.repositories.base_repository import BaseRepository
from app.models.stored_file import StoredFile
from app.schemas.stored_file import StoredFileCreate, StoredFileUpdate

class StoredFileRepository(BaseRepository[StoredFile, StoredFileCreate, StoredFileUpdate]):
    """StoredFile-specific repository."""
    pass

stored_file_repository = StoredFileRepository(StoredFile)
