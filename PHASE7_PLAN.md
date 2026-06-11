# Phase 7 — AI Agent Upgrade: Step-by-Step Build Plan

## Status
- [x] Spike confirmed: `meta-llama/llama-3.3-70b-instruct:free` → PASS
- [x] Spike confirmed: `openai/gpt-oss-120b:free` → PASS
- [x] Gemini fallback abandoned (free tier unavailable in Pakistan)
- [x] CLAUDE.md updated with Phase 7 architecture
- [ ] Step 1 — Plain tool functions
- [ ] Step 2 — Tool schemas
- [ ] Step 3 — Agent loop
- [ ] Step 4 — Reliability
- [ ] Step 5 — Backend wiring
- [ ] Step 6 — Tests
- [ ] Step 7 — Frontend
- [ ] Step 8 — Deploy + docs

---

## Confirmed Architecture

| Role | Model | Provider |
|------|-------|----------|
| Primary | `meta-llama/llama-3.3-70b-instruct:free` | OpenRouter |
| Fallback | `openai/gpt-oss-120b:free` | OpenRouter |

Same `OPENROUTER_API_KEY` for both. No second provider needed.

**New env vars to add to `backend/.env`:**
```
AGENT_MODELS=meta-llama/llama-3.3-70b-instruct:free,openai/gpt-oss-120b:free
AGENT_MAX_STEPS=10
```

---

## New Files to Create

```
backend/
├── tools/
│   ├── coverLetter.js        ← Step 1
│   ├── interviewPrep.js      ← Step 1
│   └── resumeTailor.js       ← Step 1
├── agent/
│   ├── toolSchemas.js        ← Step 2
│   └── agentRunner.js        ← Step 3
├── routes/agentRoutes.js     ← Step 5
├── controllers/agentController.js ← Step 5
└── tests/agent.test.js       ← Step 6

frontend/src/components/AgentResultsModal.jsx ← Step 7
```

## Files to Modify

| File | Change |
|------|--------|
| `backend/controllers/aiController.js` | Add `export` to `callOpenRouter` — tools reuse it |
| `backend/app.js` | +2 lines: import + mount agentRoutes at `/api/agent` |
| `frontend/src/components/JobCard.jsx` | Add "Run Assistant" button + `onRunAgent` prop |
| `frontend/src/components/KanbanColumn.jsx` | Thread `onRunAgent` prop |
| `frontend/src/components/KanbanBoard.jsx` | Thread `onRunAgent` prop |
| `frontend/src/pages/Dashboard.jsx` | Agent state + API call + render AgentResultsModal |

---

## Step 1 — Plain Tool Functions

**Do this first. Do not touch the agent loop until all 3 tools work in isolation.**

### Prerequisite
In `backend/controllers/aiController.js`, change:
```js
const callOpenRouter = async (messages) => {
```
to:
```js
export const callOpenRouter = async (messages) => {
```

### `backend/tools/coverLetter.js`
```javascript
import { callOpenRouter } from "../controllers/aiController.js";

export async function draftCoverLetter({ jobDescription, resumeText }) {
  const messages = [
    {
      role: "system",
      content:
        "You are a professional cover letter writer. You only use information from the " +
        "candidate's real resume — never invent experience, employers, or skills they do not have.",
    },
    {
      role: "user",
      content:
        `Write a tailored, professional cover letter for the job below.\n\n` +
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}\n\n` +
        `Return only the letter text, no commentary.`,
    },
  ];
  return callOpenRouter(messages);
}
```

### `backend/tools/interviewPrep.js`
```javascript
import { callOpenRouter } from "../controllers/aiController.js";

export async function generateInterviewPrep({ jobDescription, resumeText }) {
  const messages = [
    {
      role: "system",
      content:
        "You are an interview coach. You only use information from the candidate's real resume — " +
        "never invent experience or skills they do not have.",
    },
    {
      role: "user",
      content:
        `List 5–7 likely interview questions for the role below, then provide a 2–3 sentence ` +
        `talking point for each, drawn from the candidate's actual resume.\n\n` +
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}\n\n` +
        `Return as a numbered list. Format: Question → Talking Point.`,
    },
  ];
  return callOpenRouter(messages);
}
```

### `backend/tools/resumeTailor.js`
```javascript
import { callOpenRouter } from "../controllers/aiController.js";

export async function tailorResume({ jobDescription, resumeText }) {
  const messages = [
    {
      role: "system",
      content:
        "You are a resume editor. You only suggest edits to real content — never invent " +
        "experience, employers, or skills the candidate does not already have.",
    },
    {
      role: "user",
      content:
        `Suggest 5 concrete, specific edits to the resume below to better match the job.\n\n` +
        `For each edit: state which line/bullet to change and what to change it to.\n\n` +
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}\n\n` +
        `Return as a numbered list.`,
    },
  ];
  return callOpenRouter(messages);
}
```

### Manual test (create, run, delete)
Create `backend/test-tools.js` temporarily:
```javascript
import { draftCoverLetter } from "./tools/coverLetter.js";
const result = await draftCoverLetter({
  jobDescription: "React developer at Acme Corp. Must know React, Node.js, REST APIs.",
  resumeText: "Muzzary Babar. Skills: React, Node.js, MongoDB, Express. Built JobTracker app.",
});
console.log(result);
```
Run: `node test-tools.js` from `backend/`. Delete after confirmed working.

---

## Step 2 — Tool Schemas

### `backend/agent/toolSchemas.js`
```javascript
export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "draft_cover_letter",
      description:
        "Draft a tailored, professional cover letter for the specific job, " +
        "grounded in the candidate's real resume. Call when the goal requires a letter.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_interview_prep",
      description:
        "Produce likely interview questions for the role and suggested talking points " +
        "drawn from the candidate's actual background. Call when the goal requires interview preparation.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "tailor_resume",
      description:
        "Suggest concrete, specific edits to the resume to better match the job. " +
        "Call when there is a visible skills gap between the resume and the job.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];
