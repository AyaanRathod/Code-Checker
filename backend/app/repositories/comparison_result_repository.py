from app.repositories.base_repository import BaseRepository
from app.models.comparison_result import ComparisonResult
from app.schemas.comparison_result import ComparisonResultCreate, ComparisonResultUpdate

class ComparisonResultRepository(BaseRepository[ComparisonResult, ComparisonResultCreate, ComparisonResultUpdate]):
    """ComparisonResult-specific repository."""
    pass

comparison_result_repository = ComparisonResultRepository(ComparisonResult)
