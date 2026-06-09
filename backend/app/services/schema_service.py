from sqlalchemy import create_engine, inspect, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

AVAILABLE_SCHEMAS = ["public", "college_2", "car_1", "store_1"]


def get_full_schema(schema_name: str = "public") -> dict:
    inspector = inspect(engine)
    schema = {}

    table_names = inspector.get_table_names(schema=schema_name)

    for table_name in table_names:
        columns = []
        for column in inspector.get_columns(table_name, schema=schema_name):
            columns.append({
                "name":     column["name"],
                "type":     str(column["type"]),
                "nullable": column.get("nullable", True),
            })

        foreign_keys = []
        for fk in inspector.get_foreign_keys(table_name, schema=schema_name):
            foreign_keys.append({
                "column":           fk["constrained_columns"],
                "references_table": fk["referred_table"],
                "references_col":   fk["referred_columns"]
            })

        pk = inspector.get_pk_constraint(table_name, schema=schema_name)

        schema[table_name] = {
            "columns":      columns,
            "primary_keys": pk.get("constrained_columns", []),
            "foreign_keys": foreign_keys,
        }

    return schema


def format_schema_for_prompt(schema: dict, schema_name: str) -> str:
    lines = []
    lines.append(f"DATABASE SCHEMA: {schema_name}")
    lines.append("=" * 50)

    for table_name, table_info in schema.items():
        lines.append(f"\nTable: {schema_name}.{table_name}")
        lines.append("Columns:")

        for col in table_info["columns"]:
            nullable  = "NULL" if col["nullable"] else "NOT NULL"
            pk_marker = " [PK]" if col["name"] in table_info["primary_keys"] else ""

            fk_marker = ""
            for fk in table_info["foreign_keys"]:
                if col["name"] in fk["column"]:
                    fk_marker = (
                        f" [FK → {schema_name}.{fk['references_table']}"
                        f".{fk['references_col'][0]}]"
                    )
            lines.append(
                f"  - {col['name']} ({col['type']}) "
                f"{nullable}{pk_marker}{fk_marker}"
            )

        # JOIN hints
        if table_info["foreign_keys"]:
            lines.append("JOIN hints:")
            for fk in table_info["foreign_keys"]:
                lines.append(
                    f"  - JOIN {schema_name}.{fk['references_table']} "
                    f"ON {schema_name}.{table_name}.{fk['column'][0]} = "
                    f"{schema_name}.{fk['references_table']}"
                    f".{fk['references_col'][0]}"
                )

        # Sample data — shows LLM real values
        samples = get_sample_data(schema_name, table_name, limit=2)
        if samples:
            lines.append("Sample data:")
            for row in samples:
                # Truncate long values
                clean = {
                    k: str(v)[:30] if v is not None else "null"
                    for k, v in row.items()
                }
                lines.append(f"  {clean}")

    lines.append("\n" + "=" * 50)
    lines.append("IMPORTANT RULES:")
    lines.append("- Always JOIN lookup tables instead of filtering by ID")
    lines.append("- Use schema prefix on all tables e.g. college_2.student")
    lines.append("- When user mentions a name/text, JOIN to find the matching ID")
    lines.append("- Use exact column names as shown in schema above")

    return "\n".join(lines)


def get_schema_for_prompt(schema_name: str = "public") -> str:
    schema = get_full_schema(schema_name)
    return format_schema_for_prompt(schema, schema_name)


def list_available_schemas() -> list:
    return AVAILABLE_SCHEMAS

def get_sample_data(schema_name: str, table_name: str, limit: int = 3) -> list:
    """
    Gets a few sample rows from a table.
    Shows the LLM what actual data looks like.
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text(f'SELECT * FROM {schema_name}."{table_name}" LIMIT {limit}')
            )
            rows = result.fetchall()
            cols = list(result.keys())
            return [dict(zip(cols, row)) for row in rows]
    except Exception:
        return []