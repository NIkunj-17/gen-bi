import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

# Exact foreign keys based on real column names from DB
FOREIGN_KEYS = {
    "college_2": [
        ("advisor",    "s_id",  "student",    "id"),
    ],
    "car_1": [
        ("car_makers", "country",  "countries",  "countryid"),
        ("model_list", "maker",    "car_makers", "id"),
        ("cars_data",  "id",       "car_names",  "makeid"),
        ("countries",  "continent","continents", "contid"),
    ],
    "store_1": [
        ("albums",        "artist_id",     "artists",     "id"),
        ("tracks",        "album_id",      "albums",      "id"),
        ("tracks",        "genre_id",      "genres",      "id"),
        ("tracks",        "media_type_id", "media_types", "id"),
        ("invoice_lines", "invoice_id",    "invoices",    "id"),
        ("invoice_lines", "track_id",      "tracks",      "id"),
        ("invoices",      "customer_id",   "customers",   "id"),
        ("customers",     "support_rep_id","employees",   "id"),
        ("employees",     "reports_to",    "employees",   "id"),
    ],
}

def drop_existing_fks(conn, schema):
    """Drop all existing foreign keys in schema before recreating"""
    result = conn.execute(text(f"""
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_schema = '{schema}'
    """))
    rows = result.fetchall()
    for constraint_name, table_name in rows:
        try:
            conn.execute(text(
                f'ALTER TABLE {schema}."{table_name}" '
                f'DROP CONSTRAINT IF EXISTS "{constraint_name}"'
            ))
            conn.commit()
        except Exception:
            conn.rollback()

def add_foreign_keys():
    with engine.connect() as conn:
        for schema, fks in FOREIGN_KEYS.items():
            print(f"\nProcessing {schema}...")

            # Drop existing first to avoid duplicates
            drop_existing_fks(conn, schema)

            for table, col, ref_table, ref_col in fks:
                constraint_name = f"fk_{table}_{col}"
                sql = f"""
                    ALTER TABLE {schema}."{table}"
                    ADD CONSTRAINT {constraint_name}
                    FOREIGN KEY ("{col}")
                    REFERENCES {schema}."{ref_table}" ("{ref_col}")
                    ON DELETE SET NULL
                    DEFERRABLE INITIALLY DEFERRED
                """
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"  ✅ {table}.{col} → {ref_table}.{ref_col}")
                except Exception as e:
                    conn.rollback()
                    print(f"  ⚠️  {table}.{col} → skipped ({str(e)[:70]})")

    print("\n🎉 Done!")

if __name__ == "__main__":
    add_foreign_keys()