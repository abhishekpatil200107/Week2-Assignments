# Authentication API

Base URL: `http://localhost:3000`. All bodies and responses are JSON. Responses from `/api/auth/*` are sent with `Cache-Control: no-store`.

**How a session works:** `POST /api/auth/login` sets an `HttpOnly; SameSite=Strict` cookie named `token` holding a signed JWT (HS256, 1 hour by default). The browser sends it automatically. API clients (Postman, curl) can instead send `Authorization: Bearer <token>`; if both are present, the header wins.

Errors always look like `{ "error": "message" }`, and validation errors add `"details": { "field": "message" }`.

---

## POST `/api/auth/register`
Create an account.

**Body**
```json
{ "email": "jane@example.com", "username": "jane_doe", "password": "Sup3rSecret1" }
```

| Field | Rules |
|-------|-------|
| email | Valid email, max 254 chars. Stored lower-case. Unique (case-insensitive). |
| username | 3-30 chars: letters, numbers, underscore. Unique (case-insensitive). |
| password | 8+ chars, at least one letter and one number, max 72 bytes (bcrypt limit), must not contain the username. |

**Responses**
| Status | Meaning |
|--------|---------|
| 201 | `{ "message": "Account created. You can now log in.", "user": { "id", "email", "username" } }` |
| 400 | Validation failed (`details` lists each bad field), or malformed JSON |
| 409 | Email already registered / username taken (`details.email` or `details.username`) |
| 413 | Body larger than 10 KB |
| 429 | Too many attempts (rate limit) |

---

## POST `/api/auth/login`
Verify credentials and start a session.

**Body**: `{ "email": "jane@example.com", "password": "Sup3rSecret1" }`. The `email` field also accepts the **username**.

**Responses**
| Status | Meaning |
|--------|---------|
| 200 | Sets the `token` cookie. Body: `{ "message", "user": { id, email, username }, "expiresAt": "ISO date", "token": "<jwt>" }`. The `token` field is for API clients; the web app ignores it. |
| 400 | Missing or invalid fields |
| 401 | `{ "error": "Invalid email/username or password." }`. This exact message is returned for a wrong password **and** for an unknown account. |
| 429 | Too many attempts |

---

## POST `/api/auth/logout`
End the session. The cookie is cleared **and** the token's unique id (`jti`) is added to a revoked list, so a copy of the token stops working immediately, even though it has not expired.

Always returns `200 { "message": "Logged out." }` (safe to call when already logged out).

---

## GET `/api/auth/me`   (protected)
Return the logged-in user.

| Status | Meaning |
|--------|---------|
| 200 | `{ "user": { id, email, username, created_at }, "expiresAt": "ISO date" }` |
| 401 | `Authentication required.` / `Session expired. Please log in again.` / `Invalid session. Please log in again.` / `Session has ended. Please log in again.` |

---

## GET `/api/dashboard`   (protected)
Example protected data. 200 `{ "message", "totalUsers" }`, or 401 as above.

## GET `/dashboard`   (protected page)
Serves the dashboard HTML only to logged-in users; everyone else gets a `302` redirect to `/login.html`.

---

## Notes
- Logging in twice creates two independent sessions. Logout ends only the session whose token it receives.
