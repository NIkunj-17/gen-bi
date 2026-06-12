import pandas as pd
import io
from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

def sanitize_name(name: str) -> str:
    """
    Converts column/table names to safe PostgreSQL names.
    e.g. 'Total Sales $' → 'total_sales'
    """
    import re
    name = name.lower().strip()
    name = re.sub(r'[^a-z0-9_]', '_', name)
    name = re.sub(r'_+', '_', name)
    name = name.strip('_')
    return name or 'column'

def infer_pg_type(series: pd.Series) -> str:
    """
    Infers PostgreSQL column type from pandas Series.
    """
    dtype = str(series.dtype)
    if 'int' in dtype:
        return 'INTEGER'
    elif 'float' in dtype:
        return 'FLOAT'
    elif 'datetime' in dtype:
        return 'TIMESTAMP'
    elif 'bool' in dtype:
        return 'BOOLEAN'
    else:
        # Check if it looks like a date
        sample = series.dropna().head(5).astype(str)
        if sample.str.match(r'\d{4}-\d{2}-\d{2}').any():
            return 'DATE'
        return 'TEXT'

def process_upload(
    file_bytes: bytes,
    filename: str,
    user_id: int
) -> dict:
    """
    Main upload function:
    1. Read CSV or Excel file
    2. Clean column names
    3. Create table in PostgreSQL
    4. Insert all rows
    5. Return schema info

    Each user gets their own schema: user_{user_id}
    """
    # Step 1: Read file into DataFrame
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_bytes))
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            raise ValueError("Only CSV and Excel files supported")
    except Exception as e:
        raise ValueError(f"Could not read file: {e}")

    if df.empty:
        raise ValueError("File is empty")

    # Step 2: Clean column names
    df.columns = [sanitize_name(col) for col in df.columns]

    # Remove duplicate column names
    seen = {}
    new_cols = []
    for col in df.columns:
        if col in seen:
            seen[col] += 1
            new_cols.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            new_cols.append(col)
    df.columns = new_cols

    # Step 3: Create table name from filename
    table_name = sanitize_name(filename.rsplit('.', 1)[0])
    schema_name = f"user_{user_id}"

    # Step 4: Build CREATE TABLE statement
    col_defs = ['id SERIAL PRIMARY KEY']
    for col in df.columns:
        pg_type = infer_pg_type(df[col])
        col_defs.append(f'"{col}" {pg_type}')

    with engine.connect() as conn:
        # Create user schema if not exists
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS {schema_name}'))

        # Drop existing table with same name
        conn.execute(text(
            f'DROP TABLE IF EXISTS {schema_name}."{table_name}" CASCADE'
        ))

        # Create new table
        conn.execute(text(
            f'CREATE TABLE {schema_name}."{table_name}" '
            f'({", ".join(col_defs)})'
        ))

        # Step 5: Insert rows in batches
        rows_inserted = 0
        batch_size = 100

        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            for _, row in batch.iterrows():
                col_names = ', '.join([f'"{c}"' for c in df.columns])
                placeholders = ', '.join([f':val_{j}' for j in range(len(df.columns))])
                values = {
                    f'val_{j}': None if pd.isna(val) else val
                    for j, val in enumerate(row)
                }
                try:
                    conn.execute(text(
                        f'INSERT INTO {schema_name}."{table_name}" '
                        f'({col_names}) VALUES ({placeholders})'
                    ), values)
                    rows_inserted += 1
                except Exception:
                    pass

        conn.commit()

    return {
        "schema_name":   schema_name,
        "table_name":    table_name,
        "rows_inserted": rows_inserted,
        "columns":       list(df.columns),
        "column_types":  {col: infer_pg_type(df[col]) for col in df.columns},
        "preview":       df.head(3).to_dict(orient='records')
    }

def get_user_tables(user_id: int) -> list:
    """
    Returns all tables uploaded by this user.
    """
    schema_name = f"user_{user_id}"
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = '{schema_name}'
                AND table_name != 'sqlite_sequence'
            """))
            return [row[0] for row in result.fetchall()]
    except Exception:
        return []