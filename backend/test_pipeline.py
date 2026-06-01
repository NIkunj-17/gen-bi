from app.services.llm_service import generate_sql, generate_error_recovery
from app.services.sql_executor import execute_with_recovery

def run_query(question: str, schema_name: str, history: list = []):
    """
    Full pipeline:
    NL question → LLM → SQL → Execute → Results
    """
    print(f"\nQuestion: {question}")
    print("-" * 50)

    # Step 1: Generate SQL from natural language
    llm_result = generate_sql(
        question=question,
        schema_name=schema_name,
        conversation_history=history
    )
    print(f"SQL:         {llm_result['sql']}")
    print(f"Explanation: {llm_result['explanation']}")
    print(f"Chart type:  {llm_result['chart_type']}")

    # Step 2: Execute SQL with auto recovery
    db_result = execute_with_recovery(
        question=question,
        sql=llm_result["sql"],
        schema_name=schema_name,
        llm_generate_recovery=generate_error_recovery
    )
    print(f"Success:     {db_result['success']}")
    print(f"Rows:        {db_result['row_count']}")
    print(f"Sample data: {db_result['data'][:2]}")

    return llm_result, db_result


# ── Test 1: Simple query ──────────────────────────
run_query(
    question="Show me the top 5 students with highest total credits",
    schema_name="college_2"
)

# ── Test 2: Aggregation ───────────────────────────
run_query(
    question="What is the average salary of instructors in each department?",
    schema_name="college_2"
)

# ── Test 3: Cross table join ──────────────────────
run_query(
    question="Show me each student name and their advisor instructor name",
    schema_name="college_2"
)

# ── Test 4: Car database ──────────────────────────
run_query(
    question="Which car makers are from the USA?",
    schema_name="car_1"
)

# ── Test 5: Store database ────────────────────────
run_query(
    question="Show total sales amount by country",
    schema_name="store_1"
)