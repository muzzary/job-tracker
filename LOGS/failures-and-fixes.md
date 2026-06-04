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

<!-- Add the next failure below this line using the same format. -->
