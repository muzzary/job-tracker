import dotenv from "dotenv";
import { draftCoverLetter } from "../tools/coverLetter.js";
import { generateInterviewPrep } from "../tools/interviewPrep.js";
import { tailorResume } from "../tools/resumeTailor.js";

dotenv.config();

const JOB_DESCRIPTION = `
Junior AI Engineer — TechFlow (Remote)

We are looking for a Junior AI Engineer to help build and ship AI-powered features
into our SaaS platform. You will work closely with the product and backend teams.

Responsibilities:
- Integrate LLM APIs (OpenAI, Anthropic, OpenRouter) into Node.js/Express services
- Build prompt pipelines and evaluate output quality
- Write clean, tested backend code (Jest)
- Collaborate on React frontend for AI feature UIs

Requirements:
- 1-2 years experience with Node.js and/or Python
- Familiarity with LLM APIs and prompt engineering
- Understanding of REST APIs and basic authentication (JWT)
- React or any modern frontend framework

Nice to have:
- MongoDB or similar NoSQL databases
- Experience deploying to Railway, Vercel, or similar platforms
`;

const RESUME = `
Muzzary Babar
BSCS Graduate — GCU Lahore

SKILLS
- JavaScript, Node.js, Express.js, React 18, Vite
- MongoDB, Mongoose
- REST API design, JWT authentication
- LLM integrations (OpenRouter, prompt engineering)
- Tailwind CSS, responsive UI
- Git, Railway, Vercel

PROJECTS
Job Tracker (MERN Stack Portfolio Project)
- Built a full-stack Kanban job application tracker with Drag & Drop
- Integrated AI cover letter, interview prep, and resume tailor tools via OpenRouter
- JWT auth, protected routes, resume upload, AI match scoring
- Deployed on Railway (backend) + Vercel (frontend)

EDUCATION
Bachelor of Science in Computer Science
Government College University, Lahore — 2024
`;

const input = { jobDescription: JOB_DESCRIPTION, resumeText: RESUME };

console.log("API key present:", !!process.env.OPENROUTER_API_KEY);
console.log("Running 3 tools in parallel...\n");
console.time("total");

const [cl, ip, rt] = await Promise.allSettled([
  draftCoverLetter(input),
  generateInterviewPrep(input),
  tailorResume(input),
]);

console.timeEnd("total");

for (const [label, result] of [["coverLetter", cl], ["interviewPrep", ip], ["resumeTailor", rt]]) {
  console.log(`\n=== ${label} ===`);
  if (result.status === "rejected") {
    console.log("THREW:", result.reason?.message ?? result.reason);
  } else {
    const { content, reason } = result.value ?? {};
    if (content) {
      console.log(content.slice(0, 500) + (content.length > 500 ? "\n...(truncated)" : ""));
    } else {
      console.log("NOT_NEEDED — reason:", reason ?? "(none returned)");
    }
  }
}
