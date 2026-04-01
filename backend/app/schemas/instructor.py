from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.schemas.base import ORMBaseModel


# ---------------------------------------------------------------------------
# Registration (local sign-up)
# ---------------------------------------------------------------------------

class InstructorRegister(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    title: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)


# ---------------------------------------------------------------------------
# Kept for repository type-compatibility (base repository generic types)
# ---------------------------------------------------------------------------

class InstructorCreate(ORMBaseModel):
    username: str
    email: EmailStr


class InstructorUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None


# ---------------------------------------------------------------------------
# Profile update (PUT /auth/me)
# ---------------------------------------------------------------------------

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    title: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=150)
    username: Optional[str] = Field(None, min_length=3, max_length=50)


# ---------------------------------------------------------------------------
# Password change (POST /auth/change-password)
# ---------------------------------------------------------------------------

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ---------------------------------------------------------------------------
# Google OAuth (POST /auth/google)
# ---------------------------------------------------------------------------

class GoogleCredential(BaseModel):
    credential: str  # Google ID token from the frontend


# ---------------------------------------------------------------------------
# API responses
# ---------------------------------------------------------------------------

class InstructorResponse(ORMBaseModel):
    id: UUID
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    auth_provider: str
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: InstructorResponse


# Legacy alias kept so existing imports in other files don't break
InstructorInDB = InstructorResponse
