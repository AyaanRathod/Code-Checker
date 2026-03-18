from app.repositories.base_repository import BaseRepository
from app.models.boilerplate import Boilerplate
from app.schemas.boilerplate import BoilerplateCreate, BoilerplateUpdate

class BoilerplateRepository(BaseRepository[Boilerplate, BoilerplateCreate, BoilerplateUpdate]):
    """Boilerplate-specific repository."""
    pass

boilerplate_repository = BoilerplateRepository(Boilerplate)
