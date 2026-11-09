"""Create the SQLite database file from schema.sql and load seed.sql.

Run this file once before starting the server:

    python create_db.py

It is safe to run again: the table is only created if missing, and the seed
data is only loaded when the table is empty. To start over, delete bodies.db
and run it again.
"""
import sqlite3
from contextlib import closing
from pathlib import Path

from database import DB_PATH

BASE_DIR = Path(__file__).parent
SCHEMA_PATH = BASE_DIR / "schema.sql"
SEED_PATH = BASE_DIR / "seed.sql"


def create_database(path=DB_PATH):
    with closing(sqlite3.connect(path)) as conn:
        conn.executescript(SCHEMA_PATH.read_text())
        has_rows = conn.execute("SELECT 1 FROM bodies LIMIT 1").fetchone()
        if has_rows is None and SEED_PATH.exists():
            conn.executescript(SEED_PATH.read_text())
            return "created and seeded"
    return "already set up"


if __name__ == "__main__":
    print(f"{DB_PATH.name}: {create_database()}")
