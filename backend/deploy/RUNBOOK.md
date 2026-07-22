# Deploy runbook — Oracle Cloud Always Free

> **Parked for now** — OCI signup needs a card with enough available balance to clear a
> temporary authorization hold, which isn't available right now. The backend is deployed to
> Render in the meantime (see repo root `render.yaml`). Come back to this runbook once OCI
> signup can go through — nothing here goes stale, it's independent of the Render deploy.

Replaces the old Railway deployment. Phases are ordered riskiest-first: the network path
(DNS + firewall + HTTPS) is proven with a throwaway 502 response *before* the real app is ever
installed, so a failure at any point tells you immediately whether the problem is
infrastructure or app code — not a tangle of both. Each phase has one command that proves it
worked. Don't skip ahead if a phase's acceptance check doesn't pass.

---

## Phase 1 — Instance provisioned, SSH reachable

**Proves:** an OCI Always Free instance can actually be created within capacity/account limits.

1. Sign up at https://www.oracle.com/cloud/free/ (phone + card verification, no charges for
   Always Free resources). Pick a **Home Region** carefully — it's hard to change later, and
   Always Free Ampere capacity varies by region.

2. **Compute → Instances → Create Instance**
   - Name: `job-tracker-api`
   - Image and shape → Edit → **Canonical Ubuntu 22.04** (Standard)
   - Shape → Edit → **Ampere → VM.Standard.A1.Flex**, 1 OCPU / 6 GB memory.
     - If you get **"Out of host capacity"**, switch to **AMD → VM.Standard.E2.1.Micro**
       instead (smaller — 1/8 OCPU, 1 GB RAM — but reliably available, still Always Free).
   - Networking → **Create new virtual cloud network** (quick-create: public subnet + internet
     gateway + a default Security List with SSH already open).
   - Add SSH keys → **Generate a key pair for me** → download the private key (e.g.
     `oci-job-tracker.key`).
   - Boot volume: leave default. Click **Create**, wait ~1-2 min for state "Running".
   - Note the instance's **Public IP**.

**Acceptance:**
```
ssh -i /path/to/oci-job-tracker.key ubuntu@<public-ip>
whoami
```
Connects without error and prints `ubuntu`.

---

## Phase 2 — Network path reachable over HTTP (walking skeleton)

**Proves:** DuckDNS resolves to the instance, and OCI's security list *and* host-level
`iptables` both actually pass port 80 through — the riskiest, most opaque part of this whole
plan, proven here before any app code exists to confuse the picture.

1. **DuckDNS** — sign in at https://www.duckdns.org, add a subdomain (e.g.
   `jobtracker-muzzary` → `jobtracker-muzzary.duckdns.org`), and in the "current ip" box enter
   the OCI instance's public IP, then **update ip**.

2. **Open the VCN Security List** (Networking → Virtual Cloud Networks → your VCN → Security
   Lists → Default Security List → Add Ingress Rules):
   - Source `0.0.0.0/0`, TCP, destination port `80`
   - Source `0.0.0.0/0`, TCP, destination port `443`
   - (Optional hardening) restrict the existing port-22 rule to `<your-IP>/32` — note you'll
     need to reopen it before Phase 7's auto-deploy, since GitHub Actions' runner IPs aren't
     fixed.

3. **Fix the host firewall** — OCI's Ubuntu image ships local `iptables` rules that block
   80/443 even once the security list allows them:
   ```
   ssh -i /path/to/oci-job-tracker.key ubuntu@<public-ip>
   sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save    # if "command not found": sudo apt install -y iptables-persistent, then retry
   ```

