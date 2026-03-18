from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.api.v1.router import api_router
from app.core.database import engine, Base
# Import models to ensure they are registered with Base
import app.models.instructor
import app.models.course
import app.models.assignment
import app.models.submission
import app.models.stored_file
import app.models.comparison_result
import app.models.boilerplate


settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # We will initialize DB / storage connections here if needed
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup here if needed

app = FastAPI(
    title="Academic Integrity Code Comparison System API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Code-Checker API running"}

app.include_router(api_router, prefix=settings.API_V1_STR)
