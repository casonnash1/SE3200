CREATE TABLE IF NOT EXISTS bodies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    type TEXT NOT NULL CHECK (type IN ('star', 'planet', 'dwarf planet', 'moon', 'comet', 'asteroid')),
    parent_body TEXT,
    diameter_km REAL NOT NULL,
    mass_kg REAL,
    orbital_period_days REAL,
    avg_temp_c REAL,
    img_url TEXT,
    description TEXT
);
