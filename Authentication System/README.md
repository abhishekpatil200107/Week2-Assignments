# Authentication System

Week 2 internship assignment, **Task 3**. Secure user registration, login and session management with password hashing, JWT sessions, protected routes and server-side logout.

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 22.13+ (including 24) and Express |
| Database | SQLite via Node's built-in `node:sqlite` (relational, no server, no native packages to compile) |
| Password hashing | `bcryptjs` (bcrypt, cost 12, per-password random salt) |
| Sessions | JWT (`jsonwebtoken`, HS256) in an **HttpOnly, SameSite=Strict cookie** |
| Hardening | `helmet` (security headers), `express-rate-limit`, strict input validation |
| Frontend | HTML, CSS, vanilla JavaScript (Fetch API) |
| Tests | Jest + Supertest (45 tests), Postman collection (19 requests), Playwright browser run |

## Requirements checklist
| Requirement | Where |
|-------------|-------|
| Registration with email, username, password | `POST /api/auth/register`, `frontend/public/register.html` |
| Password hashing with bcrypt | `backend/src/auth/auth.routes.js` (`bcrypt.hash`, cost 12) |
| Login validating credentials against the database | `POST /api/auth/login` |
| Session management with JWT or cookies | JWT in HttpOnly cookie, `backend/src/auth/tokens.js` |
| Protected routes requiring authentication | `requireAuth` / `requireAuthPage` in `backend/src/auth/auth.middleware.js` (`/api/auth/me`, `/api/dashboard`, `/dashboard`) |
| Logout invalidating the session | `POST /api/auth/logout` clears the cookie **and** revokes the token in the database |
| Appropriate error messages | Field-level messages for bad input, one generic message for bad credentials |
| Separate auth module | `backend/src/auth/` |

## Setup and run
Requires **Node.js 22.13 or newer** (check with `node -v`).

```bash
npm install        # run in this folder (the one with package.json, backend/ and frontend/)
npm start          # http://localhost:3000
```

Open http://localhost:3000. You are redirected to the login page; click "Create an account" to register.

**JWT secret:** in development, if `JWT_SECRET` is not set the server creates a random one for that run (and says so), which means everyone is logged out when it restarts. To keep sessions across restarts, set a secret of 32+ characters (see `.env.example`):

```powershell
# Windows PowerShell
$env:JWT_SECRET = "paste-a-long-random-string-here-32-chars-min"; npm start
```
```bash
# macOS / Linux
JWT_SECRET="paste-a-long-random-string-here-32-chars-min" npm start
```
In production (`NODE_ENV=production`) the server refuses to start without `JWT_SECRET` and marks the cookie `Secure` (HTTPS only).

You may see an `ExperimentalWarning: SQLite is an experimental feature` line on some Node versions; it is harmless. The database file is created at `database/auth.db`; delete it (with the server stopped) to reset all accounts.

### Tests
```bash
npm test                 # 45 automated tests (in-memory database)
```
Import `postman/Auth_API.postman_collection.json` into Postman and run the collection in order (19 requests, 35 assertions). It creates a unique user on every run.

## Security notes
**Passwords**
- Hashed with bcrypt (cost 12) with a unique random salt per password; only the hash is stored. The same password gives different hashes for different users.
- Plaintext passwords and hashes are never returned by the API or written to logs.
- Policy: 8+ characters, at least one letter and one number, must not contain the username, max 72 bytes (bcrypt ignores anything longer, so longer input is rejected rather than silently truncated).

**Sessions**
- The JWT lives in an `HttpOnly` cookie, so JavaScript on the page can never read it (an XSS bug cannot steal it), and `SameSite=Strict` keeps it off cross-site requests (CSRF). Nothing is stored in localStorage.
- Algorithm is pinned to HS256 on verify, so `alg: none` and wrong-secret tokens are rejected. Tokens expire after 1 hour.
- Every token has a unique id (`jti`). Logout adds it to a `revoked_tokens` table, so a copied token stops working immediately. Entries whose token has already expired are deleted each time someone logs out, so the table stays small.
- Every protected request also re-checks that the user still exists.

**Login**
- Wrong password and unknown account return the **same** message and status, and both run a bcrypt comparison, so neither the response nor its timing reveals which accounts exist.
- Rate limiting: 20 register/login requests per 15 minutes per IP (returns 429).

**Input handling**
- All fields must be strings (objects such as `{"$ne": ""}` are rejected), are trimmed, and are matched against whitelist patterns. Emails are lower-cased.
- All SQL uses parameterised statements; unique constraints in the database back up the duplicate checks.
- The frontend renders user data with `textContent`, never `innerHTML`.
- Request bodies are limited to 10 KB; `helmet` adds security headers (CSP, `X-Content-Type-Options`, etc.); `X-Powered-By` is removed.
- The dashboard HTML is not a public static file. It is sent only to authenticated users, and auth pages are sent with `no-store`, so the back button after logout does not show private pages.

**Known limitations (appropriate for this assignment, worth mentioning in the review)**
- No email verification, password reset or account lockout (rate limiting only).
- No refresh tokens: a session simply ends after one hour.
- Revocation list and users live in SQLite on one server; a multi-server deployment would use a shared database or cache.

## Project structure
```
backend/
  server.js                 entry point
  src/config.js             environment settings (JWT secret, expiry, bcrypt cost)
  src/db.js                 opens SQLite and applies the schema
  src/app.js                Express app, security middleware, protected routes
  src/auth/                 THE AUTH MODULE
    auth.routes.js          register, login, logout, me
    auth.middleware.js      requireAuth (API) and requireAuthPage (pages)
    tokens.js               sign/verify JWT, cookie options
    validation.js           input validation and sanitisation
  tests/auth.test.js        Jest + Supertest
database/schema.sql         users and revoked_tokens tables
frontend/public/            login.html, register.html, css/, js/
frontend/views/dashboard.html   protected page (served only when logged in)
postman/                    Postman collection
docs/API.md                 endpoint documentation
docs/demo-*.mp4             demo video: register, login, protected access, logout
screenshots/                8 screenshots of the flows
```
