from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.user import User

# bcrypt handles password hashing
# Why hash? If DB is leaked, attacker sees "x7$Kp2..." not "password123"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Convert plain password to bcrypt hash"""
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    """Check if plain password matches stored hash"""
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    """
    Creates a JWT token.
    Token contains user_id, email, role + expiry time.
    Signed with SECRET_KEY — any tampering invalidates it.
    """
    payload = data.copy()
    expiry  = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload.update({"exp": expiry})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    """
    Decodes and verifies a JWT token.
    Raises JWTError if token is invalid or expired.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, email: str, name: str, password: str, role: str = "analyst"):
    user = User(
        email=email,
        name=name,
        password=hash_password(password),  # never store plain password
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str):
    """
    Returns user if credentials valid, None otherwise.
    Used by login route.
    """
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user