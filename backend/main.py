from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from sqlalchemy import text

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
    # Retry DB initialization so startup does not race with container readiness.
    for attempt in range(5):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))

                # If an old integer-ID schema exists, reset legacy tables once so
                # the current UUID-based model metadata can initialize cleanly.
                legacy_id_type = await conn.execute(
                    text(
                        """
                        SELECT data_type
                        FROM information_schema.columns
                        WHERE table_name = 'submissions' AND column_name = 'id'
                        """
                    )
                )
                submissions_id_type = legacy_id_type.scalar_one_or_none()
                if submissions_id_type == "integer":
                    await conn.execute(text("DROP TABLE IF EXISTS comparisons CASCADE"))
                    await conn.execute(text("DROP TABLE IF EXISTS access_keys CASCADE"))
                    await conn.execute(text("DROP TABLE IF EXISTS stored_files CASCADE"))
                    await conn.execute(text("DROP TABLE IF EXISTS submissions CASCADE"))
                    await conn.execute(text("DROP TABLE IF EXISTS assignments CASCADE"))
                    await conn.execute(text("DROP TABLE IF EXISTS courses CASCADE"))
                    await conn.execute(text("DROP TABLE IF EXISTS instructors CASCADE"))

                await conn.run_sync(Base.metadata.create_all)
            break
        except Exception:
            if attempt == 4:
                raise
            await asyncio.sleep(2)
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