```

No parameters on each tool — the agent already has job + resume in its context window.

---

## Step 3 — Agent Loop

### `backend/agent/agentRunner.js`

Two functions:

**`callAgentModel(messages, tools)`** — NEW, different from `callOpenRouter`:
- Passes `tools` and `tool_choice: "auto"` to the API
- Returns the full assistant **message object** (not just text), so the loop can read `tool_calls`
- Tries each model in `AGENT_MODELS` in order (same try/catch pattern as existing `callOpenRouter`)
- `max_tokens: 1000`

**`runAgent({ jobDescription, resumeText })`** — the loop:
```
for step 0..MAX_STEPS:
  message = callAgentModel(messages, TOOL_SCHEMAS)

  if no tool_calls → break (agent is done)

  push { role: "assistant", tool_calls } to messages

  for each toolCall:
    run the matching tool function
    store result in results.coverLetter / interviewPrep / resumeTailor
    push { role: "tool", tool_call_id, content: result } to messages
    log the step

return { coverLetter, interviewPrep, resumeTailor, steps }
```

**Agent system prompt:**
```
You are an AI job application assistant with access to three tools.
Given a job description and a resume, use the tools to help the candidate apply.
- For a normal application: call all three tools.
- If the resume already strongly matches the job: skip the resume tailor tool.
- If the resume is a very poor fit (completely different field): warn the user and skip all tools.
- Call each tool at most once. Stop when all necessary tools have been called.
Never fabricate experience, employers, or skills the candidate does not have.
```

**Manual test (create, run, delete):**
Create `backend/test-agent.js` — call `runAgent` with sample data, log the results + steps.

---

## Step 4 — Reliability (built into Step 3)

- **Step cap:** `for (let step = 0; step < MAX_STEPS; step++)` — never loops forever
- **Provider fallback:** `callAgentModel` tries primary then fallback model in a loop
- **Graceful tool failure:** wrap each tool call in try/catch — on failure, set result to
  `"[Tool failed — please try again]"` instead of crashing the whole agent
- **Step logging:** `steps` array returned in response — interview evidence of agent reasoning

---

## Step 5 — Backend Wiring

### `backend/routes/agentRoutes.js`
```javascript
import express from "express";
import { runAgentHandler } from "../controllers/agentController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.post("/run", runAgentHandler);
export default router;
```

### `backend/controllers/agentController.js`
```javascript
import Job from "../models/Job.js";
import User from "../models/User.js";
import { runAgent } from "../agent/agentRunner.js";

export const runAgentHandler = async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ message: "jobId is required" });

  const job = await Job.findOne({ _id: jobId, userId: req.user.id });
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (!job.jobDescription)
    return res.status(400).json({ message: "This job has no description. Add one first." });

  const user = await User.findById(req.user.id).select("resume");
  if (!user.resume)
    return res.status(400).json({ message: "No resume found. Upload your resume first." });

  try {
    const result = await runAgent({ jobDescription: job.jobDescription, resumeText: user.resume });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Agent failed" });
  }
};
```

### `backend/app.js` — add 2 lines
```javascript
import agentRoutes from "./routes/agentRoutes.js";   // after existing route imports
app.use("/api/agent", agentRoutes);                  // after app.use("/api/ai", aiRoutes)
```

---

## Step 6 — Tests

### `backend/tests/agent.test.js`
Follow `jobs.test.js` structure exactly (beforeAll/beforeEach/afterAll pattern).

**5 tests:**
1. Valid request → 200, body has `coverLetter`, `interviewPrep`, `resumeTailor`
2. No auth token → 401
3. Missing `jobId` → 400
4. Job with no `jobDescription` → 400
5. User with no resume → 400

**Mock pattern for test 1:**
```javascript
// In beforeEach, after creating job + uploading resume:
global.fetch = jest.fn()
  .mockResolvedValueOnce({   // Step 1: agent decides to call all 3 tools
    ok: true,
    json: () => Promise.resolve({
      choices: [{ message: { role: "assistant", content: null, tool_calls: [
        { id: "c1", type: "function", function: { name: "draft_cover_letter", arguments: "{}" } },
        { id: "c2", type: "function", function: { name: "generate_interview_prep", arguments: "{}" } },
        { id: "c3", type: "function", function: { name: "tailor_resume", arguments: "{}" } },
      ]}}]
    })
  })
  // Steps 2-4: each tool internally calls callOpenRouter (one fetch per tool)
  .mockResolvedValue({ ok: true, json: () => Promise.resolve({
    choices: [{ message: { role: "assistant", content: "mock output", tool_calls: null } }]
  })});
