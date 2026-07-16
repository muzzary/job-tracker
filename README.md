# AI Job Application Tracker

A full-stack MERN app that helps job seekers **track applications on a Kanban board** and put a **free AI assistant** to work on every application — scoring resume fit, drafting cover letters, generating rigorous interview prep, and tailoring the resume to the role.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
[![CI](https://github.com/muzzary/job-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/muzzary/job-tracker/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/License-MIT-blue)

> **Live demo:** https://job-tracker-muzzary.vercel.app
> **API base:** https://job-tracker-production-3477.up.railway.app/api

---

## What this project set out to achieve

The goal was to go beyond a simple CRUD tracker and build something that actually
*helps* during a job hunt, while staying free to run and honest about the candidate:

1. **A clean place to track applications** end-to-end — from "saved" to "offer".
2. **AI that reflects the whole job, not just a keyword match** — so the score a
   candidate sees is trustworthy.
3. **AI that judges its own relevance** — each tool decides for itself whether it's
   useful for the application and explains why if it bows out, instead of always
   forcing three outputs.
4. **Total honesty** — no tool is ever allowed to invent experience the candidate
   doesn't have, and the interview coach is deliberately blunt about gaps.
5. **Zero per-token cost** — everything runs on OpenRouter's free models with a
   multi-model fallback so it stays reliable despite the free tier's flakiness.

## What's been built

- **Kanban board** — drag cards across five stages (Saved → Applied → Interview →
  Offer → Rejected), with optimistic updates and a per-card status dropdown for touch.
- **JWT auth** — register/login with bcrypt-hashed passwords; stale sessions are
  invalidated server-side (deleting an account revokes its tokens immediately).
- **AI resume matcher (holistic)** — upload your resume PDF once, add a job
  description to any card, and get a 0–100 match score, a list of unmet requirements,
  and an honest summary. The score weighs **skills, years/level of experience,
  education, domain keywords, and responsibilities** — so a strong-skills/low-experience
  candidate no longer scores misleadingly high.
- **AI assistant (three tools)** — one click runs three AI tools for the job at hand,
  each grounded only in the real resume and each free to bow out with a reason:
  - **Cover letter drafter** — tailored to the role, grounded only in the real resume.
  - **Interview prep generator** — 10–15 rigorous, no-sugar-coating questions that
    probe gaps, each with an honest talking point from the resume.
  - **Resume tailor** — concrete, specific edits to better match the job (and it will
    *decline* if the candidate isn't a fit, rather than fabricate).
- **Result caching** — agent output is saved on the job, so re-opening the assistant
  is instant; a **Re-run** button forces a fresh pass after the description changes.
- **"Not needed" with a reason** — when the agent skips a tool, it explains why
  instead of showing a blank panel.
- **Redesigned, lively dashboard** — animated ambient backdrop, a time-aware hero
  greeting, and KPI tiles (Total, In progress, Offers, Response rate) with count-up
  numbers — all hand-built with Tailwind + CSS (no UI or animation libraries).
- **Resume by name** — the dashboard shows the actual uploaded filename
  (e.g. `Muzzary_CV.pdf`) so it's always clear which resume is on file.
- **Download & copy** — any agent result can be copied or downloaded as a `.txt`.
- **Fully tested backend** — 20 Jest + Supertest tests covering every auth, job CRUD,
  and agent route, with the LLM mocked so tests never hit the real API.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite), React Router v6, Axios, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcryptjs |
| Security | express-validator, express-rate-limit, helmet |
| AI | OpenRouter (free LLM router, multi-model fallback) |
| Testing | Jest + Supertest |
| Deployment | Vercel (frontend), Railway (backend) |

## How the AI assistant works

Each of the three tools is a plain, independently testable function that makes its own
LLM call:

1. The job description and the user's resume are passed to all three tools, which run
   **in parallel**.
2. Each tool's prompt carries the honesty guardrail (never invent experience) and an
   escape hatch: if the tool isn't useful for this application, it returns
   `NOT_NEEDED: <reason>` instead of forced output. So the resume tailor will *decline*
   for a role the candidate can't honestly fill, and the UI shows that reason.
3. Each tool call is wrapped so one failure can't break the others, and a multi-model
   fallback rides out free-tier rate limits.
4. Results are cached on the job so re-opening the assistant is instant; **Re-run**
   forces a fresh pass.

> **Design note (an honest one):** an earlier version was a true tool-calling *agent* —
> a planning LLM that decided which tools to call via `tool_choice: "auto"`. On the free
> tier this added 50–150 s of latency and was unreliable (the planner sometimes returned
> no tool calls, leaving every result empty). The routing layer was removed in favour of
> running the tools in parallel; the per-tool `NOT_NEEDED` judgment preserves the
> "only do what's useful" behaviour without depending on a flaky planning step.

## API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Server alive check |
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Log in, returns JWT |
| GET | `/api/auth/me` | Yes | Validate saved session, returns current user |
| GET | `/api/jobs` | Yes | List the user's job applications |
| POST | `/api/jobs` | Yes | Create a job application |
| GET | `/api/jobs/:id` | Yes | Get a single job |
| PUT | `/api/jobs/:id` | Yes | Update a job |
| DELETE | `/api/jobs/:id` | Yes | Delete a job |
| POST | `/api/users/resume` | Yes | Upload resume PDF (parsed to text + filename, saved on profile) |
| GET | `/api/users/resume` | Yes | Fetch saved resume text + status |
| POST | `/api/ai/match` | Yes | Score saved resume against a job description |
| POST | `/api/agent/run` | Yes | Run the AI assistant for a job (`force: true` to bypass the cache) |

## Getting started

**Prerequisites:** Node.js 18+, a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, a free [OpenRouter](https://openrouter.ai) API key.

```bash
# 1. Clone
git clone https://github.com/muzzary/job-tracker.git
cd job-tracker

# 2. Backend
cd backend
npm install
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, OPENROUTER_API_KEY
npm run dev               # API on http://localhost:5000

# 3. Frontend (second terminal)
cd frontend
npm install
# create frontend/.env with: VITE_API_URL=http://localhost:5000/api
npm run dev               # app on http://localhost:5173
```

Visit `http://localhost:5000/api/health` to confirm the backend is up.

### Environment variables (backend `.env`)

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string used to sign JWTs |
| `OPENROUTER_API_KEY` | OpenRouter key (used by both the matcher and the assistant) |
| `CLIENT_URL` | Allowed CORS origin (the frontend URL) |
| `PORT` | *(optional)* backend port (defaults to 5000) |
| `OPENROUTER_MODEL` | *(optional)* comma-separated free models, tried in order |
| `MONGO_URI_TEST` | *(optional)* separate test DB; defaults to a `job-tracker-test` database |

## Running tests

```bash
cd backend
npm test
```

Runs 20 Jest + Supertest tests against a separate `job-tracker-test` database — real
data is never touched and the LLM is mocked, so no API credits are spent. All tests
should pass in ~30–45 s.

## Project structure

```
job-tracker/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # auth, jobs, users, AI matcher, agent
│   ├── agent/           # agentRunner (runs the tools in parallel) + tool schemas
│   ├── tools/           # cover letter, interview prep, resume tailor
│   ├── middleware/      # JWT guard
│   ├── models/          # User, Job schemas
│   ├── routes/          # Express routers
│   └── tests/           # Jest + Supertest suites
└── frontend/
    └── src/
        ├── api/         # Axios instance + interceptors
        ├── context/     # Global auth state
        ├── hooks/       # useCountUp, useBodyScrollLock
        ├── pages/       # Login, Register, Dashboard
        └── components/  # Navbar, KanbanBoard, modals, AgentResultsModal, etc.
```

## Security & honesty decisions worth noting

- **API key never reaches the browser** — OpenRouter is called from the backend only.
- **No fabricated experience** — every tool prompt forbids inventing skills or
  experience the candidate doesn't have; the resume tailor declines rather than lie.
- **Rate limiting** — auth endpoints cap at 10 requests per 15 minutes.
- **Input validation** — every route validates and sanitizes bodies with
  express-validator before touching the database.
- **Stale session invalidation** — the auth middleware re-checks the user on every
  request, so deleting an account immediately revokes all outstanding tokens.
- **Ownership scoping** — every job query is filtered by the authenticated user id
  (taken from the token, never the body), so users can't read or edit each other's data.
- **Helmet** — HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) on every response.

## What I learned

Building this end-to-end taught me how a real MERN app is wired together: the JWT auth
flow (sign on login → attach on every request → verify in middleware), bcrypt hashing,
Mongoose schema design with cross-collection references, React Context for global state,
and Axios interceptors for token expiry. The AI work was the biggest leap: I first built
a true **tool-calling agent** (a planning LLM choosing tools via `tool_choice: "auto"`),
then learned the hard way that a flaky free tier made it slow and unreliable — so I
re-architected it into parallel tools that each judge their own relevance with a
`NOT_NEEDED` escape hatch. That trade-off (ideal design vs. what's reliable on free
infrastructure) was a real engineering lesson. Making the matcher score the *whole*
posting (not just skills) and caching results taught me to think about trustworthiness
and cost, not just "does it return something." Writing Jest + Supertest tests with the
LLM mocked made the auth, ownership, and assistant code genuinely trustworthy. And
deploying frontend and backend to two separate services, wired
together with environment-specific CORS, showed me the gap between "works locally" and
"works in production."

## License

Released under the [MIT License](LICENSE).
