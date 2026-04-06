import asyncio
from app.core.database import engine, Base

import app.models.instructor
import app.models.course
import app.models.assignment
import app.models.submission
import app.models.stored_file
import app.models.comparison_result
import app.models.boilerplate

async def init_models():
    print("Registered tables:", list(Base.metadata.tables.keys()))
    async with engine.begin() as conn:
        print("Running create_all...")
        await conn.run_sync(Base.metadata.create_all)
        print("create_all finished.")

asyncio.run(init_models())
