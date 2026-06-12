import traceback
from fastapi import APIRouter, HTTPException, Depends, UploadFile
from app.models.schemas import (
    QueryRequest, QueryResponse,
    SchemaResponse, HealthResponse
)
from app.services.llm_service import generate_sql, generate_error_recovery,generate_insight, generate_followup_questions
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
        
        # Generate insight and followups for successful queries
        insight  = ""
        followups = []
        if db_result["success"] and db_result["data"]:
            insight  = generate_insight(
                request.question,
                db_result["data"],
                db_result["columns"],
                llm_result["chart_type"]
            )
            followups = generate_followup_questions(
                request.question,
                request.schema_name,
                db_result["data"]
            )

        response_data = {
            "success":     db_result["success"],
            "question":    request.question,
            "sql":         llm_result["sql"],
            "explanation": llm_result["explanation"],
            "chart_type":  llm_result["chart_type"],
            "chart_config":llm_result["chart_config"],
            "data":        db_result["data"],
            "columns":     db_result["columns"],
            "row_count":   db_result["row_count"],
            "error":       db_result["error"],
            "recovered":   db_result.get("recovered", False),
            "insight":     insight,
            "followups":   followups
        }

        # Step 5: Cache successful results only
        if db_result["success"]:
            set_cached(request.question, request.schema_name, response_data)

        return QueryResponse(**response_data)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
from fastapi import UploadFile, File 
from app.services.upload_service import process_upload, get_user_tables
from app.services.schema_service import AVAILABLE_SCHEMAS

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_analyst)
):
    """
    Upload CSV or Excel file.
    Creates a table in user's personal schema.
    """
    try:
        contents = await file.read()
        result   = process_upload(
            file_bytes=contents,
            filename=file.filename,
            user_id=current_user.id
        )
        return {
            "success": True,
            "message": f"Uploaded {result['rows_inserted']} rows",
            **result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-tables")
async def get_my_tables(
    current_user: User = Depends(get_current_user)
):
    """
    Returns all tables uploaded by current user.
    """
    tables = get_user_tables(current_user.id)
    schema = f"user_{current_user.id}"
    return {
        "schema_name": schema,
        "tables":      tables
    }