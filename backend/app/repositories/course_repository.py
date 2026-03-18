from app.repositories.base_repository import BaseRepository
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate

class CourseRepository(BaseRepository[Course, CourseCreate, CourseUpdate]):
    """Course-specific repository."""
    pass

course_repository = CourseRepository(Course)
