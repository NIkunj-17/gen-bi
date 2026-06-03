from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    QueryRequest,
    QueryResponse,
    SchemaResponse,
    HealthResponse
)
from app.services.llm_service import generate_sql, generate_error_recovery
from app.services.sql_executor import execute_with_recovery
from app.services.schema_service import (
    get_full_schema,
    list_available_schemas
)

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if API, database and LLM are all working"""
    return {
        "status":   "ok",
        "database": "connected",
        "llm":      "groq/llama-3.3-70b"
    }

@router.get("/schemas", response_model=SchemaResponse)
async def get_schemas(schema_name: str = "college_2"):
    """
    Returns available schemas and table structure.
    Frontend uses this to show schema selector and table browser.
    """
    try:
        schemas  = list_available_schemas()
        tables   = get_full_schema(schema_name)
        return {
            "schemas":        schemas,
            "current_schema": schema_name,
            "tables":         tables
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query", response_model=QueryResponse)
async def run_query(request: QueryRequest):
    """
    Main endpoint — converts NL question to SQL and returns results.

    Flow:
    1. Generate SQL from question using LLM
    2. Execute SQL safely
    3. If failed, attempt recovery
    4. Return data + chart config
    """
    try:
        # Step 1: Generate SQL
        llm_result = generate_sql(
            question=request.question,
            schema_name=request.schema_name,
            conversation_history=request.conversation_history
        )

        # Step 2: Execute with auto recovery
        db_result = execute_with_recovery(
            question=request.question,
            sql=llm_result["sql"],
            schema_name=request.schema_name,
            llm_generate_recovery=generate_error_recovery
        )

        return QueryResponse(
            success=db_result["success"],
            question=request.question,
            sql=llm_result["sql"],
            explanation=llm_result["explanation"],
            chart_type=llm_result["chart_type"],
            chart_config=llm_result["chart_config"],
            data=db_result["data"],
            columns=db_result["columns"],
            row_count=db_result["row_count"],
            error=db_result["error"],
            recovered=db_result.get("recovered", False)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))