```

**Run all tests:** `cd backend && npm test` — must stay green before touching frontend.

---

## Step 7 — Frontend

### `frontend/src/components/AgentResultsModal.jsx` (new)
- Props: `job`, `onClose`
- State: `loading`, `results` (null | { coverLetter, interviewPrep, resumeTailor }), `error`, `activeTab`
- On mount: POST `/api/agent/run` with `{ jobId: job._id }`
- Loading: spinner + "Running your assistant…"
- Results: 3 tabs — Cover Letter / Interview Prep / Resume Tailor
- Each tab: scrollable text block + copy-to-clipboard button
- Error: message + retry button
- Copy structure from `AIMatcherModal.jsx` (same loading→results→error pattern)

### `frontend/src/components/JobCard.jsx`
- Add `onRunAgent` to function signature
- Add "Run Assistant" button in card actions (next to existing AI score button)
- `onClick={(e) => { e.stopPropagation(); onRunAgent(job); }}`

### Thread `onRunAgent` prop
- `KanbanColumn.jsx`: add to props, pass to `<JobCard onRunAgent={onRunAgent} />`
- `KanbanBoard.jsx`: add to props, pass to `<KanbanColumn onRunAgent={onRunAgent} />`

### `frontend/src/pages/Dashboard.jsx`
```javascript
// New state
const [agentJob, setAgentJob] = useState(null);

// Callback
const openAgent = (job) => setAgentJob(job);

// Pass to board
<KanbanBoard onRunAgent={openAgent} ... />

// Render modal
{agentJob && <AgentResultsModal job={agentJob} onClose={() => setAgentJob(null)} />}
```

---

## Step 8 — Deploy + Document

1. `cd backend && npm test` — all tests green
2. Push to Railway (backend) + Vercel (frontend)
3. Smoke test on live URL: open job card → "Run Assistant" → 3 outputs appear
4. Update `LOGS/build-log.md` — Phase 7 entry
5. Update `README.md` — add Phase 7 to features, note agent architecture
6. Record 2-min Loom demo

---

## New API Endpoint

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/agent/run` | JWT | `{ jobId }` | `{ coverLetter, interviewPrep, resumeTailor, steps }` |

**Errors:**
- 400: missing jobId / no job description / no resume
- 401: no/invalid token
- 404: job not found
- 429/503: LLM unavailable after all fallbacks

---

## Key Reuse Points

| Existing code | How Phase 7 uses it |
|---------------|-------------------|
| `callOpenRouter()` in `aiController.js` | All 3 tool functions call this — just add `export` |
| `protect()` middleware | Wire to agentRoutes unchanged — zero modifications |
| Error pattern `{ message: "..." }` with `.status` | agentController follows this exactly |
| `req.user.id` from protect | agentController uses to load Job + User |
| `Job.findOne({ _id, userId })` pattern | Copied from `matchResume` — ownership check |
| `User.findById().select("resume")` | Resume field is `resume` (not `resumeText`) |
| Dashboard modal state pattern | `agentJob` state mirrors existing `matcherJob` |
| `AIMatcherModal.jsx` structure | Copy for `AgentResultsModal.jsx` |
| `jobs.test.js` beforeAll/beforeEach/afterAll | Copy for `agent.test.js` |

---

## What This Achieves

| Skill | Demonstrated in |
|-------|----------------|
| AI agent loop (multi-step reasoning) | `agentRunner.js` |
| Tool calling / function calling | `toolSchemas.js` + `agentRunner.js` |
| Provider fallback (free-tier reliability) | `callAgentModel` primary + fallback |
| Prompt engineering × 4 | system prompt + 3 tool prompts |
| Honest AI guardrail | Every prompt — no fabricated experience |
| Full-stack agent integration | controller → route → frontend modal |
| Mocking LLM in tests | `agent.test.js` global.fetch mock |
| Step logging (interview evidence) | `steps` array in response |
