from groq import Groq
import json
import re
from app.core.config import settings
from app.services.schema_service import get_schema_for_prompt

client = Groq(api_key=settings.GROQ_API_KEY)

# Best free model for SQL generation
GROQ_MODEL = "llama-3.3-70b-versatile"

def build_system_prompt(schema: str) -> str:
    return f"""You are an expert SQL analyst for a Business Intelligence system.
Your job is to convert natural language questions into accurate SQL queries.

STRICT RULES:
1. Always respond with valid JSON in this exact format:
{{
    "sql": "SELECT ... FROM ...",
    "explanation": "Plain English explanation of what this query does",
    "chart_type": "bar|line|pie|scatter|table",
    "chart_config": {{
        "x_axis": "column_name",
        "y_axis": "column_name",
        "title": "Chart title"
    }}
}}
2. ONLY use tables and columns that exist in the schema below
3. Always use schema prefix on all tables e.g. store_1.invoices
4. For aggregations always use aliases e.g. COUNT(*) as total
5. Limit results to 100 rows unless user specifies otherwise
6. Choose chart_type using these STRICT rules:
   - bar:     ONLY for comparing categories side by side
   - line:    ONLY for time-based data (year, month, date columns)
   - pie:     ONLY when question uses words like percentage, proportion, share, distribution
   - scatter: ONLY when comparing two numeric columns against each other
   - table:   when showing individual records or more than 3 columns
   NEVER use bar for time series. NEVER use pie unless percentages are requested.
7. POSTGRESQL SPECIFIC — this is PostgreSQL NOT SQLite:
   - For year:  EXTRACT(YEAR FROM date_column)
   - For month: EXTRACT(MONTH FROM date_column)
   - For text search: ILIKE '%value%'
   - For random: ORDER BY RANDOM()
   - For current date: CURRENT_DATE
   - NEVER use SQLite functions: strftime, date(), julianday(), RAND()

{schema}

IMPORTANT: Respond ONLY with the JSON object. No markdown, no backticks, no extra text."""


def build_messages(
    question: str,
    conversation_history: list,
    schema_name: str = "public"
) -> list:
    """
    Builds full message history so LLM understands follow-up questions.
    Schema name is injected into every user message so LLM never forgets
    which database to query.
    """
    messages = []

    # Add previous conversation turns
    for turn in conversation_history:
        messages.append({
            "role": "user",
            "content": f"[SCHEMA: {schema_name}] {turn['question']}"
        })
        messages.append({
            "role": "assistant",
            "content": json.dumps(turn["response"])
        })

    # Add current question with schema reminder
    messages.append({
        "role": "user",
        "content": f"[SCHEMA: {schema_name}] {question}\nOnly use tables from schema: {schema_name}"
    })

    return messages


def parse_llm_response(raw_text: str) -> dict:
    """
    Parses the LLM response into a clean dict.
    Handles cases where LLM wraps JSON in markdown code blocks.
    """
    # Remove markdown code blocks if present
    # e.g. ```json { ... } ``` → { ... }
    clean = re.sub(r'```(?:json)?', '', raw_text).strip()

    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        # Try to extract JSON object from messy response
        json_match = re.search(r'\{.*\}', clean, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        raise ValueError(f"Could not parse LLM response: {raw_text}")


def generate_sql(
    question: str,
    schema_name: str = "public",
    conversation_history: list = []
) -> dict:
    schema        = get_schema_for_prompt(schema_name)
    system_prompt = build_system_prompt(schema)

    history_text = ""
    for turn in conversation_history:
        history_text += f"\nPrevious question: {turn['question']}"
        history_text += f"\nPrevious SQL: {turn['response'].get('sql', '')}\n"

    # ✅ Explicitly remind LLM which schema to use
    full_prompt = f"""{system_prompt}

{history_text}
ACTIVE DATABASE SCHEMA: {schema_name}
ALL tables must use prefix: {schema_name}.tablename
DO NOT use any other schema.

Current question: {question}"""

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            *build_messages(question, conversation_history, schema_name),
        ],
        temperature=0.1,
        max_tokens=500,
    )

    raw_text = response.choices[0].message.content
    result   = parse_llm_response(raw_text)

    return {
        "sql":          result.get("sql", ""),
        "explanation":  result.get("explanation", ""),
        "chart_type":   result.get("chart_type", "table"),
        "chart_config": result.get("chart_config", {}),
    }


def generate_error_recovery(
    question: str,
    failed_sql: str,
    error_message: str,
    schema_name: str
) -> dict:
    """
    When SQL execution fails, we ask the LLM to fix it.
    LLM sees the bad SQL + error message and tries again.
    This is our automatic error recovery mechanism.
    """
    schema = get_schema_for_prompt(schema_name)

    recovery_message = f"""This SQL query failed with an error. Please fix it.

Original question: {question}
Failed SQL: {failed_sql}
Error message: {error_message}

Return the corrected query in the same JSON format."""

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": build_system_prompt(schema)},
            {"role": "user",   "content": recovery_message}
        ],
        temperature=0.1,
        max_tokens=1000,
    )

    raw_text = response.choices[0].message.content
    result   = parse_llm_response(raw_text)

    return {
        "sql":          result.get("sql", ""),
        "explanation":  result.get("explanation", ""),
        "chart_type":   result.get("chart_type", "table"),
        "chart_config": result.get("chart_config", {}),
    }
def generate_insight(
    question: str,
    data: list,
    columns: list,
    chart_type: str
) -> str:
    """
    Generates a 1-2 sentence executive insight from query results.
    Like ThoughtSpot's automated insights feature.
    """
    if not data:
        return "No data found for this query."

    # Build a small data summary to send to LLM
    sample = data[:5]
    data_summary = f"Columns: {columns}\nSample rows: {sample}\nTotal rows: {len(data)}"

    prompt = f"""You are a data analyst. Given this query result, write 1-2 sentences of executive insight.
Be specific — mention actual numbers, top values, or notable patterns.
Never say "the data shows" or "based on the query". Just state the insight directly.

Question asked: {question}
{data_summary}

Write only the insight, nothing else."""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=100,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return ""


def generate_followup_questions(
    question: str,
    schema_name: str,
    data: list
) -> list:
    """
    Suggests 3 smart follow-up questions based on the current result.
    Like ThoughtSpot's related searches feature.
    """
    if not data:
        return []

    prompt = f"""Given this data analysis question and its results, suggest exactly 3 short follow-up questions.
Questions should dig deeper, filter, or explore related aspects.
Return ONLY a JSON array of 3 strings. No explanation.

Original question: {question}
Database: {schema_name}
Result had {len(data)} rows.

Example format: ["question 1", "question 2", "question 3"]"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=150,
        )
        raw = response.choices[0].message.content.strip()
        import re
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []
    except Exception:
        return []