import sqlite3
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

SPIDER_DATABASES = {
    "college_2": r"D:\spider\database\college_2\college_2.sqlite",
    "car_1":     r"D:\spider\database\car_1\car_1.sqlite",
    "store_1":   r"D:\spider\database\store_1\store_1.sqlite",
}

pg_engine = create_engine(os.getenv("DATABASE_URL"))

def sqlite_type_to_postgres(sqlite_type: str) -> str:
    type_map = {
        "INTEGER":  "INTEGER",
        "INT":      "INTEGER",
        "REAL":     "FLOAT",
        "TEXT":     "TEXT",
        "BLOB":     "TEXT",
        "VARCHAR":  "TEXT",
        "NUMERIC":  "NUMERIC",
        "BOOLEAN":  "BOOLEAN",
        "DATE":     "DATE",
        "DATETIME": "TIMESTAMP",
    }
    base = sqlite_type.upper().split("(")[0].strip()
    return type_map.get(base, "TEXT")

def import_table(db_name: str, table: str, cursor, pg_engine):
    try:
        with pg_engine.connect() as pg_conn:

            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()

            if not columns:
                print(f"     skipping {table} — no columns found")
                return

            # ✅ FIX: lowercase all column names
            col_defs = []
            for col in columns:
                col_name = col[1].lower()      # lowercase here
                col_type = sqlite_type_to_postgres(col[2])
                pk       = col[5]
                notnull  = col[3]

                if pk == 1:
                    col_defs.append(f'"{col_name}" SERIAL PRIMARY KEY')
                else:
                    null_str = "NOT NULL" if notnull else ""
                    col_defs.append(f'"{col_name}" {col_type} {null_str}')

            # Drop and recreate table with lowercase columns
            pg_conn.execute(text(
                f'DROP TABLE IF EXISTS {db_name}."{table}" CASCADE'
            ))
            pg_conn.execute(text(
                f'CREATE TABLE {db_name}."{table}" ({", ".join(col_defs)})'
            ))

            # Insert rows
            cursor.execute(f'SELECT * FROM "{table}"')
            rows = cursor.fetchall()

            inserted = 0
            for row in rows:
                try:
                    row_dict     = {str(i): val for i, val in enumerate(row)}
                    # ✅ FIX: use lowercase column names in INSERT too
                    col_names    = ", ".join([f'"{col[1].lower()}"' for col in columns])
                    placeholders = ", ".join([f":{i}" for i in range(len(columns))])
                    pg_conn.execute(text(
                        f'INSERT INTO {db_name}."{table}" ({col_names}) '
                        f'VALUES ({placeholders})'
                    ), row_dict)
                    inserted += 1
                except Exception:
                    pass

            pg_conn.commit()
            print(f"     ✅ {table} — {inserted} rows")

    except Exception as e:
        print(f"     ❌ {table} failed — {str(e)[:80]}")

def import_database(db_name: str, sqlite_path: str):
    print(f"\n importing {db_name}...")

    sqlite_conn = sqlite3.connect(sqlite_path)
    cursor      = sqlite_conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]

    # Create schema
    with pg_engine.connect() as pg_conn:
        pg_conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS {db_name}'))
        pg_conn.commit()

    for table in tables:
        print(f"  → {table}")
        import_table(db_name, table, cursor, pg_engine)

    sqlite_conn.close()
    print(f"✅ {db_name} done!")

if __name__ == "__main__":
    for db_name, sqlite_path in SPIDER_DATABASES.items():
        if os.path.exists(sqlite_path):
            import_database(db_name, sqlite_path)
        else:
            print(f"❌ Not found: {sqlite_path}")

    print("\n🎉 All Spider databases re-imported with lowercase columns!")