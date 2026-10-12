# Week 2 Assignments: Full Stack Development

**WeIntern Pvt Ltd internship, Full Stack Development track**
Submitted by **Abhishek Patil**

This repository contains the three Week 2 assignments. Each project has its own README with full details, setup steps and screenshots.

| # | Project | What it is | Folder | Live demo |
|---|---------|-----------|--------|-----------|
| 1 | **Responsive Company Website** | Four-page responsive website (Home, About, Services, Contact) with a hamburger menu and a validated contact form | [company website](company%20website) | [View live site](https://abhishekpatil200107.github.io/Week2-Assignments/) |
| 2 | **CRUD Employee Management System** | Full stack app to create, search, sort, edit and delete employee records through a REST API and database | [Employee CRUD Website](Employee%20CRUD%20Website) | Runs locally (see below) |
| 3 | **Authentication System** | Secure registration, login and logout with bcrypt password hashing, JWT sessions and protected routes | [Authentication System](Authentication%20System) | Runs locally (see below) |

---

## Task 1: Responsive Company Website

- Pages: Home, About, Services and Contact, with a shared navigation bar and footer
- Responsive navigation with a hamburger menu on mobile (CSS Grid and Flexbox, breakpoints at 640px and 900px)
- Contact form with live validation (name, email, phone, topic, message)
- Plain HTML5, CSS3 and JavaScript, with no frameworks and no build step
- Screenshots of all four pages on mobile, tablet and desktop are in `company website/screenshots`
- Design decisions are documented in `company website/docs/DESIGN.md`

**Live site:** https://abhishekpatil200107.github.io/Week2-Assignments/
It is deployed automatically from this repo by GitHub Actions (`.github/workflows/pages.yml`) every time `main` is updated.

**Run locally:** open `company website/index.html` in a browser.

---

## Task 2: CRUD Employee Management System

- **Create, read, update, delete** employee records (name, department, role, salary, join date)
- Searchable and sortable table, with a department filter
- Edit form pre-filled with current values, and a confirmation dialog before deleting
- Validation in the browser, on the server and in the database
- Loading, empty and error states, with success and error messages
- **Stack:** Node.js, Express, SQLite (the database that is built into Node), HTML, CSS and JavaScript
- Includes the database schema (`database/schema.sql`), a Postman collection (`postman/`), 21 automated API tests and screenshots

**Run locally** (needs Node.js 22.13 or newer; check with `node -v`):

```bash
cd "Employee CRUD Website/backend"
npm install
npm start
```

Then open http://localhost:3000. Sample data is added automatically on the first start.

Run the tests with `npm test` inside the same `backend` folder.

---

## Task 3: Authentication System

- Registration with email, username and password, with strong-password rules
- Passwords hashed with **bcrypt** (salted); only the hash is stored
- Login with email or username, with the same generic error for a wrong password and an unknown account
- **JWT sessions** stored in an HttpOnly, SameSite=Strict cookie, so page scripts cannot read the token
- Protected API routes and a protected dashboard page that redirects to login when logged out
- **Logout** clears the cookie and also revokes the token on the server, so a copied token stops working
- Rate limiting, security headers, input validation and parameterised SQL
- **Stack:** Node.js, Express, SQLite, bcryptjs, jsonwebtoken, HTML, CSS and JavaScript
- Includes the auth module (`backend/src/auth/`), API documentation (`docs/API.md`), a Postman collection, 45 automated tests, screenshots and a demo video (`docs/demo-register-login-protected-logout.mp4`)

**Run locally** (needs Node.js 22.13 or newer):

```bash
cd "Authentication System/backend"
npm install
npm start
```

Then open http://localhost:3000 and click "Create an account".

Run the tests with `npm test` inside the same `backend` folder.

---

## Repository structure

```
Week2-Assignments/
├── company website/          Task 1: static website, screenshots, docs
├── Employee CRUD Website/    Task 2: backend, frontend, database, postman, screenshots
├── Authentication System/    Task 3: backend (auth module), frontend, database, postman, docs, screenshots
└── .github/workflows/        GitHub Pages deployment for Task 1
```

## Notes

- `node_modules` and the local database files (`*.db`) are not committed. They are created by `npm install` and on the first start.
- Tasks 2 and 3 use SQLite through Node's built-in `node:sqlite` module, so installing needs no extra tools or compilers. You may see an "ExperimentalWarning: SQLite" line in the console; it is harmless.
- Each project's own README lists its security notes, API endpoints and known limitations.
