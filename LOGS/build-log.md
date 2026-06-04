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

<!-- Add the next phase/entry below this line using the same format. -->
