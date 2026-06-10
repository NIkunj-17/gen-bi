from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
from app.core.database import get_db
from app.services.auth_service import decode_token, get_user_by_email
from app.models.user import User

# Tells FastAPI where to find the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI injects this into any route that needs auth.
    It reads the token from the Authorization header,
    decodes it, finds the user in DB and returns them.
    If anything fails → 401 Unauthorized.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        email   = payload.get("email")
        if email is None:
            raise credentials_error
    except JWTError:
        # Token expired or tampered with
        raise credentials_error

    user = get_user_by_email(db, email)
    if user is None or not user.is_active:
        raise credentials_error
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Only admin users can access this route"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_analyst(current_user: User = Depends(get_current_user)) -> User:
    """Analysts and admins can access — viewers cannot"""
    if current_user.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst or Admin access required"
        )
    return current_user