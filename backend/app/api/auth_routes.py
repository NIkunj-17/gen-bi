from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.services.auth_service import (
    authenticate_user, create_user,
    create_access_token, get_user_by_email
)
from app.api.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

# ── Request/Response models ──────────────────────────

class RegisterRequest(BaseModel):
    email:    str
    name:     str
    password: str
    role:     str = "analyst"

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         dict

class UserResponse(BaseModel):
    id:    int
    email: str
    name:  str
    role:  str
    
class LoginJsonRequest(BaseModel):
    email:    str
    password: str
# ── Routes ───────────────────────────────────────────

@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Creates a new user account.
    Returns JWT token immediately so user is logged in after register.
    """
    if get_user_by_email(db, request.email):
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = create_user(
        db=db,
        email=request.email,
        name=request.name,
        password=request.password,
        role=request.role
    )

    token = create_access_token({
        "user_id": user.id,
        "email":   user.email,
        "role":    user.role
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":    user.id,
            "email": user.email,
            "name":  user.name,
            "role":  user.role
        }
    }


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Supports OAuth2 form (username/password from Swagger UI).
    'username' field is treated as email.
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    token = create_access_token({
        "user_id": user.id,
        "email":   user.email,
        "role":    user.role
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":    user.id,
            "email": user.email,
            "name":  user.name,
            "role":  user.role
        }
    }


@router.post("/login/json", response_model=TokenResponse)
def login_json(
    request: LoginJsonRequest,
    db: Session = Depends(get_db)
):
    """
    JSON login endpoint for frontend use.
    Accepts email + password as JSON body.
    """
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    token = create_access_token({
        "user_id": user.id,
        "email":   user.email,
        "role":    user.role
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "id":    user.id,
            "email": user.email,
            "name":  user.name,
            "role":  user.role
        }
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns currently logged in user.
    Protected — requires valid JWT token.
    """
    return {
        "id":    current_user.id,
        "email": current_user.email,
        "name":  current_user.name,
        "role":  current_user.role
    }