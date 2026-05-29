from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Creates the connection to PostgreSQL
engine = create_engine(settings.DATABASE_URL)

# Each request gets its own session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all our database models
Base = declarative_base()

# Dependency — FastAPI injects this into every route that needs DB
def get_db():
    db = SessionLocal()
    try:
        yield db        # gives db to the route function
    finally:
        db.close()      # always closes after request finishes

# Test the connection works
def test_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        print('Database connected successfully')
    except Exception as e:
        print(f'Database connection failed: {e}')
