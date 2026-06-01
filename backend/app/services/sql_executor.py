from sqlalchemy import create_engine, text
from app.core.config import settings
import pandas as pd

engine = create_engine(settings.DATABASE_URL)

# Safety limits — prevent accidental heavy queries
MAX_ROWS    = 100
MAX_COLUMNS = 20

BLOCKED_KEYWORDS = [
    "DROP", "DELETE", "TRUNCATE",
    "INSERT", "UPDATE", "ALTER",
    "CREATE", "GRANT", "REVOKE"
]

def is_safe_query(sql: str) -> tuple[bool, str]:
    """
    Safety check before executing any LLM-generated SQL.
    We only allow SELECT statements — never destructive operations.

    Returns (is_safe, reason)
    """
    sql_upper = sql.upper().strip()

    # Must start with SELECT
    if not sql_upper.startswith("SELECT"):
        return False, "Only SELECT queries are allowed"

    # Block dangerous keywords
    for keyword in BLOCKED_KEYWORDS:
        if keyword in sql_upper:
            return False, f"Blocked keyword detected: {keyword}"

    return True, "OK"


def execute_query(sql: str) -> dict:
    """
    Executes a SQL query safely and returns results.

    Returns:
    {
        "success": True/False,
        "data": [...],          # list of row dicts
        "columns": [...],       # column names
        "row_count": 42,
        "error": None           # or error message
    }
    """
    # Step 1: Safety check
    is_safe, reason = is_safe_query(sql)
    if not is_safe:
        return {
            "success":   False,
            "data":      [],
            "columns":   [],
            "row_count": 0,
            "error":     f"Security check failed: {reason}"
        }

    # Step 2: Execute query
    try:
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            rows   = result.fetchmany(MAX_ROWS)
            cols   = list(result.keys())

            # Limit columns
            if len(cols) > MAX_COLUMNS:
                cols = cols[:MAX_COLUMNS]
                rows = [row[:MAX_COLUMNS] for row in rows]

            # Convert to list of dicts for JSON serialization
            data = []
            for row in rows:
                row_dict = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    # Convert non-serializable types to string
                    if hasattr(val, 'isoformat'):     # dates
                        val = val.isoformat()
                    elif val is None:
                        val = None
                    else:
                        val = val
                    row_dict[col] = val
                data.append(row_dict)

            return {
                "success":   True,
                "data":      data,
                "columns":   cols,
                "row_count": len(data),
                "error":     None
            }

    except Exception as e:
        return {
            "success":   False,
            "data":      [],
            "columns":   [],
            "row_count": 0,
            "error":     str(e)
        }


def execute_with_recovery(
    question: str,
    sql: str,
    schema_name: str,
    llm_generate_recovery  # function passed in to avoid circular import
) -> dict:
    """
    Executes SQL — if it fails, asks LLM to fix it and tries once more.
    This is our automatic error recovery flow.

    Flow:
    execute → fails → LLM fixes SQL → execute again → return result
    """
    # First attempt
    result = execute_query(sql)

    if result["success"]:
        return result

    # First attempt failed — try recovery
    print(f"Query failed: {result['error']}")
    print("Attempting LLM recovery...")

    try:
        fixed = llm_generate_recovery(
            question=question,
            failed_sql=sql,
            error_message=result["error"],
            schema_name=schema_name
        )

        # Second attempt with fixed SQL
        result2 = execute_query(fixed["sql"])

        if result2["success"]:
            print("Recovery successful!")
            result2["recovered"] = True
            result2["fixed_sql"] = fixed["sql"]
            return result2

    except Exception as e:
        print(f"Recovery also failed: {e}")

    # Both attempts failed
    return result