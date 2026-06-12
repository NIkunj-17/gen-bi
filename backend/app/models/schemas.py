from pydantic import BaseModel
from typing import Optional

# ── Request models (what frontend sends) ──────────────

class QueryRequest(BaseModel):
    question: str
    schema_name: str = "college_2"
    conversation_history: list = []

class FeedbackRequest(BaseModel):
    query_id: str
    helpful: bool
    comment: Optional[str] = None

# ── Response models (what API returns) ────────────────

class QueryResponse(BaseModel):
    success:     bool
    question:    str
    sql:         str
    explanation: str
    chart_type:  str
    chart_config: dict
    data:        list
    columns:     list
    row_count:   int
    error:       Optional[str] = None
    recovered:   bool = False
    insight:     str = ""
    followups:   list = []

class SchemaResponse(BaseModel):
    schemas: list
    current_schema: str
    tables: dict

class HealthResponse(BaseModel):
    status: str
    database: str
    llm: str
    cache: dict = {}