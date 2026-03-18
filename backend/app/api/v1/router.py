from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    student,
    analysis,
    instructor
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(student.router, prefix="/student", tags=["student"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis Engine"])
api_router.include_router(instructor.router, prefix="/instructor", tags=["Instructor Management"])
# Further routers (instructor) will be added here
