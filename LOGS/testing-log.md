# Testing Log

A running record of every test we've run to verify the app works, phase by phase.
This is **manual / integration testing** done during development (hitting the live
API and loading the real UI). Automated Jest + Supertest tests come later (Phase
5.5) and will be listed here too once written.

We update this file as we go - new tests get appended under the relevant phase.

**Legend:** ✅ pass · ❌ fail · ⚠️ known issue

Last updated: 2026-06-05

---

## Phase 2 - Job CRUD API + MongoDB

Run against the live backend (`node server.js`) + MongoDB Atlas.

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| 2.1 | Server boots | `node server.js` | "Server running" + "MongoDB connected" | ✅ |
| 2.2 | Create a job | `POST /api/jobs` with company+role | `201` + the new job document | ✅ |
| 2.3 | List jobs | `GET /api/jobs` | `200` + array containing the job | ✅ |
| 2.4 | Update a job | `PUT /api/jobs/:id` status Applied -> Interview | `200` + updated job | ✅ |
| 2.5 | Reject invalid input | `POST /api/jobs` with no `role` | `400` + "Role is required" | ✅ |
| 2.6 | Delete a job | `DELETE /api/jobs/:id` | `200` + "Job deleted" | ✅ |

---

## Phase 3 - JWT auth & API security

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| 3.1 | Register | `POST /api/auth/register` | `201` + a JWT token | ✅ |
| 3.2 | Protected route blocks anonymous | `GET /api/jobs` with no token | `401` "Not authorized, no token" | ✅ |
| 3.3 | Protected route allows token | `GET /api/jobs` with token | `200` + only that user's jobs (0 for a new user) | ✅ |
| 3.4 | Login - correct password | `POST /api/auth/login` right password | `200` + token | ✅ |
| 3.5 | Login - wrong password | `POST /api/auth/login` wrong password | `401` "Invalid email or password" | ✅ |
| 3.6 | Duplicate email blocked | register same email twice | `400` "Email is already registered" | ✅ |
| 3.7 | Password length rule | register with a 3-char password | `400` validation error | ✅ |
| 3.8 | Security headers present | inspect response headers | helmet headers (CSP, HSTS, X-Frame-Options, ...) | ✅ |
| 3.9 | Ownership scoping | create a job with a token | job's `userId` is the real logged-in user's id | ✅ |

---

## Phase 4 - React dashboard with Kanban board

Frontend built and run against the live backend.

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| 4.1 | Production build | `npm run build` | compiles, no errors (103 modules) | ✅ |
| 4.2 | Login page renders | headless screenshot of `/login` | split-screen brand panel + working form | ✅ |
| 4.3 | Register page renders | headless screenshot of `/register` | name/email/password form, show/hide password | ✅ |
| 4.4 | Dashboard renders with data | seed a real session, load `/dashboard` | navbar, stats strip, all 5 Kanban columns with cards | ✅ |
| 4.5 | Data scoping in UI | load dashboard for a new user | stats + columns reflect that user's jobs only | ✅ |
| 4.6 | Manual UI walkthrough (by Muzzary) | register, add jobs, drag between columns, edit, delete, search, log out, refresh-stays-logged-in | each action works | ✅ |

---

## Phase 4 follow-up - issues found during testing (2026-06-05)

While testing, Muzzary spotted some behaviours worth checking. We verified each one
at the source before deciding what to do (see also `failures-and-fixes.md`).

| # | What we tested | How | Result | Outcome |
|---|----------------|-----|--------|---------|
| F.1 | "Still logged in" after the DB was cleared | mint a valid token, delete the user, call `GET /jobs` | was `200 []` (token still worked) | ⚠️ -> **fixed** (see below) |
| F.2 | Two accounts with the same name | create two users, same name, different emails | both created (name is not unique) | ✅ expected - kept as-is (email is the unique identity) |
| F.3 | Invalid email format at login | (noted) | - | deferred (email validation/verification, later) |

### Re-test after fixing the stale-session issue (F.1)

After hardening the auth middleware (look the user up after verifying the token)
and adding `GET /api/auth/me` + a frontend startup check:

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| F.1a | `/auth/me` with a valid session | `GET /api/auth/me` with token | `200` + user | ✅ |
| F.1b | `/jobs` after the user is deleted | delete user, reuse the same token | `401` "user no longer exists" | ✅ |
| F.1c | `/auth/me` after the user is deleted | delete user, reuse the same token | `401` | ✅ |
| F.1d | `/auth/me` with no token | `GET /api/auth/me` no header | `401` | ✅ |
| F.1e | Frontend logs out a stale session | refresh the page after the account is gone | redirected to `/login`, storage cleared | ⏳ to confirm in browser |

---

## Not yet covered (planned)

- Automated tests with **Jest + Supertest** (Phase 5.5) - at least one success +
  one failure case per route.
- AI matcher endpoint tests once Phase 5 is built (`POST /api/ai/match`).
- Frontend interaction tests (optional, later).
