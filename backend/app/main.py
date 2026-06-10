from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.core.database import test_connection, engine, Base
from app.models.user import User

app = FastAPI(
    title="Gen-BI API",
    description="Generative Business Intelligence — NL to SQL",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router,      prefix="/api")
app.include_router(auth_router, prefix="/api/auth")

@app.on_event("startup")
async def startup():
    # Auto create users table
    Base.metadata.create_all(bind=engine)
    test_connection()
    print("Gen-BI API started")