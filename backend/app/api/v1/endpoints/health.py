from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.storage_service import storage_service

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Check if the API is running correctly.
    """
    checks = {
        "api": "ok",
        "database": "ok",
        "storage": "ok"
    }

    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        checks["database"] = "down"

    try:
        storage_service.client.bucket_exists(storage_service.bucket_name)
    except Exception:
        checks["storage"] = "down"

    if checks["database"] != "ok" or checks["storage"] != "ok":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "degraded", "checks": checks}
        )

    return {"status": "ok", "message": "Backend is healthy", "checks": checks}
