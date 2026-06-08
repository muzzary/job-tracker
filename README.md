# AI Job Application Tracker

A full-stack MERN web app that helps job seekers track applications on a Kanban board and uses a free LLM to score how well a resume matches a given job description.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-15%20passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

> **Live demo:** https://project-pgt9k.vercel.app
> **API base:** https://job-tracker-production-3477.up.railway.app/api

---

## Features

- **Kanban board** — drag cards across five stages: Saved → Applied → Interview → Offer → Rejected
- **JWT auth** — register/login with bcrypt-hashed passwords; stale sessions invalidated server-side
- **AI resume matcher** — upload your resume PDF once, paste a job description on any card, and get a 0–100 match score plus a list of missing skills
- **Fully tested backend** — 15 Jest + Supertest tests covering every auth and job CRUD route

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite), React Router v6, Axios, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcryptjs |
| Security | express-validator, express-rate-limit, helmet |
| AI | OpenRouter (free LLM router — no per-token cost) |
| Testing | Jest + Supertest |
| Deployment | Vercel (frontend), Railway (backend) |

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
| POST | `/api/users/resume` | Yes | Upload resume PDF (parsed to text, saved on profile) |
| GET | `/api/users/resume` | Yes | Fetch saved resume text + status |
| POST | `/api/ai/match` | Yes | Score saved resume against a job description |

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

## Running tests

```bash
cd backend
npm test
```

Runs 15 Jest + Supertest tests against a separate `job-tracker-test` database — real data is never touched. All tests should pass in ~20 s.

## Project structure

```
job-tracker/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # auth, jobs, users, AI
│   ├── middleware/       # JWT guard
│   ├── models/          # User, Job schemas
│   ├── routes/          # Express routers
│   └── tests/           # Jest + Supertest suites
└── frontend/
    └── src/
        ├── api/         # Axios instance + interceptors
        ├── context/     # Global auth state
        ├── pages/       # Login, Register, Dashboard
        └── components/  # Navbar, KanbanBoard, modals, etc.
```

## Security decisions worth noting

- **API key never reaches the browser** — OpenRouter is called from the backend only; the frontend never sees the key.
- **Rate limiting** — auth endpoints cap at 10 requests per 15 minutes to slow brute-force attempts.
- **Input validation** — every route validates and sanitizes request bodies with express-validator before touching the database.
- **Stale session invalidation** — the auth middleware looks up the user on every request, so deleting an account immediately revokes all outstanding tokens.
- **Helmet** — HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) on every response.

## What I learned

Building this end-to-end taught me how a real MERN app is wired together: JWT auth flow (sign on login → attach in every request → verify in middleware), bcrypt password hashing, Mongoose schema design with cross-collection references, React Context API for global state, and Axios interceptors for handling token expiry. The AI integration forced me to think about backend-only secrets management, prompt engineering, and graceful fallback when a free-tier model is rate-limited. Writing Jest + Supertest tests made the JWT middleware, ownership scoping, and rate-limiting code genuinely trustworthy rather than just hoped-to-work. Deploying to two separate services (Render + Vercel) and wiring them together with environment-specific CORS gave me hands-on experience with the gap between "it works locally" and "it works in production."

## License

MIT
