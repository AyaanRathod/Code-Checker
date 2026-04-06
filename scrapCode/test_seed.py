import traceback
import asyncio

try:
    from seed import seed_database
    asyncio.run(seed_database())
except Exception as e:
    with open("error.log", "w") as f:
        f.write(traceback.format_exc())
    print("Error written to error.log")
