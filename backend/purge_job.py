# This script removes student metadata 30 days after the
# related assignment deadline.

# WHAT IT REMOVES
# - student_name_encrypted
# - student_id_encrypted

# WHAT IT KEEPS
# - submission row
# - stored file row
# - anonymized source code
# - comparison results

# This is because:
# The project requires student identity data to be deleted
# after 30 days, but the anonymized code must remain.


import asyncio
from sqlalchemy import text

#Import the async database session maker
from app.core.database import AsyncSessionLocal


async def purge_old_student_metadata():
    """
    This function finds submissions whose assignment deadline
    is older than 30 days and removes the stored student metadata.

    It does NOT delete:
    - the submission record
    - the stored file
    - the comparison results
    """

    #Open an async database session
    async with AsyncSessionLocal() as session:
        try:
            
            # This SQL query updates old submissions.
            
            # Logic:
            # 1. Look at the assignments table
            # 2. Find assignments whose deadline is older than 30 days
            # 3. For submissions linked to those assignments:
            #    - set student_name_encrypted = NULL
            #    - set student_id_encrypted = NULL
            #
            # Extra condition:
            # only update rows that still have metadata
            # so we don't keep rewriting already-purged rows
            
            query = text(
                """
                UPDATE submissions
                SET
                    student_name_encrypted = NULL,
                    student_id_encrypted = NULL
                WHERE assignment_id IN (
                    SELECT id
                    FROM assignments
                    WHERE deadline <= NOW() - INTERVAL '30 days'
                )
                AND (
                    student_name_encrypted IS NOT NULL
                    OR student_id_encrypted IS NOT NULL
                )
                """
            )

            #Run the update query
            result = await session.execute(query)

            #Save changes in the database
            await session.commit()

            #Print how many rows were changed
            print("==========================================")
            print("30-Day Purge Job Completed")
            print(f"Submissions updated: {result.rowcount}")
            print("Student metadata removed successfully.")
            print("==========================================")

        except Exception as e:
            #If anything fails, undo the transaction
            await session.rollback()

            print("==========================================")
            print("Purge job failed.")
            print(f"Error: {e}")
            print("==========================================")

            #Re-raise the error so debugging is easier
            raise

# This allows the file to be run directly like:
# python purge_job.py

if __name__ == "__main__":
    asyncio.run(purge_old_student_metadata())