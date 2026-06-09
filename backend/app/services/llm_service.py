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
    conversation_history: list
) -> list:
    """
    Builds full message history so LLM understands follow-up questions.
    e.g. user asks 'now show only Physics dept' — LLM knows what 'now' means
    because it sees the previous question and answer.
    """
    messages = []

    # Add previous conversation turns
    for turn in conversation_history:
        messages.append({
            "role": "user",
            "content": turn["question"]
        })
        messages.append({
            "role": "assistant",
            "content": json.dumps(turn["response"])
        })

    # Add current question
    messages.append({
        "role": "user",
        "content": question
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
    """
    Core function — converts natural language to SQL.
    Called by the API route on every user query.

    Flow:
    1. Get DB schema
    2. Build system prompt with schema
    3. Build message history
    4. Call Groq API
    5. Parse and return result
    """
    # Step 1: Get schema for this database
    schema = get_schema_for_prompt(schema_name)

    # Step 2: Build system prompt
    system_prompt = build_system_prompt(schema)

    # Step 3: Build messages with history
    messages = build_messages(question, conversation_history)

    # Step 4: Call Groq API
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            *messages
        ],
        temperature=0.1,      # low temperature = more deterministic SQL
        max_tokens=1000,
    )

    # Step 5: Parse response
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