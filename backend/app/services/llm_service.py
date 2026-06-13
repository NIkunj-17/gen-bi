from groq import Groq
import json
import re
from app.core.config import settings
from app.services.schema_service import get_schema_for_prompt

client = Groq(api_key=settings.GROQ_API_KEY)

# Best free model for SQL generation
GROQ_MODEL = "llama-3.3-70b-versatile"

def build_system_prompt(schema: str, schema_name: str = "public") -> str:
    return f"""You are an expert SQL analyst for a Business Intelligence system.
Your job is to convert natural language questions into accurate SQL queries.

CRITICAL: You MUST ONLY query the {schema_name} database.
Every table in your SQL MUST use the prefix {schema_name}.tablename
NEVER use any other schema prefix.

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
3. Always use schema prefix: {schema_name}.tablename
4. For aggregations always use aliases e.g. COUNT(*) as total
5. Limit results to 100 rows unless user specifies otherwise
6. Choose chart_type using these STRICT rules:
   - bar:     ONLY for comparing categories side by side
   - line:    ONLY for time-based data (year, month, date columns)
   - pie:     ONLY when question uses words like percentage, proportion, share, distribution
   - scatter: ONLY when comparing two numeric columns against each other
   - table:   when showing individual records or more than 3 columns
7. POSTGRESQL SPECIFIC:
   - For year:  EXTRACT(YEAR FROM date_column)
   - For month: EXTRACT(MONTH FROM date_column)
   - NEVER use SQLite functions: strftime, date(), RAND()

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
    system_prompt = build_system_prompt(schema, schema_name)

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


def generate_insight(
    question: str,
    data: list,
    columns: list,
    chart_type: str
) -> str:
    """
    Generates a specific, data-driven insight with real numbers.
    """
    if not data:
        return "No data found."

    # Find numeric columns
    numeric_cols = []
    for col in columns:
        try:
            float(str(data[0].get(col, '')))
            numeric_cols.append(col)
        except (ValueError, TypeError):
            pass

    # Build data summary with actual values
    top3    = data[:3]
    bottom3 = data[-3:] if len(data) > 3 else []

    prompt = f"""You are a senior data analyst. Write ONE sentence of insight.
Rules:
- Use exact numbers from the data
- Mention the top value and bottom value if relevant  
- Be specific, not generic
- Never say "the data shows" or "based on the results"
- Under 25 words

Question: {question}
Top 3 rows: {top3}
Bottom 3 rows: {bottom3}
Total rows: {len(data)}
Numeric columns: {numeric_cols}

Write only the insight sentence:"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=80,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return ""


def generate_followup_questions(
    question: str,
    schema_name: str,
    data: list,
    columns: list
) -> list:
    if not data or not columns:
        return []

    # Build actual data summary with real values
    sample_values = {}
    for col in columns:
        vals = [str(row.get(col, '')) for row in data[:5] if row.get(col) is not None]
        sample_values[col] = vals[:3]

    top_row = data[0] if data else {}

    prompt = f"""You are a business analyst helping a user explore their data.

The user asked: "{question}"
Database: {schema_name}
Result columns: {columns}
Sample values per column: {sample_values}
Top result row: {top_row}
Total rows: {len(data)}

Write exactly 3 follow-up questions for this SAME database ({schema_name}).
Each question must:
- Be a complete sentence with at least 7 words
- Reference specific column names or values from the results above
- Be different from the original question
- Be answerable from {schema_name} database

BAD examples (too short/vague): "How many faculty?", "What are budgets?", "Show more data"
GOOD examples: "Which department has the highest average instructor salary?", "Show all students enrolled in the Physics department", "How many courses does each department offer?"

Return ONLY this exact JSON format with no extra text:
["question one here", "question two here", "question three here"]"""

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
        )
        raw   = response.choices[0].message.content.strip()
        clean = re.sub(r'```(?:json)?', '', raw).strip().strip('`').strip()
        match = re.search(r'\[.*?\]', clean, re.DOTALL)
        if match:
            questions = json.loads(match.group())
            # Filter — must be at least 6 words
            good = [q for q in questions if isinstance(q, str) and len(q.split()) >= 6]
            return good[:3]
        return []
    except Exception:
        return []

def generate_error_recovery(
    question: str,
    failed_sql: str,
    error_message: str,
    schema_name: str
) -> dict:
    """
    Fixes SQL errors using the LLM.
    Returns:
    {
        "sql": "corrected sql"
    }
    """

    schema = get_schema_for_prompt(schema_name)

    prompt = f"""
You are a PostgreSQL expert.

Database schema:
{schema}

User question:
{question}

Failed SQL:
{failed_sql}

Database error:
{error_message}

Generate a corrected PostgreSQL query.

Rules:
1. Return ONLY valid SQL
2. Use only tables and columns from the schema
3. Use schema prefix {schema_name}.table_name
4. Do not explain anything
"""

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.0,
        max_tokens=300,
    )

    sql = response.choices[0].message.content.strip()

    sql = re.sub(r"```sql", "", sql)
    sql = re.sub(r"```", "", sql)
    sql = sql.strip()

    return {"sql": sql}