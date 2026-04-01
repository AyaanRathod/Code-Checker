from datetime import timedelta, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.repositories.instructor_repository import instructor_repository
from app.schemas.instructor import (
    InstructorRegister,
    InstructorResponse,
    ProfileUpdate,
    PasswordChange,
    GoogleCredential,
    TokenResponse,
)
from app.models.instructor import Instructor
from app.api.dependencies import get_current_user

settings = get_settings()
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _generate_unique_username(db: AsyncSession, email: str) -> str:
    """Derive a unique username from an email address."""
    base = (
        email.split("@")[0]
        .lower()
        .replace(".", "_")
        .replace("+", "_")
        .replace("-", "_")[:40]
    )
    username = base
    counter = 2
    while await instructor_repository.get_by_username(db, username):
        username = f"{base}{counter}"
        counter += 1
    return username


def _build_token_response(instructor: Instructor) -> TokenResponse:
    access_token = create_access_token(
        subject=instructor.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=InstructorResponse.model_validate(instructor),
    )


# ---------------------------------------------------------------------------
# POST /auth/register  — local sign-up
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_instructor(
    payload: InstructorRegister,
    db: AsyncSession = Depends(get_db),
):
    if await instructor_repository.get_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    username = await _generate_unique_username(db, payload.email)

    instructor = Instructor(
        username=username,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        title=payload.title,
        department=payload.department,
        auth_provider="local",
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(instructor)
    await db.commit()
    await db.refresh(instructor)
    return _build_token_response(instructor)


# ---------------------------------------------------------------------------
# POST /auth/login  — local sign-in
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = await instructor_repository.get_by_email(db, email=form_data.username)
    if not user:
        user = await instructor_repository.get_by_username(db, username=form_data.username)

    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return _build_token_response(user)


# ---------------------------------------------------------------------------
# POST /auth/google  — Google Sign-In / Sign-Up
# ---------------------------------------------------------------------------

@router.post("/google", response_model=TokenResponse)
async def google_auth(
    payload: GoogleCredential,
    db: AsyncSession = Depends(get_db),
):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google authentication is not configured on this server.",
        )

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        idinfo = google_id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token. Please try signing in again.",
        )

    google_id: str = idinfo["sub"]
    email: str = idinfo.get("email", "")
    first_name: str = idinfo.get("given_name", "")
    last_name: str = idinfo.get("family_name", "")
    avatar_url: Optional[str] = idinfo.get("picture")

    # 1. Existing account matched by google_id
    instructor = await instructor_repository.get_by_google_id(db, google_id)

    if not instructor:
        # 2. Existing local account with same email → link Google to it
        instructor = await instructor_repository.get_by_email(db, email)
        if instructor:
            instructor.google_id = google_id
            if avatar_url and not instructor.avatar_url:
                instructor.avatar_url = avatar_url
        else:
            # 3. Brand-new account via Google
            username = await _generate_unique_username(db, email)
            instructor = Instructor(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                google_id=google_id,
                avatar_url=avatar_url,
                auth_provider="google",
                password_hash=None,
            )
            db.add(instructor)

    instructor.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(instructor)
    return _build_token_response(instructor)


# ---------------------------------------------------------------------------
# GET /auth/me  — fetch current user profile
# ---------------------------------------------------------------------------

@router.get("/me", response_model=InstructorResponse)
async def get_me(current_user: Instructor = Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# PUT /auth/me  — update profile fields
# ---------------------------------------------------------------------------

@router.put("/me", response_model=InstructorResponse)
async def update_me(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user),
):
    if payload.username and payload.username != current_user.username:
        if await instructor_repository.get_by_username(db, payload.username):
            raise HTTPException(status_code=400, detail="Username is already taken.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    current_user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(current_user)
    return current_user


# ---------------------------------------------------------------------------
# POST /auth/change-password
# ---------------------------------------------------------------------------

@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: Instructor = Depends(get_current_user),
):
    if not current_user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Your account uses Google Sign-In. Set a password from your profile instead.",
        )
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.updated_at = datetime.now(timezone.utc)
    await db.commit()
