import traceback
from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import (
    QueryRequest, QueryResponse,
    SchemaResponse, HealthResponse
)
from app.services.llm_service import generate_sql, generate_error_recovery
from app.services.sql_executor import execute_with_recovery
from app.services.schema_service import get_full_schema, list_available_schemas
from app.services.cache_service import get_cached, set_cached, get_cache_stats
from app.api.dependencies import require_analyst, get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    cache = get_cache_stats()
    return {
        "status":   "ok",
        "database": "connected",
        "llm":      "groq/llama-3.3-70b",
        "cache":    cache
    }

@router.get("/schemas", response_model=SchemaResponse)
async def get_schemas(
    schema_name: str = "college_2",
    current_user: User = Depends(get_current_user)
):
    try:
        schemas = list_available_schemas()
        tables  = get_full_schema(schema_name)
        return {
            "schemas":        schemas,
            "current_schema": schema_name,
            "tables":         tables
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query", response_model=QueryResponse)
async def run_query(
    request: QueryRequest,
    current_user: User = Depends(require_analyst)
):
    try:
        # Step 1: Check cache first
        cached = get_cached(request.question, request.schema_name)
        if cached:
            return QueryResponse(**cached)

        # Step 2: Cache miss — call LLM
        llm_result = generate_sql(
            question=request.question,
            schema_name=request.schema_name,
            conversation_history=request.conversation_history
        )

        # Step 3: Execute SQL
        db_result = execute_with_recovery(
            question=request.question,
            sql=llm_result["sql"],
            schema_name=request.schema_name,
            llm_generate_recovery=generate_error_recovery
        )

        # Step 4: Build response
        response_data = {
            "success":      db_result["success"],
            "question":     request.question,
            "sql":          llm_result["sql"],
            "explanation":  llm_result["explanation"],
            "chart_type":   llm_result["chart_type"],
            "chart_config": llm_result["chart_config"],
            "data":         db_result["data"],
            "columns":      db_result["columns"],
            "row_count":    db_result["row_count"],
            "error":        db_result["error"],
            "recovered":    db_result.get("recovered", False)
        }

        # Step 5: Cache successful results only
        if db_result["success"]:
            set_cached(request.question, request.schema_name, response_data)

        return QueryResponse(**response_data)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))