# AI Job Application Tracker

A full-stack MERN web app that helps job seekers track applications on a Kanban board and uses a free LLM to score how well a resume matches a given job description.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

> **Live demo:** _coming soon (Vercel URL after Phase 6)_
> **API base:** _coming soon (Render URL after Phase 6)_

---

## What it does

- **Track applications** on a Kanban board (Applied / Interviewing / Offer / Rejected)
- **Secure accounts** with JWT authentication and bcrypt-hashed passwords
- **AI resume matcher** — paste a job description and get a 0–100 match score plus a list of missing keywords
- **Dashboard analytics** — total applications, response rate, and pipeline breakdown

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (Vite), React Router, Axios |
| Backend | Node.js, Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT, bcryptjs |
| AI | OpenRouter (free LLM router) |
| Deployment | Vercel (frontend), Render (backend) |

## API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Log in, returns JWT |
| GET | `/api/jobs` | Yes | List the user's job applications |
| POST | `/api/jobs` | Yes | Create a job application |
| GET | `/api/jobs/:id` | Yes | Get a single job |
| PUT | `/api/jobs/:id` | Yes | Update a job |
| DELETE | `/api/jobs/:id` | Yes | Delete a job |
| POST | `/api/ai/match` | Yes | Score resume vs job description |
| GET | `/api/stats` | Yes | Dashboard analytics |

## Getting started

**Prerequisites:** Node.js 18+, a free MongoDB Atlas cluster, and a free OpenRouter API key.

```bash
# 1. Clone
git clone https://github.com/<your-username>/job-tracker.git
cd job-tracker

# 2. Backend
cd backend
npm install
cp .env.example .env      # then fill in your values
npm run dev               # starts API on http://localhost:5000

# 3. Frontend (in a second terminal)
cd frontend
npm install
cp .env.example .env      # then fill in your values
npm run dev               # starts app on http://localhost:5173
```

Open `http://localhost:5000/api/health` to confirm the backend is running.

## Project structure

```
job-tracker/
├── backend/      Express API (routes, controllers, models, middleware)
└── frontend/     React app (pages, components, context, api)
```

## What I learned

_(Fill this in as you build — a short, honest paragraph on the concepts you picked up: REST design, JWT auth flow, React state management, external API integration, and deployment. This section is what makes a portfolio repo stand out.)_

## License

MIT
