from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.repositories.instructor_repository import instructor_repository
from app.schemas.instructor import InstructorCreate, InstructorResponse

settings = get_settings()
router = APIRouter()

@router.post("/login")
async def login_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    # Assuming username in form_data is the email
    user = await instructor_repository.get_by_email(db, email=form_data.username)
    if not user:
        # Fallback to username if email didn't work
        user = await instructor_repository.get_by_username(db, username=form_data.username)
        
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            subject=user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=InstructorResponse, status_code=status.HTTP_201_CREATED)
async def register_instructor(
    *,
    db: AsyncSession = Depends(get_db),
    instructor_in: InstructorCreate,
):
    """
    Register a new instructor.
    """
    user = await instructor_repository.get_by_email(db, email=instructor_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The instructor with this email already exists in the system.",
        )
    user = await instructor_repository.get_by_username(db, username=instructor_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The instructor with this username already exists in the system.",
        )
        
    hashed_password = get_password_hash(instructor_in.password)
    
    # We create a dictionary to pass to the repository, replacing 'password' with 'password_hash'
    instructor_data = instructor_in.model_dump(exclude={'password'})
    instructor_data['password_hash'] = hashed_password
    
    # Use a dummy create Schema object to satisfy the types if we want, or just pass dict
    # Wait, repository create expects CreateSchemaType which maps directly.
    # Since password_hash isn't in InstructorCreate, let's just make the SQL Alchemy model manually
    from app.models.instructor import Instructor
    db_obj = Instructor(**instructor_data)
    db.add(db_obj)
    await db.flush()
    await db.refresh(db_obj)
    
    return db_obj
