from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.core.database import test_connection

app = FastAPI(
    title="Gen-BI API",
    description="Generative Business Intelligence — NL to SQL",
    version="1.0.0"
)

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes under /api
app.include_router(router, prefix="/api")

@app.on_event("startup")
async def startup():
    test_connection()
    print("Gen-BI API started")