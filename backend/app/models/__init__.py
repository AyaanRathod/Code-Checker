from app.models.base import Base
from app.models.instructor import Instructor
from app.models.course import Course
from app.models.assignment import Assignment
from app.models.submission import Submission
from app.models.stored_file import StoredFile
from app.models.comparison_result import ComparisonResult
from app.models.boilerplate import Boilerplate
from app.models.repository import Repository
from app.models.repository_submission import RepositorySubmission

# This ensures all models are loaded when we import Base
__all__ = [
    "Base",
    "Instructor",
    "Course",
    "Assignment",
    "Submission",
    "StoredFile",
    "ComparisonResult",
    "Boilerplate",
    "Repository",
    "RepositorySubmission"
]
