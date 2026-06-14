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

## Phase 5.5 - Automated API tests (Jest + Supertest)

Run with `npm test` from `backend/`. All 15 tests pass in ~20 s.
Database: `job-tracker-test` on the same Atlas cluster (separate from real data).
Node flag: `--experimental-vm-modules` required for ESM + Jest.

**auth.test.js** — 8 tests

| # | What we tested | How | Expected | Result |
|---|---------------|-----|----------|--------|
| 5.5.1 | Register — success | `POST /api/auth/register` with valid body | 201, token returned, no password in response | ✅ |
| 5.5.2 | Register — duplicate email | Register same email twice | 400 "already registered" | ✅ |
| 5.5.3 | Register — missing fields | No name or password | 400 validation error | ✅ |
| 5.5.4 | Login — correct credentials | `POST /api/auth/login` | 200, token returned | ✅ |
| 5.5.5 | Login — wrong password | Bad password | 401 "invalid email or password" | ✅ |
| 5.5.6 | Get me — valid token | `GET /api/auth/me` with Bearer token | 200, user object | ✅ |
| 5.5.7 | Get me — no token | No Authorization header | 401 | ✅ |

**jobs.test.js** — 8 tests

| # | What we tested | How | Expected | Result |
|---|---------------|-----|----------|--------|
| 5.5.8 | Create job — success | `POST /api/jobs` with valid body | 201, job returned with default status "Saved" | ✅ |
| 5.5.9 | Create job — missing role | Send company only | 400 validation error | ✅ |
| 5.5.10 | Create job — no token | No auth header | 401 | ✅ |
| 5.5.11 | List jobs | Create one job, `GET /api/jobs` | 200, array length 1 | ✅ |
| 5.5.12 | Get job by id — owner | `GET /api/jobs/:id` as owner | 200, correct job returned | ✅ |
| 5.5.13 | Get job by id — other user | Fetch another user's job id | 404 (ownership enforced) | ✅ |
| 5.5.14 | Update job | `PUT /api/jobs/:id` with `{status: "Applied"}` | 200, updated status | ✅ |
| 5.5.15 | Delete job | `DELETE /api/jobs/:id`, then GET | 200 on delete; 404 on re-fetch | ✅ |

## Not yet covered

- AI matcher endpoint (`POST /api/ai/match`) — skipped: would consume real OpenRouter credits on every `npm test` run.
- Frontend interaction tests (optional, later).

---

## Phase 7 — AI Agent (Steps 1–6) (2026-06-12)

### Manual tests

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| 7.1 | `draftCoverLetter` tool in isolation | `node test-tools.js` with React dev JD + sample resume | Well-structured cover letter grounded in resume | ✅ |
| 7.2 | `dotenv` not loaded in standalone script | Ran without `dotenv.config()` | 503 — API key undefined | ✅ (expected fail, fixed) |
| 7.3 | Agent loop — matching JD | `node test-agent.js` React dev JD | All 3 tools called, steps logged, all outputs returned | ✅ |
| 7.4 | Agent loop — mismatched JD | `node test-agent.js` Senior ML Engineer JD | Agent warned about gap, skipped all tools | ✅ |
| 7.5 | Honesty check — resume tailor output | Reviewed tailor suggestion for "REST APIs" keyword | Correctly surfaced skill implied by Express (not fabricated) | ✅ |
| 7.6 | `POST /api/agent/run` live endpoint | curl with real JWT + jobId | 200 with coverLetter, interviewPrep, steps; resumeTailor null (agent skipped it) | ✅ |
| 7.7 | Guard: no jobId | curl with empty body | 400 "jobId is required" | ✅ |
| 7.8 | Guard: no job description | curl with job that has no description | 400 "no description, add one first" | ✅ |
| 7.9 | Guard: no resume | curl with user that has no resume | 400 "no resume, upload first" | ✅ |

### Automated tests — `agent.test.js` (5 tests)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 7.10 | Valid request — mocked LLM calls all 3 tools | 200, body has coverLetter, interviewPrep, resumeTailor, steps | ✅ |
| 7.11 | No auth token | 401 | ✅ |
| 7.12 | Missing jobId | 400, message matches /jobId/i | ✅ |
| 7.13 | Job with no description | 400, message matches /description/i | ✅ |
| 7.14 | User with no resume | 400, message matches /resume/i | ✅ |

