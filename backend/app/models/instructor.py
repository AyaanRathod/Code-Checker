from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.models.base import Base


class Instructor(Base):
    __tablename__ = "instructors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # nullable — Google OAuth users have no password

    # Profile fields
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    title = Column(String(20), nullable=True)       # Prof. / Dr. / Lecturer / TA / Other
    department = Column(String(150), nullable=True)

    # OAuth
    google_id = Column(String(255), unique=True, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    auth_provider = Column(String(10), nullable=False, default="local")  # "local" | "google"

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    courses = relationship("Course", back_populates="instructor", cascade="all, delete")
