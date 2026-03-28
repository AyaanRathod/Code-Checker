from app.schemas.instructor import InstructorCreate, InstructorUpdate, InstructorResponse
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, AssignmentResponse
from app.schemas.submission import SubmissionCreate, SubmissionUpdate, SubmissionResponse
from app.schemas.stored_file import StoredFileCreate, StoredFileUpdate, StoredFileResponse
from app.schemas.comparison_result import ComparisonResultCreate, ComparisonResultUpdate, ComparisonResultResponse
from app.schemas.boilerplate import BoilerplateCreate, BoilerplateUpdate, BoilerplateResponse

__all__ = [
    "InstructorCreate", "InstructorUpdate", "InstructorResponse",
    "CourseCreate", "CourseUpdate", "CourseResponse",
    "AssignmentCreate", "AssignmentUpdate", "AssignmentResponse",
    "SubmissionCreate", "SubmissionUpdate", "SubmissionResponse",
    "StoredFileCreate", "StoredFileUpdate", "StoredFileResponse",
    "ComparisonResultCreate", "ComparisonResultUpdate", "ComparisonResultResponse",
    "BoilerplateCreate", "BoilerplateUpdate", "BoilerplateResponse"
]
