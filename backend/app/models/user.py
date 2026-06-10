from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, unique=True, index=True, nullable=False)
    name       = Column(String, nullable=False)
    password   = Column(String, nullable=False)      # hashed, never plain
    role       = Column(String, default="analyst")   # admin/analyst/viewer
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())