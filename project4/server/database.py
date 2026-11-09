# This file only reads and writes the database. To create bodies.db from
# schema.sql (and load seed.sql), run create_db.py first.
from pathlib import Path
import math
import sqlite3
from contextlib import closing

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR / "bodies.db"

FIELDS = (
    "name", "type", "parent_body", "diameter_km",
    "mass_kg", "orbital_period_days", "avg_temp_c", "img_url", "description"
)

BODY_TYPES = ('star', 'planet', 'dwarf planet', 'moon', 'comet', 'asteroid')
NUMBER_FIELDS = ('diameter_km', 'mass_kg', 'orbital_period_days', 'avg_temp_c')
TEXT_FIELDS = ('name', 'type', 'parent_body', 'img_url', 'description')


def is_number(value):
    return (isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value))


def error(code, title, message):
    return code, {"error": title, "message": message}


def is_duplicate(err):
    return "UNIQUE" in str(err)


def validate_body(data):
    if not isinstance(data, dict):
        return "Body must be a JSON object"

    name = data.get('name')
    if not isinstance(name, str) or not name.strip():
        return "'name' is required and must be a non-empty string"
    if data.get('type') not in BODY_TYPES:
        return f"'type' is required and must be one of: {', '.join(BODY_TYPES)}"
    if not is_number(data.get('diameter_km')) or data['diameter_km'] <= 0:
        return "'diameter_km' is required and must be a positive number"

    for field in NUMBER_FIELDS[1:]:
        value = data.get(field)
        if value is not None and not is_number(value):
            return f"'{field}' must be a number or null"
    for field in TEXT_FIELDS[2:]:
        value = data.get(field)
        if value is not None and not isinstance(value, str):
            return f"'{field}' must be a string or null"

    return None


class BodyDB:

    def __init__(self, path=DB_PATH):
        self.path = path
        if not Path(path).exists():
            raise FileNotFoundError(
                f"{Path(path).name} not found. Run 'python create_db.py' to create it.")

    def _connect(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def _select(conn, name):
        row = conn.execute("SELECT * FROM bodies WHERE name = ?", (name,)).fetchone()
        return dict(row) if row else None

    def _find(self, name):
        with closing(self._connect()) as conn:
            return self._select(conn, name)

    def list(self):
        with closing(self._connect()) as conn:
            rows = conn.execute("SELECT * FROM bodies ORDER BY name").fetchall()
        return None, [dict(row) for row in rows]

    def get(self, name):
        body = self._find(name)
        if body is None:
            return error(404, "Not Found", f"No body named '{name}'")
        return None, body

    def create(self, data):
        problem = validate_body(data)
        if problem:
            return error(400, "Bad Request", problem)
        data = {**data, "name": data["name"].strip()}

        columns = ", ".join(FIELDS)
        placeholders = ", ".join("?" for _ in FIELDS)
        try:
            with closing(self._connect()) as conn, conn:
                conn.execute(
                    f"INSERT INTO bodies ({columns}) VALUES ({placeholders})",
                    [data.get(field) for field in FIELDS],
                )
                body = self._select(conn, data["name"])
        except sqlite3.IntegrityError as err:
            if is_duplicate(err):
                return error(409, "Conflict", f"A body named '{data['name']}' already exists")
            return error(400, "Bad Request", "Data violates a database constraint")
        return None, body

    def replace(self, name, data):
        problem = validate_body(data)
        if problem:
            return error(400, "Bad Request", problem)
        data = {**data, "name": data["name"].strip()}

        assignments = ", ".join(f"{field} = ?" for field in FIELDS)
        try:
            with closing(self._connect()) as conn, conn:
                existing = conn.execute(
                    "SELECT name FROM bodies WHERE name = ?", (name,)).fetchone()
                if existing is None:
                    return error(404, "Not Found", f"No body named '{name}'")
                conn.execute(
                    f"UPDATE bodies SET {assignments} WHERE name = ?",
                    [data.get(field) for field in FIELDS] + [name],
                )
                # Keep children attached when a body is renamed.
                if existing["name"] != data["name"]:
                    conn.execute(
                        "UPDATE bodies SET parent_body = ? "
                        "WHERE parent_body = ? COLLATE NOCASE",
                        (data["name"], existing["name"]),
                    )
                body = self._select(conn, data["name"])
        except sqlite3.IntegrityError as err:
            if is_duplicate(err):
                return error(409, "Conflict", f"A body named '{data['name']}' already exists")
            return error(400, "Bad Request", "Data violates a database constraint")
        return None, body

    def delete(self, name):
        with closing(self._connect()) as conn, conn:
            cursor = conn.execute("DELETE FROM bodies WHERE name = ?", (name,))
            found = cursor.rowcount > 0
        if not found:
            return error(404, "Not Found", f"No body named '{name}'")
        return None, None