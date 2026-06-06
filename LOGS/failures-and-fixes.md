# Failures & Fixes Log

A public record of every error/failure hit during development, what caused it, and
how it was fixed. Kept honest so the debugging process is part of the project story.

Format for every entry:
- **What happened** — the error/symptom
- **Why it happened** — the root cause
- **How we fixed it** — the actual fix that worked
- **Lesson** — the one-line takeaway

---

## Failure #1 — MongoDB `querySrv ECONNREFUSED`

- **Phase:** 2 (Job CRUD API + MongoDB)
- **What happened:**
  When booting the backend (`node server.js`), the server started fine but the
  database connection failed with:
  ```
  MongoDB connection failed: querySrv ECONNREFUSED _mongodb._tcp.<cluster-host>
  ```
- **Why it happened (root cause, confirmed by step-by-step diagnosis):**
  The `mongodb+srv://` connection string does NOT hold server addresses directly.
  Instead the driver must make TWO special DNS lookups at connect time:
  1. an **SRV** record — to discover the cluster's shard hostnames, and
  2. a **TXT** record — to read connection options (replica-set name, authSource).

  We diagnosed it in layers:
  - First the Node app's resolver was configured with only `127.0.0.1` as its DNS
    server (`dns.getServers()` returned `['127.0.0.1']`), where nothing was
    listening → every lookup was refused → `querySrv ECONNREFUSED`. The OS resolver
    worked fine, but Node uses its own resolver (c-ares) for SRV/TXT, not the OS one.
  - Pointing Node at public DNS (`8.8.8.8`) fixed the **SRV** lookup, but the
    **TXT** lookup still failed (`queryTxt ETIMEOUT`) — this network silently
    blocks/drops the TXT DNS query the `+srv` form needs.
  So the `mongodb+srv://` form simply cannot work on this network.
- **How we fixed it:**
  Switched from the SRV form to the **standard `mongodb://` connection string** that
  lists the shard hosts directly, so NO SRV/TXT DNS lookup is needed (the driver
  connects to the hosts via the normal OS resolver, which works). Shape:
  ```
  mongodb://<user>:<pass>@<shard-00>:27017,<shard-01>:27017,<shard-02>:27017/jobtracker?ssl=true&replicaSet=<name>&authSource=admin&retryWrites=true&w=majority
  ```
  Result: connected in ~3 seconds, and a full create/list/update/delete CRUD test
  against the live database passed. The `+srv` form is kept (commented) in
  `.env.example` as the preferred default for normal networks / production (Render).
- **Lesson:**
  `mongodb+srv://` needs working SRV **and** TXT DNS lookups; if a network blocks
  them, use the standard `mongodb://` string that lists the shard hosts directly —
  same database, no special DNS required.

---

## Failure #2 — Real MongoDB credentials committed to `.env.example`

- **Phase:** 2 (during the commit/push step)
- **What happened:**
  The Phase 2 commit accidentally included real MongoDB username/password inside
  `backend/.env.example` (a tracked file), and it was pushed to a public GitHub repo.
  The example file is supposed to contain only placeholders.
- **Why it happened:**
  The working copy of `.env.example` had been edited to hold a real connection
  string for convenience, and a broad `git add -A` swept that change into the commit.
  `.env` itself was correctly ignored — but `.env.example` is tracked on purpose, so
  nothing stopped the real values from going in.
- **How we fixed it:**
  1. Replaced all real values in `.env.example` with `<placeholders>`.
  2. Rewrote the single offending commit so the secret no longer appears in the
     repo's branch history, then force-pushed.
  3. **Rotated the database password in Atlas** — because the secret had been public,
     it must be treated as compromised; rewriting history alone is not enough.
- **Lesson:**
  `.example` files are committed, so they must never contain real secrets. Treat any
  secret that reached a remote as burned and rotate it — scrubbing the file or the
  history does not un-expose what was already public.

---

## Failure #3 - Stale session: still "logged in" after the account was deleted

- **Phase:** 4 (found while manually testing the dashboard)
- **What happened:**
  After we cleared the database, refreshing the app still showed the user as
  logged in, and API calls still succeeded. A token belonging to a user that no
  longer existed kept working.
- **Why it happened:**
  Two layers both trusted the token too much:
  1. **Backend:** the auth middleware called `jwt.verify()`, which only checks the
     token's signature and expiry - it never checked whether that user still
     exists. So `GET /jobs` returned `200 []` even for a deleted user.
  2. **Frontend:** `AuthContext` seeded the user from `localStorage` on startup and
     never re-validated it with the server, so a refresh always looked logged in.
  This is normal for stateless JWTs, but for this app we want a deleted/cleared
  account to be logged out promptly.
- **How we fixed it:**
  1. The middleware now looks the user up after verifying the token; if the user
     is gone it returns `401` ("user no longer exists").
  2. Added a `GET /api/auth/me` endpoint (protected, not rate-limited).
  3. The frontend calls `/auth/me` once on startup; if it fails it clears the
     saved token/user and drops the person back to the login page.
  Re-tested: a token for a deleted user now returns `401` on both `/jobs` and
  `/auth/me` (see `testing-log.md`, F.1a-F.1e).
- **Lesson:**
  A JWT only proves a token was once issued and hasn't expired - it does NOT prove
  the account still exists. If "deleted user must be logged out" matters, verify
  the user against the database (or keep a token denylist), and have the client
  re-validate its saved session on startup instead of blindly trusting storage.

---

## Failure #4 - pdf-parse "bad XRef entry" (transient, nondeterministic)

- **Phase:** 5 (resume upload)
- **What happened:**
  Uploading a resume PDF sometimes returned "Could not read that PDF" even though
  the exact same file had parsed fine moments earlier.
- **Why it happened:**
  `pdf-parse` bundles a very old `pdf.js`. Parsing the same buffer was
  nondeterministic - in a 3-run test, run 1 threw `bad XRef entry` while runs 2 and
  3 succeeded. It's a quirk of that old library, not the PDF.
- **How we fixed it:**
  Wrapped the parse in a small retry (`extractPdfText`): try up to 3 times before
  giving up. A genuinely unreadable PDF still fails all 3 and returns a clear error;
  a transient failure rides through on the retry. (Also: import the inner
  `pdf-parse/lib/pdf-parse.js`, since the package entry crashes under ES modules.)
- **Lesson:**
  Some libraries are flaky in ways that have nothing to do with your input. When a
  parse is cheap and idempotent, a short retry is a pragmatic, honest fix.

## Failure #5 - OpenRouter free models 404 / 429

- **Phase:** 5 (AI matcher)
- **What happened:**
  The first AI match returned 429; a single hard-coded free model wasn't reliable.
  Probing several models showed a mix of `404 No endpoints` (retired ids) and
  `429 temporarily rate-limited upstream` (busy).
- **Why it happened:**
  OpenRouter's free models change over time and are rate-limited per provider. Any
  single `:free` model can be unavailable at a given moment.
- **How we fixed it:**
  `OPENROUTER_MODEL` is now a comma-separated LIST; the backend tries each model in
  order and uses the first that answers. We seeded it with models confirmed working
  from the live catalog. If every model is busy, the user gets a friendly "free tier
  is busy, try again" message.
- **Lesson:**
  Don't hard-code one external model; with a flaky free tier, a fallback list (and a
  graceful "try again" path) is far more reliable.

---

<!-- Add the next failure below this line using the same format. -->
