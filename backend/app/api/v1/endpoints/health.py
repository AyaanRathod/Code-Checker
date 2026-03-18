from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    """
    Check if the API is running correctly.
    """
    return {"status": "ok", "message": "Backend is healthy"}
