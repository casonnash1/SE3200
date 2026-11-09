# Solar System Explorer

A web app for browsing and managing bodies in the solar system: the Sun, planets, dwarf planets, moons, comets and asteroids. A Flask API stores the data in SQLite, and a plain JavaScript client (no frameworks) lists, creates, edits and deletes records.

## Resource

The resource is a **body** (a body in the solar system). Each body has these attributes:

| Attribute | Type | Required | Description |
|---|---|---|---|
| `id` | integer | generated | Unique identifier assigned by the database |
| `name` | text | yes | Name of the body, unique and case-insensitive (for example `Europa`) |
| `type` | text | yes | One of `star`, `planet`, `dwarf planet`, `moon`, `comet`, `asteroid` |
| `parent_body` | text | no | Name of the body it orbits (for example `Sun` or `Jupiter`) |
| `diameter_km` | number | yes | Diameter in kilometers, greater than 0 |
| `mass_kg` | number | no | Mass in kilograms |
| `orbital_period_days` | number | no | Orbital period in days |
| `avg_temp_c` | number | no | Average temperature in degrees Celsius |
| `img_url` | text | no | URL of an image of the body |
| `description` | text | no | Short description |

Because every body has a unique name, the API uses the name (not the `id`) in URLs.

## Database schema

SQLite, stored in `server/bodies.db`. This is the same statement as `server/schema.sql`:

```sql
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
```

## REST endpoints

| Name | Method | Path | Success | Errors |
|---|---|---|---|---|
| List | `GET` | `/bodies` | `200` and a JSON array of all bodies | |
| Retrieve | `GET` | `/bodies/<name>` | `200` and the body as JSON | `404` if no such body |
| Create | `POST` | `/bodies` | `201`, the new body as JSON, and a `Location` header | `400` invalid data, `409` name already exists |
| Replace | `PUT` | `/bodies/<name>` | `200` and the updated body as JSON | `400` invalid data, `404` no such body, `409` new name already exists |
| Delete | `DELETE` | `/bodies/<name>` | `204` with no content | `404` if no such body |

Notes:

- Create and Replace take a JSON object with the attributes above. Replace overwrites the whole record, so any optional attribute left out is set to null.
- Renaming a body with Replace also updates the `parent_body` of the bodies that orbit it.
- Names containing special characters, such as `1P/Halley`, must be URL-encoded in the path (`/bodies/1P%2FHalley`).
- Every error returns JSON in the form `{"error": "Not Found", "message": "No body named 'Nope'"}`. An unknown route returns `404`, and a known path with the wrong method returns `405` with an `Allow` header.
- CORS is enabled for the whole server, including preflight `OPTIONS` requests.

## Running the project

You need Python 3.

1. Install the dependencies:

   ```
   pip install -r requirements.txt
   ```

2. Create the database from the schema and load the sample data (run this once, before the first start):

   ```
   cd server
   python create_db.py
   ```

   To start over, delete `server/bodies.db` and run the script again.

3. Start the server (it listens on `http://127.0.0.1:5000` by default, but may be different on MacOS):

   ```
   python app.py
   ```

4. Open `client/index.html` in a browser.

## Using the app

- Bodies are grouped into one card per type. Click a card to expand it.
- **View** shows every attribute of a body under its row.
- **Edit** opens a pre-filled form under the row. **Cancel** closes it without saving.
- **Delete** asks for confirmation before removing the body.
- **New Object** opens a blank form. **Check NASA** next to the image field searches NASA's image library and fills in a URL if it finds a relevant image.

## NASA image library

The **Check NASA** button uses the [NASA Image and Video Library](https://images-api.nasa.gov) (no key needed) to look up an image. The sample data's images came from the same place. This is optional, and the app works fully without it.

## Project layout

```
client/
  index.html   page structure and forms
  style.css    styling
  script.js    API calls, list, forms
server/
  app.py       Flask routes and error handlers
  database.py  BodyDB class: all database logic and validation
  create_db.py creates bodies.db from schema.sql and loads seed.sql
  schema.sql   table definition
  seed.sql     sample data (27 bodies)
requirements.txt
```