### Issue hit during Step 6
`ReferenceError: jest is not defined` — ESM mode does not inject `jest` as a global.
Fixed by adding `import { jest } from "@jest/globals"` to the test file.

### Full suite after Phase 7 Steps 1–6
```
Test Suites: 3 passed, 3 total
Tests:       20 passed, 20 total
Time:        ~33s
```
All 15 prior tests stayed green. ✅

---

## Phase 7 — Frontend & Refinements (Steps 7–7.5) (2026-06-14)

### Manual / live tests

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| 7.15 | Agent modal end-to-end | Clicked "Run AI assistant" on a real job | Modal runs agent, shows tabs with content | ✅ |
| 7.16 | Honest skip behaviour | Ran agent on a "3 years required" role as a fresh grad | Cover letter + interview prep made; resume tailor **declined** as not a fit | ✅ |
| 7.17 | NOT_NEEDED reason shown | Inspected the skipped tab | Reassuring "you're already covered" state with the agent's reason | ✅ |
| 7.18 | Result caching | Re-opened the same job's assistant | Returned instantly from cache; "Generated …" timestamp shown | ✅ |
| 7.19 | Re-run bypasses cache | Clicked Re-run | Fresh agent run (`force: true`), new results saved | ✅ |
| 7.20 | Low-match nudge | Viewed a card scored < 60 | "Low match — get help applying →" button opens the agent | ✅ |
| 7.21 | Download as .txt | Clicked Download on a result tab | File saved as `cover-letter-<company>.txt` | ✅ |

### Regression — automated suite after refinements
The caching change meant the agent response now comes from the persisted
`job.agentResults` (no `steps` field), so test 7.10's assertion changed from
`steps` to `generatedAt`.
```
Test Suites: 3 passed, 3 total
Tests:       20 passed, 20 total
```
✅

### Build verification
`npm run build` (frontend) — 107 modules transformed, compiles cleanly. ✅

---

## Phase 8 — Dashboard redesign + resume filename (2026-06-14)

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| 8.1 | Dashboard redesign renders | `npm run build` + loaded the board | Aurora backdrop, hero greeting, KPI tiles, frosted columns all render | ✅ |
| 8.2 | KPI count-up | Opened dashboard with jobs | Numbers tween up on load; tween old→new (not from 0) when a card moves | ✅ |
| 8.3 | Reduced-motion respected | Checked `useCountUp` / CSS guards | Animations skip / numbers snap when `prefers-reduced-motion` is set | ✅ |
| 8.4 | Resume filename shown | Uploaded a PDF, opened navbar + resume modal | Actual filename (e.g. `Muzzary_CV.pdf`) shown, not "Resume on file" | ✅ |
| 8.5 | Legacy resume fallback | User with a resume but no stored filename | Gracefully falls back to "Resume on file" | ✅ |
| 8.6 | Backend regression | `npm test` after adding `resumeFileName` | All routes still green | ✅ (20/20) |

---

## Phase 8 (cont.) — Code audit & cleanup (2026-06-14)

| # | What we tested | How | Expected | Result |
|---|----------------|-----|----------|--------|
| 8.7 | Dead-file deletion safe | Grepped for references, then deleted 5 files | No live code imports them; app still builds/tests | ✅ |
| 8.8 | Dead Tailwind keyframes | Removed from config, rebuilt | CSS bundle byte-identical (33.85 kB) → confirmed never emitted | ✅ |
| 8.9 | Shared `parseToolResponse` | Backend suite after consolidation | Tool behaviour unchanged | ✅ (20/20) |
| 8.10 | Shared `readError` / date utils | Frontend build after consolidation | Compiles; one definition each (grep-verified) | ✅ |
| 8.11 | `useEscapeKey` across 5 modals | Build after refactor | All modals still close on Escape; build clean | ✅ |
| 8.12 | Hardened error handling | Reviewed `agentController` + clipboard | DB calls inside try/catch; `if (!user)` guard; copy shows "Failed" | ✅ |

### Full suite after the cleanup
```
Test Suites: 3 passed, 3 total
Tests:       20 passed, 20 total
```
Frontend JS bundle shrank 268.1 → 267.2 kB from the dedup. ✅
