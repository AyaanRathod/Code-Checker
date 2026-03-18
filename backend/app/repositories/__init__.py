from app.repositories.base_repository import BaseRepository
from app.repositories.instructor_repository import InstructorRepository, instructor_repository
from app.repositories.course_repository import CourseRepository, course_repository
from app.repositories.assignment_repository import AssignmentRepository, assignment_repository
from app.repositories.submission_repository import SubmissionRepository, submission_repository
from app.repositories.stored_file_repository import StoredFileRepository, stored_file_repository
from app.repositories.comparison_result_repository import ComparisonResultRepository, comparison_result_repository
from app.repositories.boilerplate_repository import BoilerplateRepository, boilerplate_repository

__all__ = [
    "BaseRepository",
    "InstructorRepository", "instructor_repository",
    "CourseRepository", "course_repository",
    "AssignmentRepository", "assignment_repository",
    "SubmissionRepository", "submission_repository",
    "StoredFileRepository", "stored_file_repository",
    "ComparisonResultRepository", "comparison_result_repository",
    "BoilerplateRepository", "boilerplate_repository"
]
