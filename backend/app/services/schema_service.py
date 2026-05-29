from sqlalchemy import create_engine, inspect, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

# These are the schemas we want to expose to Claude
AVAILABLE_SCHEMAS = ["public", "college_2", "car_1", "store_1"]

def get_full_schema(schema_name: str = "public") -> dict:
    """
    Reads the entire structure of one schema and returns it as a dict.
    This is what we feed to Claude so it understands the database.
    """
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
                "column":     fk["constrained_columns"],
                "references": f"{fk['referred_table']}.{fk['referred_columns']}"
            })

        pk = inspector.get_pk_constraint(table_name, schema=schema_name)

        schema[table_name] = {
            "columns":      columns,
            "primary_keys": pk.get("constrained_columns", []),
            "foreign_keys": foreign_keys,
        }

    return schema


def format_schema_for_prompt(schema: dict, schema_name: str) -> str:
    """
    Converts schema dict into clean text Claude can read.
    Goes directly into the system prompt.
    """
    lines = []
    lines.append(f"DATABASE SCHEMA: {schema_name}")
    lines.append("=" * 50)

    for table_name, table_info in schema.items():
        lines.append(f"\nTable: {table_name}")
        lines.append("Columns:")

        for col in table_info["columns"]:
            nullable  = "NULL" if col["nullable"] else "NOT NULL"
            pk_marker = " [PK]" if col["name"] in table_info["primary_keys"] else ""
            lines.append(f"  - {col['name']} ({col['type']}) {nullable}{pk_marker}")

        if table_info["foreign_keys"]:
            lines.append("Relationships:")
            for fk in table_info["foreign_keys"]:
                lines.append(f"  - {fk['column']} -> {fk['references']}")

    return "\n".join(lines)


def get_schema_for_prompt(schema_name: str = "public") -> str:
    """
    Main function called by the AI pipeline.
    Returns formatted schema string ready to inject into Claude prompt.
    """
    schema = get_full_schema(schema_name)
    return format_schema_for_prompt(schema, schema_name)


def list_available_schemas() -> list:
    """
    Returns all schemas available for querying.
    Used by the frontend to show schema selector.
    """
    return AVAILABLE_SCHEMAS