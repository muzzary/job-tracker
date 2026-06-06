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

## Phase 5 - AI resume matcher (2026-06-06)

Backend tested against the live API + real OpenRouter; UI driven with a headless
browser (puppeteer) for screenshots.

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| 5.1 | Backend boots with new routes | `node server.js` (pdf-parse ESM import) | starts, no crash | ✅ |
| 5.2 | Resume upload (PDF -> text) | `POST /api/users/resume` with a PDF | `200` "Resume saved" + character count | ✅ |
| 5.3 | Resume status on `/auth/me` | `GET /api/auth/me` after upload | `hasResume: true` + `resumeUpdatedAt` | ✅ |
| 5.4 | `jobDescription` saved on create | `POST /api/jobs` with a description | description persisted on the job | ✅ (after fixing the controller) |
| 5.5 | AI match (real OpenRouter) | `POST /api/ai/match` with a jobId | `200` + score, missingSkills, summary saved on the job | ✅ (score 65; skills Docker/AWS/TS/GraphQL/CI-CD) |
| 5.6 | Guard: no resume | score a job with no resume on file | `400` "upload your resume first" | ✅ |
| 5.7 | Guard: free tier busy | model returns 429 | falls back across models; else friendly "busy" message | ✅ |
| 5.8 | pdf-parse retry | parse the same PDF repeatedly | transient failures ride through the retry | ✅ |
| 5.9 | UI: dashboard score badge | load dashboard with a scored job | card shows the AI score badge | ✅ |
| 5.10 | UI: AI matcher modal | click a card's score | modal shows score ring + summary + skill chips | ✅ |
| 5.11 | UI: resume modal | open from the profile dropdown | shows "Resume on file" + Replace button | ✅ |

## Not yet covered (planned)

- Automated tests with **Jest + Supertest** (Phase 5.5) - at least one success +
  one failure case per route.
- AI matcher endpoint tests once Phase 5 is built (`POST /api/ai/match`).
- Frontend interaction tests (optional, later).
