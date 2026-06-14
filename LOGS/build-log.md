# Build Log — What / How / Why

A public engineering journal of how this project is built, phase by phase. Each
entry explains not just *what* was built but *why* it was built that way and the
trade-offs behind each decision. This is the development story of the project.

---

## Phase 2 — Job CRUD API with MongoDB

**Goal:** Build the full CRUD (Create, Read, Update, Delete) API for job
applications, backed by MongoDB through Mongoose, with input validation.

### What was built

| File | What it does |
|------|--------------|
| `backend/config/db.js` | Connects the app to MongoDB Atlas using Mongoose. |
| `backend/models/User.js` | Mongoose schema for a user (name, email, password, createdAt). |
| `backend/models/Job.js` | Mongoose schema for a job application, linked to a user. |
| `backend/controllers/jobController.js` | The 5 CRUD functions (the actual logic). |
| `backend/routes/jobRoutes.js` | Maps URLs to controller functions + validation. |
| `backend/middleware/authMiddleware.js` | **Placeholder** auth guard (real JWT comes in Phase 3). |
| `backend/server.js` | Wired the job routes in and called `connectDB()`. |

### How & why — decision by decision

**1. Separate `config/db.js` instead of connecting inside `server.js`.**
*Why:* "One concern per file." The server file should only start the app; the
database connection is its own responsibility. Easier to read, test, and maintain.

**2. `connectDB()` calls `process.exit(1)` on failure.**
*Why:* If the database is unreachable, the API cannot do anything useful. Crashing
loudly is better than running a broken server that silently fails every request.
Exit code `1` is the Unix convention for "exited because of an error."

**3. `userId` on the Job model is `mongoose.Schema.Types.ObjectId` with `ref: "User"`.**
*Why:* This is how two MongoDB collections are linked. It stores the user's `_id` on
each job, and `ref` lets Mongoose `populate()` the full user later. This is the
**reference relationship** between the two collections.

**4. `status` is an `enum`.**
*Why:* A job can only sit in one of five Kanban stages
(Saved / Applied / Interview / Offer / Rejected). The enum makes MongoDB reject any
other value, so bad data can never enter the database.

**5. Controllers always filter by `userId: req.user.id`.**
*Why:* Security. Even `getJobById` uses `findOne({ _id, userId })` so a user can
never read or change another user's job by guessing an id. `userId` is set from the
auth token, **never** from the request body, so a user can't forge ownership.

**6. `findOneAndUpdate(..., { new: true, runValidators: true })`.**
*Why:* `new: true` returns the document *after* the update (so the client sees the
new values). `runValidators: true` makes the schema rules (like the status enum)
apply on updates too — by default Mongoose skips validators on updates.

**7. Input validation with `express-validator` on create & update.**
*Why:* Never trust data from the client. We check that `company` and `role` exist,
that `jobUrl` is a real URL, that `status` is one of the allowed values, and that
`dateApplied` is a real date. Invalid input returns `400` with a clear message
instead of saving garbage.

**8. REST conventions for the routes.**
*Why:* `GET /jobs` (list), `POST /jobs` (create), `GET /jobs/:id` (read one),
`PUT /jobs/:id` (update), `DELETE /jobs/:id` (delete). Same URL, different HTTP verb
= RESTful design. We return `201` for "created" and `404` when a job isn't found.

**9. `router.use(protect)` applies the auth guard to every job route.**
*Why:* All job routes must be logged-in-only. Putting `protect` once at the top is
cleaner than repeating it on every line. For now `protect` is a placeholder that
attaches a fixed user id; Phase 3 replaces it with real JWT verification.

**10. Added `express-validator` to `package.json` and installed it.**
*Why:* It wasn't yet a dependency. It's the project's chosen validation library.

### How it was verified
- Ran the real `server.js`: log showed `MongoDB connected`.
- Ran a full live round-trip against `/api/jobs`:
  - `POST` created a job → `201` with the new document,
  - `GET` listed it,
  - `PUT` changed its status `Applied` → `Interview`,
  - `POST` with a missing `role` correctly returned `400` with a validation message,
  - `DELETE` removed it.
- All five CRUD operations passed against the live MongoDB Atlas database.

