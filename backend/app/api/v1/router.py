from fastapi import APIRouter
from app.api.v1.upload import router as upload_router
from app.api.v1.endpoints import (
    health,
    auth,
    student,
    analysis,
    instructor,
    repository
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(student.router, prefix="/student", tags=["student"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis Engine"])
api_router.include_router(instructor.router, prefix="/instructor", tags=["Instructor Management"])
api_router.include_router(repository.router, prefix="/repositories", tags=["Repositories"])
api_router.include_router(upload_router)