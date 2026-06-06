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

<!-- Add the next phase/entry below this line using the same format. -->