### Debugging the database connection
The first connection attempt failed with `querySrv ECONNREFUSED`. The full
diagnosis and fix are recorded in `failures-and-fixes.md` (Failure #1). Short
version: the `mongodb+srv://` string needs two special DNS lookups (SRV + TXT);
this network blocked the TXT lookup, so we switched to the standard `mongodb://`
string that lists the shard hosts directly and needs no SRV/TXT lookup.

### Done this phase
- ✅ Full job CRUD API built, wired, and tested live against MongoDB Atlas.
- Commit: `feat: add job CRUD API with MongoDB`.

---

## Phase 3 — JWT auth & API security

**Goal:** Let users register and log in, hash their passwords, hand out JWT tokens,
protect the job routes with a real token check, and harden the API.

### What was built

| File | What it does |
|------|--------------|
| `backend/controllers/authController.js` | `register` (hash + create + token) and `login` (verify + token). |
| `backend/routes/authRoutes.js` | `POST /register`, `POST /login` with validation + rate limiting. |
| `backend/middleware/authMiddleware.js` | **Replaced** the placeholder with real JWT verification. |
| `backend/server.js` | Added `helmet`, wired the auth routes. |

### How & why — decision by decision

**1. Passwords hashed with bcrypt before saving (`genSalt(10)` + `hash`).**
*Why:* We must never store plain-text passwords. bcrypt adds a random salt and is
deliberately slow, so even if the database leaks, the passwords are very hard to
crack. `10` salt rounds is the standard balance of safety vs. speed.

**2. JWT returned on register and login, signed with `JWT_SECRET`, expires in 7 days.**
*Why:* After logging in, the client needs a way to prove who it is on every later
request without sending the password each time. The token is signed so it can't be
forged, and the expiry limits the damage if a token is ever stolen.

**3. The token only stores the user's `id` (`jwt.sign({ id }, ...)`).**
*Why:* Keep the token small and avoid putting sensitive data in it. The middleware
later reads this id back out and the controllers use it to scope data to the owner.

**4. Login uses one generic "Invalid email or password" for both failures.**
*Why:* If we said "email not found" vs "wrong password", an attacker could learn
which emails have accounts. The same message for both leaks nothing. We also still
run bcrypt.compare logic carefully so the path is consistent.

**5. `authMiddleware.js` now verifies a real `Bearer <token>` and sets `req.user.id`.**
*Why:* This is the actual auth guard. It reads the `Authorization` header, verifies
the token signature + expiry, and rejects with `401` if missing/invalid. The Phase 2
placeholder (which let everyone through with a fixed id) is gone. The job routes did
not need to change — they already read `req.user.id`, which is now the real user.

**6. Rate limiting on the auth routes (`express-rate-limit`, 10 / 15 min per IP).**
*Why:* Login/register are the most brute-forced endpoints. Capping attempts per IP
slows password-guessing attacks. Only the auth routes are limited (they're the target).

**7. `helmet()` added as the first middleware.**
*Why:* It sets a bundle of safe HTTP security headers (CSP, HSTS, X-Frame-Options,
X-Content-Type-Options, etc.) with one line, protecting against common web attacks.
First in the chain so every response — even errors — gets the headers.

**8. `JWT_SECRET` is a long random string in `.env` (never committed).**
*Why:* Anyone who knows the secret can forge tokens, so it must be long, random, and
private. A real 64-char value lives in local `.env`; `.env.example` only shows a
placeholder.

### How it was verified (live, end-to-end)
- Register → returned a token.
- `GET /jobs` **without** a token → `401 Not authorized, no token`.
- `GET /jobs` **with** the token → `200`, and the brand-new user saw **0 jobs**
  (proof the middleware now scopes by the real user id from the JWT, not a placeholder).
- Login with the correct password → token; with a wrong password → `401`.
- Duplicate email register → `400`; password under 6 chars → `400` validation error.
- Confirmed `helmet` security headers present on responses.
- Created a job with a token → it was owned by that user's real `_id`.

### Done this phase
- ✅ Register/login, bcrypt hashing, JWT, real auth guard, rate limiting, and helmet.
- Commit: `feat: implement JWT auth and API security`.

---

## Phase 4 — React dashboard with Kanban board

**Goal:** Build the whole front end: login/register, a protected dashboard, and a
Kanban board where the user adds, edits, moves, and deletes job applications.

### What was built

| Area | Files |
|------|-------|
| Styling | Tailwind v3 (`tailwind.config.js`, `postcss.config.js`, `src/index.css`) configured with the brand "Spaceship" palette + Outfit/JetBrains Mono fonts. |
| App shell | `main.jsx` (BrowserRouter + AuthProvider), `App.jsx` (routes + redirects), `index.html` (fonts, favicon). |
| Auth state | `context/AuthContext.jsx` (Context API), `api/axios.js` (JWT request + 401 response interceptors). |
| Pages | `pages/Login.jsx`, `pages/Register.jsx`, `pages/Dashboard.jsx`. |
| Components | `Logo`, `Navbar`, `AuthLayout`, `ProtectedRoute`, `StatsBar`, `KanbanBoard`, `KanbanColumn`, `JobCard`, `AddJobModal`, `ConfirmDialog`, `icons` (inline SVG). |
| Shared | `constants/jobStatus.js` (the 5 stages + their colours, defined once). |

### How & why — decision by decision

**1. Styling with Tailwind, configured around the brand palette.**
*Why:* The palette ("Spaceship") and logo colours live in `tailwind.config.js` as
named colours (ateneo blue, buckthorn amber, coral, etc.), so every screen stays
on-brand and a colour changes in one place. Components are still written by hand
(no UI library) so they remain explainable.

**2. Context API for auth (not Redux).**
*Why:* The whole app only needs to share one thing globally — the logged-in user.
`AuthContext` exposes `user`, `login`, `register`, `logout`. A custom `useAuth()`
hook keeps components tidy. The token + user are mirrored into `localStorage` so a
refresh keeps you logged in.

**3. Two axios interceptors.**
*Why:* A request interceptor attaches the JWT to every call automatically. A
response interceptor catches `401` (expired/invalid token), clears the session,
and bounces the user to login — except on the auth routes themselves, where a 401
just means "wrong password" and is shown inline.

**4. Protected + public-only routes.**
*Why:* `ProtectedRoute` redirects logged-out users away from the dashboard;
`PublicOnly` redirects logged-in users away from login/register. The backend still
enforces auth independently on every API call — the front-end guard is just UX.

**5. One source of truth for the statuses (`constants/jobStatus.js`).**
*Why:* The board columns, the stats strip, the card badges, and the add/edit form
all read the same five stages and their colours. The values match the backend
`status` enum exactly, so the UI can never drift from the database.

**6. The Dashboard owns all the data; children are presentational.**
*Why:* `Dashboard` holds the `jobs` array and the CRUD handlers, then passes slices
+ callbacks down to the board. One source of truth means the stats, columns, and
cards never disagree. `useMemo` powers the search filter without re-filtering on
every render.

**7. Kanban moves use native HTML5 drag-and-drop (no library).**
*Why:* Cards are `draggable`; columns are drop targets. On drop, the column tells
the dashboard to change that job's status. Moves are **optimistic** — the UI
updates instantly, then saves; if the save fails it rolls back and shows a toast.
A status dropdown on each card does the same move for touch devices.

**8. Full set of UI states (loading / empty / error).**
*Why:* Good apps handle more than the happy path. The board shows skeleton loaders
while fetching, a composed empty state when you have no jobs, a retryable error
state if the API is down, and per-column empty states that invite adding a card.

**9. Add/edit in one modal; delete behind a confirm dialog.**
*Why:* `AddJobModal` handles both creating and editing (driven by an `editingJob`
prop) with client-side validation that mirrors the backend rules. Destructive
deletes go through `ConfirmDialog` so nothing is removed by accident.

### How it was verified (live, with screenshots)
- Ran the backend + the Vite dev server together.
- Captured the **login** and **register** pages: split-screen brand panel renders,
  forms validate, show/hide password works.
- Registered a demo user via the API, created six sample jobs across all five
  stages, then loaded the **dashboard** with a real session: the navbar, stats
  strip (Total 6 + per-stage counts), and all five Kanban columns rendered the
  cards correctly with dates, posting links, notes, and the move dropdown.
- `npm run build` compiles cleanly (103 modules, no errors).

### Follow-up - auth hardening (found while testing)
Testing surfaced that a token kept working after its account was deleted (the
"still logged in after clearing the DB" problem). We hardened auth:
- the middleware now looks the user up after verifying the token and rejects the
  request if the user no longer exists;
- added `GET /api/auth/me` (protected) so the client can validate a saved session;
- the frontend `AuthContext` calls `/auth/me` on startup and logs out a stale
  session instead of trusting `localStorage` blindly.
Full write-up in `failures-and-fixes.md` (Failure #3); tests in `testing-log.md`
(F.1a-F.1e). We also confirmed duplicate names are allowed on purpose (email is the
unique identity), so no change there.

### Done this phase
- ✅ Full React front end: auth pages, protected dashboard, Kanban CRUD, brand styling.
- ✅ Auth hardened so deleted/cleared accounts are logged out.
- Commit: `feat: complete React dashboard with Kanban board`.

---

## Phase 5 - AI resume matcher (OpenRouter)

**Goal:** Let the user upload their resume once (saved on their profile), then
score it against any job's description with an AI model, showing a 0-100 match
score, the skills they're missing, and a short summary.

### What was built

| Area | Files |
|------|-------|
| Resume storage | `User.resume` + `resumeUpdatedAt`; `controllers/userController.js` + `routes/userRoutes.js` (multer + pdf-parse) |
| AI matcher | `controllers/aiController.js` + `routes/aiRoutes.js`; `Job.jobDescription`, `aiScore`, `missingSkills`, `aiSummary`, `aiScoredAt` |
| Wiring | `/api/users` + `/api/ai` mounted in `server.js`; resume status added to `/auth/me`, login, register |
| Frontend | `ResumeModal`, `AIMatcherModal` (score ring), navbar profile dropdown, `jobDescription` in `AddJobModal`, "Score" action on `JobCard`, AuthContext `updateUser` |

### How & why - decision by decision

**1. Resume uploaded as a PDF, stored as TEXT on the user.**
*Why:* The user picked PDF upload. We parse the PDF to plain text with `pdf-parse`
and store just the text on `User.resume` - no file is ever written to disk (multer
uses in-memory storage), so there's zero storage cost. The text is reused for every
job, so the user uploads once and can re-upload an updated CV any time.

**2. pdf-parse imported from its inner lib path + parsed with a retry.**
*Why:* `pdf-parse` is CommonJS and its package entry runs debug code that crashes
under ES modules, so we import `pdf-parse/lib/pdf-parse.js` directly. It also
occasionally throws a transient "bad XRef entry" on the first try, so we retry the
parse up to 3 times before giving up (see `failures-and-fixes.md`, Failure #4).

**3. The OpenRouter key lives only on the backend; we use FREE models.**
*Why:* The key must never reach the browser. We call OpenRouter from the server and
use `:free` models so the app costs nothing to run.

**4. A fallback LIST of free models, not one hard-coded model.**
*Why:* The free tier is flaky - any one model can be momentarily rate-limited (429)
or retired (404). So `OPENROUTER_MODEL` is a comma-separated list; we try each in
turn and use the first that answers. This made scoring reliable in testing.

**5. Strict-JSON prompt + defensive parsing.**
*Why:* We ask the model for a JSON object (`score`, `missingSkills`, `summary`) and
then pull the JSON out of the reply and clamp/validate every field, because models
sometimes wrap JSON in prose. Bad/empty replies return a clean error.

**6. Score is tied to a job and saved on it.**
*Why:* Each job carries its own `jobDescription`; scoring saves `aiScore`,
`missingSkills`, `aiSummary` on that job, so the card shows the badge and the result
persists. The matcher modal re-opens with the last result.

**7. Graceful guards.**
*Why:* No resume -> "upload your resume first"; no/short description -> ask for one;
rate-limited -> "the free tier is busy, try again"; timeout -> friendly message.

### How it was verified (live, with screenshots)
- Real OpenRouter call returned a sensible result: score **65**, missing skills
  `[Docker, AWS, TypeScript, GraphQL, CI/CD pipelines]`, and an accurate summary.
- Resume upload extracted text from a PDF and saved it; `/auth/me` then reported
  `hasResume: true`.
- Drove the real UI (puppeteer): the dashboard card shows the score badge, the AI
  matcher modal shows the score ring + summary + skill chips, and the resume modal
  shows "Resume on file" with a Replace button.
- `npm run build` compiles cleanly (105 modules).

### Done this phase
- ✅ Resume upload/storage + reusable AI matcher with score, missing skills, summary.
- Commit: `feat: add AI resume matcher with OpenRouter integration`.

---

<!-- Add the next phase/entry below this line using the same format. -->

---

## Phase 7 — AI Agent with Tool Calling (Steps 1–6)

**Goal:** Upgrade JobTracker from a single-shot AI call to a real multi-step AI agent.
Given a job description and the user's resume, the agent decides which of three tools
to call — cover letter drafter, interview prep generator, resume tailor — based on the
situation. All branching logic lives in the model's reasoning, not in application code.

### What was built

| File | What it does |
|------|--------------|
| `backend/tools/coverLetter.js` | `draftCoverLetter()` — tailored cover letter grounded in real resume |
| `backend/tools/interviewPrep.js` | `generateInterviewPrep()` — 10–15 interview questions with talking points |
| `backend/tools/resumeTailor.js` | `tailorResume()` — concrete edits to match the job, no fabrication |
| `backend/agent/toolSchemas.js` | OpenAI-format tool schemas for the 3 tools |
| `backend/agent/agentRunner.js` | `callAgentModel()` + `runAgent()` — the agent loop |
| `backend/routes/agentRoutes.js` | `POST /run` behind JWT auth |
| `backend/controllers/agentController.js` | Loads job + resume from DB, runs agent, returns result |
| `backend/tests/agent.test.js` | 5 automated tests with mocked LLM |

### How & why — decision by decision

**1. Tools built as plain functions first, agent loop second.**
*Why:* Each tool can be tested in isolation before the loop is written. If the loop
breaks, you know the tools themselves work. This is the Phase 7 build rule: don't
touch the agent loop until all three tools work independently.

**2. Tools reuse the existing `callOpenRouter` from `aiController.js`.**
*Why:* The model fallback list, timeout, and error handling already exist there. Adding
`export` to `callOpenRouter` was the only change needed — zero duplication.

**3. Agent has its own `callAgentModel` separate from `callOpenRouter`.**
*Why:* The agent call is fundamentally different — it passes `tools` and `tool_choice`
to the API and needs the full message object back (not just text) so the loop can read
`tool_calls`. The two functions serve different purposes.

**4. Tool schemas have no parameters.**
*Why:* The job description and resume are already in the agent's context window. The
LLM just names which tool to call; the runner supplies the data. Empty parameters keep
the schemas simple and avoid asking the model to pass data it already has.

**5. All branching logic lives in the model — no `if score < X` in the code.**
*Why:* This is the definition of a real agent vs. a fake pipeline. If you write
`if resume_matches: skip_tailor_tool`, YOU made the decision, not the LLM. The agent
was tested with a mismatched ML engineer JD and correctly decided to skip all tools
and warn the user — without any conditional in `agentRunner.js`.

**6. Hard step cap + graceful tool failure + step logging.**
*Why:* Free-tier models are unreliable. The step cap prevents infinite loops. Wrapping
each tool call in try/catch means one tool failing doesn't crash the whole agent run.
The `steps` array is returned in the response — it's the interview evidence of agent
reasoning.

**7. Provider fallback: primary → fallback model, same API key.**
*Why:* Both `meta-llama/llama-3.3-70b-instruct:free` and `openai/gpt-oss-120b:free`
are on OpenRouter. Same key, different model families = independent rate limits. When
the primary is rate-limited, the fallback has capacity.

**8. Honesty guardrail in every tool prompt.**
*Why:* The tools must only use information from the user's real resume. Every system
prompt explicitly states this. This is a non-negotiable design decision — fabricating
experience in a job application tool would be harmful.

**9. `global.fetch` mocked in tests — real LLM never called during `npm test`.**
*Why:* Real API calls in tests would consume rate-limited free-tier credits on every
CI run, add 30–60 seconds of latency, and make tests flaky. The mock proves the
routing and error handling work without touching the LLM.

### How it was verified
- Each tool tested in isolation via `test-tools.js` — cover letter returned correctly. ✅
- Agent loop tested via `test-agent.js`:
  - React Developer JD → all 3 tools called, all outputs returned. ✅
  - Senior ML Engineer JD → agent warned about gap, skipped all tools. ✅
- `POST /api/agent/run` tested live via curl — 200 with coverLetter, interviewPrep,
  steps (resumeTailor skipped by agent as resume already matched well). ✅
- `npm test` → 20/20 tests passing, all existing tests green. ✅

### Done this phase (Steps 1–6)
- ✅ 3 tool functions, tool schemas, agent loop, backend endpoint, 5 automated tests.
- Steps remaining: Step 7 (frontend modal + Run Assistant button), Step 8 (deploy + docs).

---

## Phase 7 (cont.) — Frontend & Refinements (Steps 7–7.5)

**Goal:** Put the agent in front of the user, then refine it based on real use.

### What was built

| File | What it does |
|------|--------------|
| `frontend/src/components/AgentResultsModal.jsx` | Modal that runs the agent and shows the three results in tabs, with loading / error / empty states, copy + download buttons, and a Re-run button |
| `frontend/src/components/JobCard.jsx` | "Run AI assistant" action + a low-match nudge button |
| `frontend/src/components/icons.jsx` | `BotIcon`, `DownloadIcon` |
| `KanbanBoard.jsx`, `KanbanColumn.jsx`, `StatsBar.jsx`, `Dashboard.jsx` | Thread the `onRunAgent` handler from the dashboard down to each card |
| `backend/models/Job.js` | `agentResults` subdocument — caches the agent output on the job |
| `backend/controllers/agentController.js` | Serves the cache, or runs the agent and saves it (`force: true` to refresh) |

### How & why — decision by decision

**1. Skipped tools now explain themselves (`NOT_NEEDED: <reason>`).**
*Why:* A blank "not needed" panel looked like a bug. Each tool prompt can now reply
`NOT_NEEDED: <reason>`, parsed into `{ content, reason }`, so the UI shows *why* the
agent skipped a step (e.g. "Your resume already covers this role's requirements").

**2. Agent results are cached on the job.**
*Why:* Re-opening a job shouldn't burn a rate-limited free-tier call every time. The
first run saves to `Job.agentResults`; later opens return instantly. A Re-run button
sends `force: true` to refresh after the job description changes.

**3. `max_tokens` is per-call, not a fixed 700.**
*Why:* 700 tokens truncated longer cover letters. Each tool now sets its own limit
(1500–2500). The free-model fallback list was widened to survive daily quota resets.

**4. The matcher score now reflects the WHOLE posting.**
*Why:* The original matcher scored skills (and skill-derived keywords) only — so a
fresh grad could score high on a role demanding "3+ years". The prompt now weighs
skills, **experience level**, education, domain keywords/responsibilities, and explicit
soft requirements together into one honest overall score. Experience gaps and missing
degrees can now appear in `missingSkills` too.

**5. Interview prep is rigorous and honest — no sugar-coating.**
*Why:* Prep that flatters the candidate doesn't prepare them. The coach now asks the
hard, probing questions a tough interviewer actually asks, targets gaps and shallow
experience, and names weak talking points plainly with what to fix. The "only real
resume content, never fabricate" guardrail stays.

**6. Small UX touches that connect the two AI features.**
*Why:* A job that scored low (<60) now shows a "Low match — get help applying →" nudge
that opens the agent, so the Phase 5 matcher and Phase 7 agent feel like one workflow.
The skipped-tool state uses a reassuring teal checkmark instead of an error look, and
each result can be downloaded as a `.txt` for pasting into application portals.

### How it was verified
- Drove the agent against real jobs in the DB: a "3 years required" role for a fresh
  grad correctly produced a cover letter and interview prep but the agent **declined**
  to tailor the resume — the intended honest behaviour. ✅
- `npm test` → 20/20 passing. ✅
- `npm run build` (frontend) compiles cleanly. ✅

### Done
- ✅ Frontend agent modal, result caching, NOT_NEEDED reasons, holistic matcher,
  rigorous interview prep, and the match-score → agent connection.
- Remaining: Step 8 — deploy (Railway + Vercel), demo.

---

## Phase 8 — Dashboard redesign + resume filename

**Goal:** Make the dashboard (the app's home) more attractive and lively, and remove a
small but real confusion: the UI said "Resume on file" without ever showing *which*
file the user uploaded.

### What was built

| File | What it does |
|------|--------------|
| `frontend/src/pages/Dashboard.jsx` | Animated ambient backdrop + time-aware hero greeting (gradient name, live date pill); refreshed empty/error states |
| `frontend/src/components/StatsBar.jsx` | Rebuilt as four KPI tiles (Total, In progress, Offers, Response rate) with count-up numbers and hover glow |
| `frontend/src/hooks/useCountUp.js` | rAF count-up hook that tweens old→new value (respects reduced-motion) |
| `frontend/src/components/KanbanColumn.jsx` | Frosted-glass columns; livelier drag-over |
| `frontend/tailwind.config.js`, `src/index.css` | New keyframes + `.aurora`/`.glass-card`/`.text-gradient`/`.shine-streak` utilities |
| `frontend/src/components/icons.jsx` | `TrendingUp`, `Trophy`, `Target` icons |
| `backend/models/User.js` | `resumeFileName` field |
| `backend/controllers/userController.js`, `authController.js` | Store the uploaded PDF's name; return it from upload, getResume, and the public user |
| `frontend/src/components/Navbar.jsx`, `ResumeModal.jsx` | Show the actual filename instead of "Resume on file" |

### How & why — decision by decision

**1. Lively, hand-built visuals — no animation library.**
*Why:* Rule 5 forbids animation libraries, so the ambient "aurora" backdrop, count-up
numbers, and sheen are pure CSS + a small rAF hook. All of it disables itself under
`prefers-reduced-motion`. The look is richer without adding a dependency.

**2. KPI tiles instead of a raw funnel.**
*Why:* The first funnel attempt read as rough/cluttered, so it was removed. Four
headline tiles (Total, In progress, Offers, Response rate) give an at-a-glance summary;
per-stage counts still live on each Kanban column header, so no information is lost.

**3. Store the resume's original filename.**
*Why:* "Resume on file" never told the user *which* CV was saved — confusing if they
have several. We now persist `User.resumeFileName` and surface it in the navbar and the
resume modal, falling back to "Resume on file" for resumes uploaded before this change.

### How it was verified
- `npm run build` (frontend) compiles cleanly. ✅
- `npm test` (backend) → 20/20 passing (no backend regressions from the resume field). ✅

### Done
- ✅ Redesigned dashboard + resume-by-filename. Commits `1f7f270`.

---

## Phase 8 (cont.) — Code audit & cleanup (Elite-engineer pass)

**Goal:** A safety-first audit and overhaul for cleanliness — delete dead code, remove
duplication, and harden error handling — without breaking anything.

### Phase 1 — Audit (read-only)
Two subagents scanned the backend and frontend and cross-verified every "dead code"
claim by grepping for references before flagging it safe to remove. Top findings: dead
Phase-7 agent artifacts, duplicate/dead Tailwind keyframes, triplicated helpers, and a
few error-handling gaps.

### Phase 2 — Clean & delete (verified safe)

| Removed | Why it was dead |
|---------|-----------------|
| `agent/toolSchemas.js` | The agent no longer does LLM tool-calling, so the schemas were unused |
| `test-agent.js`, `test-tools.js`, `spike.js`, `spike-fallback.js` | Leftover dev/spike scripts; nothing imported them (`spike.js` even hardcoded a model name — rule 7) |
| `steps` array in `agentRunner.js` | Built and returned but never stored, returned, or read — and the values were fake |
| `shimmer`/`float`/`aurora`/`shine`/`pop-in` keyframes in `tailwind.config.js` | No `animate-*` utility referenced them, so Tailwind never emitted them; the live versions are raw CSS in `index.css` |

The CSS bundle stayed byte-identical (33.85 kB) after removing the keyframes — proof
they were truly dead.

### Phase 3 — Refactor & document

**1. One source of truth for shared helpers (DRY).**
- `parseToolResponse` → `backend/tools/parseToolResponse.js` (was identical in all 3 tools)
- `readError` → `frontend/src/utils/readError.js` (was in 4 files; gained a `fallback` param)
- `formatDate`/`toDateInput` → `frontend/src/utils/date.js` (was in 3 files)
- Escape-key wiring → `frontend/src/hooks/useEscapeKey.js`, now used by all 5 modals

**2. Hardened error handling.**
- `agentController.js` — all DB calls moved inside `try/catch`; added the missing
  `if (!user)` null guard (clean 401 instead of a 500) and a file-header doc.
- `AgentResultsModal.jsx` — `clipboard.writeText` wrapped in try/catch with a visible
  "Failed" state instead of a silent unhandled rejection.

> Note on "strict type safety": this is plain JS, so we hardened with defensive guards
> rather than introducing TypeScript (a large breaking change, against the safety goal).

### How it was verified
- `npm test` → 20/20 passing after every step. ✅
- `npm run build` (frontend) clean; JS bundle shrank 268.1 → 267.2 kB from the dedup. ✅
- Grep confirmed each shared helper now has exactly one definition.

### Done
- ✅ Dead code removed, duplication consolidated, error handling hardened, tests green.
  Commit `3d0d738`. README brought current in commit `4491b92`.