4. **Install Nginx and enable the real conf now** (it points at `localhost:5000`, which isn't
   running yet — that's expected and is exactly what this phase tests):
   ```
   sudo apt update && sudo apt install -y nginx git
   git clone https://github.com/muzzary/job-tracker.git
   nano ~/job-tracker/backend/deploy/nginx/job-tracker-api.conf   # set server_name to your DuckDNS hostname
   sudo cp ~/job-tracker/backend/deploy/nginx/job-tracker-api.conf /etc/nginx/sites-available/job-tracker-api
   sudo ln -s /etc/nginx/sites-available/job-tracker-api /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```

**Acceptance:** from your own machine (not the server):
```
curl -i http://jobtracker-muzzary.duckdns.org/api/health
```
Returns **`502 Bad Gateway`** — not a timeout, not connection refused. 502 means DNS, the
security list, host `iptables`, and Nginx are all correctly wired; only the (expected-missing)
app is absent.

---

## Phase 3 — Free HTTPS proven (still walking skeleton)

**Proves:** Certbot can complete Let's Encrypt's domain validation through DuckDNS and
TLS-terminate on the same conf — independent of whether the app works.

```
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d jobtracker-muzzary.duckdns.org
```
Follow the prompts (email for renewal notices, agree to ToS). Certbot rewrites the enabled
conf to add the HTTPS block + HTTP→HTTPS redirect, and installs its own renewal timer.

**Acceptance:**
```
curl -i https://jobtracker-muzzary.duckdns.org/api/health
```
Returns **`502 Bad Gateway`** again — same as Phase 2, but now over valid HTTPS with no `-k`
flag needed. Still no app running; only the transport changed.

---

## Phase 4 — Real app connected to a real database

**Proves:** Node 20 + PM2 + the actual repo run on the box, and the already-proven proxy path
reaches them — using a real Atlas connection, not a placeholder.

**Why not a placeholder `MONGO_URI`:** `server.js` calls `connectDB()` without awaiting it, so
`app.listen()` binds the port immediately regardless of whether Mongo is up — but
`config/db.js` calls `process.exit(1)` if the connection fails. A bad `MONGO_URI` doesn't just
skip the DB, it kills the *whole process* (including the already-listening health endpoint)
within a few seconds. So this phase needs a working connection string from the start; only
`JWT_SECRET`/`OPENROUTER_API_KEY` can stay placeholders (nothing at startup touches those —
they're only read inside request handlers).

1. **MongoDB Atlas dashboard** → Network Access → Add IP Address → the OCI instance's public
   IP → Confirm. (An existing empty/fresh cluster is fine — no real data needed yet.)

2. Install Node/PM2, install deps, write `.env`:
   ```
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   node -v    # sanity check — expect v20.x

   cd ~/job-tracker/backend
   npm ci --omit=dev
   nano .env
   ```
   ```
   PORT=5000
   MONGO_URI=<your real Atlas connection string>
   JWT_SECRET=placeholder-replace-in-phase-5
   OPENROUTER_API_KEY=placeholder
   CLIENT_URL=http://localhost:5173
   ```
   Start it:
   ```
   pm2 start server.js --name job-tracker-api
   pm2 save
   pm2 startup    # copy-paste and run the sudo command it prints
   ```

**Acceptance:**
```
curl https://jobtracker-muzzary.duckdns.org/api/health
pm2 status
```
`curl` returns the real `{"status":"ok","message":"Job Tracker API is running"}` JSON, **and**
`pm2 status` shows `job-tracker-api` as `online` with a stable (not climbing) restart count —
check again ~10 seconds later. A climbing restart count means Mongo isn't actually connecting
and the process is crash-looping even if a lucky curl caught it mid-cycle.

---

## Phase 5 — Real secrets, real request

**Proves:** the app can sign a real JWT and complete a real request end-to-end using real
production secrets.

```
nano ~/job-tracker/backend/.env
```
Fill in the remaining real values:
```
JWT_SECRET=<long random string>
OPENROUTER_API_KEY=<your key>
OPENROUTER_MODEL=google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free,openai/gpt-oss-20b:free,nvidia/nemotron-3-nano-30b-a3b:free,nvidia/nemotron-nano-9b-v2:free
OPENROUTER_FALLBACK_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
AGENT_MAX_STEPS=10
CLIENT_URL=<your live Vercel frontend URL — confirm the real one in the Vercel dashboard;
README and CLAUDE.md currently disagree, so treat the dashboard as the source of truth>
```
```
pm2 restart job-tracker-api
```

**Acceptance:**
```
curl -X POST https://jobtracker-muzzary.duckdns.org/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"testpass123"}'
```
Returns a 201 with a JWT, and the user document appears in the Atlas collection.

---

## Phase 6 — Frontend wired end-to-end

**Proves:** the real Vercel-hosted React app (not curl) can use this backend with no
CORS/mixed-content issues.

**Vercel dashboard** → job-tracker frontend project → Settings → Environment Variables → set
`VITE_API_URL=https://jobtracker-muzzary.duckdns.org/api` → trigger a redeploy.

**Acceptance:** open the live Vercel URL, log in, create a job, run the AI matcher — completes
with a visible score, zero errors in the browser console.

---

## Phase 7 — Auto-deploy on push

**Proves:** a code change reaches production without a manual SSH session.
Come back to this once Phase 6 passes — it's a repo change (`.github/workflows/ci.yml`), not a
runbook step, and needs the server's SSH details as GitHub Actions secrets.

**Acceptance:** push a trivial commit to `main`, the `deploy` job goes green in GitHub Actions,
and `pm2 status` on the server shows a fresh uptime for `job-tracker-api`.

---

## Phase 8 — Docs reflect reality

**Acceptance:** `README.md`'s live-URL line matches the URL that just passed Phase 6/7, and
`LOGS/build-log.md` has an entry for the Railway → Oracle Cloud migration.
