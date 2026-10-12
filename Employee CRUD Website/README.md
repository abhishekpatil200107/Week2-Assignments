# Employee Management System (CRUD)

Week 2 internship assignment, **Task 2**. A full-stack web app where HR admins can create, view, search, sort, edit and delete employee records.

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, vanilla JavaScript (Fetch API) |
| Backend | Node.js 22.13+ (including 24) and Express |
| Database | SQLite via Node's built-in `node:sqlite` module: relational, file-based, no server and **no native packages to compile** |
| API testing | Postman collection + Jest/Supertest + Playwright end-to-end run |

## Features
- **Create** employees (name, department, role, salary, join date) with validation on client and server
- **Read** all employees in a table with **live search** (name, role, department), **department filter** and **sortable columns**
- **Update** through an edit form pre-filled with the current values
- **Delete** with a confirmation dialog
- Loading spinner, empty state, error banner with Retry, success/error toasts, disabled buttons while saving
- Responsive layout, accessible dialogs, keyboard-friendly, `aria-sort` on table headers

## Setup and run
Requires **Node.js 22.13 or newer** (check with `node -v`). SQLite is built into Node, so `npm install` only downloads pure JavaScript packages and needs no Visual Studio, Python or C++ tools on Windows.

```bash
cd backend
npm install
npm start          # http://localhost:3000
```

Open http://localhost:3000. The server serves both the API (`/api/...`) and the frontend, so there is nothing else to configure. You may see an `ExperimentalWarning: SQLite is an experimental feature` line in the console on some Node versions; it is harmless. On first start the database file is created at `database/employees.db` and filled with 8 sample employees.

Optional environment variables: `PORT` (default 3000), `DB_FILE` (path to the SQLite file).

To reset the data, stop the server and delete `database/employees.db`.

### Run the tests
```bash
cd backend && npm test      # 21 API tests (Jest + Supertest, in-memory DB)
```
Import `postman/Employee_API.postman_collection.json` into Postman and run the collection (16 requests, 24 assertions). Set the `baseUrl` variable if you use another port.

## Database schema
See `database/schema.sql`.

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| name | TEXT | Required, 2-100 chars |
| department | TEXT | Required, 2-50 chars, indexed |
| role | TEXT | Required, 2-80 chars |
| salary | REAL | Required, > 0 and <= 100,000,000 |
| join_date | TEXT | Required, `YYYY-MM-DD` |
| created_at / updated_at | TEXT | Set automatically |

## REST API
Base URL `http://localhost:3000`. Bodies and responses are JSON.

| Method | Endpoint | Description | Success |
|--------|----------|-------------|---------|
| GET | `/api/employees` | List. Query: `search`, `department`, `sort` (`id,name,department,role,salary,join_date`), `order` (`asc`/`desc`) | 200 `{count, data[]}` |
| GET | `/api/employees/:id` | Get one | 200 `{data}` |
| POST | `/api/employees` | Create | 201 `{data}` + `Location` header |
| PUT | `/api/employees/:id` | Update (send all fields) | 200 `{data}` |
| DELETE | `/api/employees/:id` | Delete | 200 `{message}` |
| GET | `/api/health` | Health check | 200 `{status:"ok"}` |

Request body for POST/PUT:
```json
{ "name": "Jane Doe", "department": "Engineering", "role": "Developer", "salary": 1200000, "join_date": "2024-03-01" }
```

Errors use a consistent shape `{ "error": "message", "details": { "field": "message" } }`:
`400` validation / bad id / malformed JSON, `404` not found, `413` body too large, `500` unexpected.

## Security and quality notes
- All SQL uses parameterised statements; the sort column is checked against a whitelist (injection attempts are covered by tests).
- `LIKE` wildcards (`%`, `_`) in search text are escaped.
- The frontend renders data with `textContent`, so HTML in a field is shown as text, not run (covered by the E2E test).
- Input is validated in the browser (fast feedback), on the server (the real check), and by `CHECK` constraints in the database.
- Request body size is limited to 10 KB.

## Project structure
```
backend/
  server.js               entry point
  src/app.js              Express app, middleware, error handling
  src/db.js               opens SQLite, applies schema + seed
  src/validation.js       employee validation rules
  src/routes/employees.js CRUD endpoints
  tests/api.test.js       Jest + Supertest
database/                 schema.sql, seed.sql
frontend/                 index.html, styles.css, app.js
postman/                  Postman collection
screenshots/              CRUD operations (9 screenshots)
```

## Screenshots
`screenshots/` shows: list, search, sort, add form with validation errors, filled add form, pre-filled edit form, delete confirmation, error state and mobile view.

## Possible improvements
Pagination for large datasets, authentication (see Task 3 in this assignment), PATCH for partial updates, and moving to PostgreSQL/MySQL for multi-user deployment.
