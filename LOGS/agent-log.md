# Agent Log — Phase 7 Build Journal

A focused log for Phase 7 only: the AI agent upgrade. Records every step built,
every test run, every decision made, and every issue hit along the way.

---

## Overview

Phase 7 upgrades JobTracker from single-shot AI calls to a real multi-step AI agent.
Given a job description and the user's saved resume, the agent decides which of three
tools to call — cover letter drafter, interview prep generator, resume tailor — based
on the situation. All branching lives in the model's reasoning, not in your code.

| Role | Model | Provider |
|------|-------|----------|
| Primary | `meta-llama/llama-3.3-70b-instruct:free` | OpenRouter |
| Fallback | `openai/gpt-oss-120b:free` | OpenRouter |

Both share the same `OPENROUTER_API_KEY`. No second provider or second key needed.

**New env vars added to `backend/.env`:**
```
AGENT_MODELS=meta-llama/llama-3.3-70b-instruct:free,openai/gpt-oss-120b:free
AGENT_MAX_STEPS=10
```

---

## Step 1 — Plain Tool Functions (2026-06-12)

**Goal:** Build each tool as a plain, isolated function before touching the agent loop.

### What was built

| File | What it does |
|------|--------------|
| `backend/controllers/aiController.js` | Added `export` to `callOpenRouter` so tools can import it |
| `backend/tools/coverLetter.js` | `draftCoverLetter({ jobDescription, resumeText })` |
| `backend/tools/interviewPrep.js` | `generateInterviewPrep({ jobDescription, resumeText })` |
| `backend/tools/resumeTailor.js` | `tailorResume({ jobDescription, resumeText })` |

All three tools call the existing `callOpenRouter` from `aiController.js` — zero
duplication, the same model fallback list and error handling reused automatically.

### Honesty guardrail
Every tool's system prompt explicitly states:
- Cover letter: *"never invent experience, employers, or skills they do not have"*
- Interview prep: *"never invent experience or skills they do not have"*
- Resume tailor: *"never invent experience, employers, or skills the candidate does not already have"*

This is stated in every interview as a non-negotiable design decision.

### Manual test
Created `backend/test-tools.js` to call `draftCoverLetter` with sample data.

**Issue hit:** First run returned 503 "AI service unavailable."
**Root cause:** `dotenv.config()` only runs in `server.js`. The standalone test
script bypassed it entirely, so `OPENROUTER_API_KEY` was `undefined`.
**Fix:** Added `import dotenv from "dotenv"; dotenv.config();` at the top of the
test script.

**Result:** Cover letter returned — well structured, grounded in the sample resume. ✅

### User tweaks after Step 1
- `interviewPrep.js`: prompt changed from 5–7 questions to **10–15 questions**
- `resumeTailor.js`: prompt changed to *"Suggest necessary concrete, specific edits"*
  (added "necessary" to reduce noise)

---

## Step 2 — Tool Schemas (2026-06-12)

**Goal:** Define the three OpenAI-format tool schemas so the LLM knows what tools exist and when to call them.

### What was built

| File | What it does |
|------|--------------|
| `backend/agent/toolSchemas.js` | `TOOL_SCHEMAS` array — 3 tool definitions (name, description, parameters) |

### Key decision: no parameters on any tool
Each schema has `parameters: { type: "object", properties: {}, required: [] }` — empty.
The agent already has the job description and resume in its context window. The LLM
just names which tool to call; the runner supplies the data. This keeps the schemas
simple and avoids the model needing to pass data it already has.

---

## Step 3 — Agent Loop (2026-06-12)

**Goal:** Build the loop that sends a goal to the LLM, reads which tool it wants to
call, runs that tool, feeds the result back, and repeats until the agent is done.

### What was built

| File | What it does |
|------|--------------|
| `backend/agent/agentRunner.js` | `callAgentModel()` + `runAgent()` |

### Two functions

**`callAgentModel(messages, tools)`** — different from `callOpenRouter`:
- Passes `tools` and `tool_choice: "auto"` to the API
- Returns the full assistant **message object** (not just text) so the loop can
  read `tool_calls`
- Tries each model in `AGENT_MODELS` in order — same try/catch pattern as `callOpenRouter`
- `max_tokens: 1000`

**`runAgent({ jobDescription, resumeText })`** — the loop:
```
for step 0..MAX_STEPS:
  message = callAgentModel(messages, TOOL_SCHEMAS)
  if no tool_calls → break (agent decided it's done)
  push { role: "assistant", tool_calls } to messages
  for each toolCall:
    run matching tool function
    store result in results object
    push { role: "tool", tool_call_id, content } to messages
    log the step
return { coverLetter, interviewPrep, resumeTailor, steps }
```

### Reliability built in (Step 4 is part of Step 3)
- **Step cap:** `for (let step = 0; step < MAX_STEPS; step++)` — never loops forever
- **Provider fallback:** `callAgentModel` tries primary then fallback model
- **Graceful tool failure:** each tool call wrapped in try/catch — on failure, result
  set to `"[Tool failed — please try again]"` instead of crashing the whole agent
- **Step logging:** `steps` array returned in response — interview evidence of agent reasoning

### Manual test
Created `backend/test-agent.js` to call `runAgent` with sample data.

**Result — React Developer JD:**
```json
[
  { "step": 0, "action": "draft_cover_letter" },
  { "step": 1, "action": "generate_interview_prep" },
  { "step": 2, "action": "tailor_resume" },
  { "step": 3, "action": "done", "content": "..." }
]
```
All three outputs returned. ✅

**Result — Senior ML Engineer JD (mismatched field):**
Agent responded with a warning that the gap was too large and skipped all tools.

This confirmed the key design principle: **the branching logic lives in the model's
reasoning, not in your code.** There is not a single `if` statement in `agentRunner.js`
that decides which tools to call. That is what makes this a real agent.

### Question raised during testing
Muzzary asked: is the resume tailor inventing the "REST APIs" skill?

**Answer:** No. The resume listed `Express` — a framework whose entire purpose is
building REST APIs. The model correctly surfaced a skill that was already implied
by the existing experience and suggested adding it as a keyword. This is optimization,
not fabrication. The honesty guardrail is working as intended.

---

## Step 5 — Backend Wiring (2026-06-12)

**Goal:** Expose the agent as a real API endpoint behind JWT auth.

### What was built

| File | What it does |
|------|--------------|
| `backend/routes/agentRoutes.js` | `POST /run` route, `protect` middleware applied to all routes |
| `backend/controllers/agentController.js` | Loads job + resume from DB, calls `runAgent`, returns result |
| `backend/app.js` | +2 lines: import agentRoutes, mount at `/api/agent` |

### Guards in agentController
- No `jobId` in body → 400
- Job not found or belongs to another user → 404
- Job has no `jobDescription` → 400 "Add one first"
- User has no resume → 400 "Upload your resume first"

### Live endpoint test (via curl against local server)
Registered a test user, created a job with a description, injected a resume
directly into the DB (since PDF upload requires a real file), then called:
```
POST /api/agent/run
{ "jobId": "6a2bf46866fedc59e0c36c85" }
```

**Response:**
- `coverLetter` ✅ — full tailored letter
- `interviewPrep` ✅ — 15 questions with talking points
- `resumeTailor` — `null` (agent decided the resume already matched well, skipped tool)
- `steps` ✅ — `draft_cover_letter → generate_interview_prep → done`

Test data cleaned up from DB after confirmation. ✅

---

## Step 6 — Tests (2026-06-12)

**Goal:** 5 automated tests for the agent endpoint. Real LLM must not be called
during `npm test` — `global.fetch` is mocked.

### What was built

| File | What it does |
|------|--------------|
| `backend/tests/agent.test.js` | 5 tests covering success + all 4 error paths |

### Tests written

| # | Test | Expected |
|---|------|----------|
| 7.1 | Valid request — all 3 tools called | 200, body has `coverLetter`, `interviewPrep`, `resumeTailor`, `steps` |
| 7.2 | No auth token | 401 |
| 7.3 | Missing `jobId` | 400, message matches `/jobId/i` |
| 7.4 | Job has no description | 400, message matches `/description/i` |
| 7.5 | User has no resume | 400, message matches `/resume/i` |

### Mock pattern
`global.fetch` is mocked with `jest.fn()`:
- First call (agent decision): returns a message with all 3 tool_calls
- Subsequent calls (tool executions via `callOpenRouter`): return `"mock output"`

`jest` imported explicitly from `@jest/globals` because ESM mode does not auto-inject it.

### Issue hit
**Error:** `ReferenceError: jest is not defined`
**Root cause:** ESM mode (`--experimental-vm-modules`) does not inject `jest` as a
global automatically.
**Fix:** Added `import { jest } from "@jest/globals";` at the top of the test file.

### Final result
```
Test Suites: 3 passed, 3 total
Tests:       20 passed, 20 total
```
All existing 15 tests stayed green. 5 new agent tests passed. ✅

---

## Files created this phase

```
backend/
├── tools/
│   ├── coverLetter.js
│   ├── interviewPrep.js
│   └── resumeTailor.js
├── agent/
│   ├── toolSchemas.js
│   └── agentRunner.js
├── routes/agentRoutes.js
├── controllers/agentController.js
└── tests/agent.test.js
```

## Files modified this phase

| File | Change |
|------|--------|
| `backend/controllers/aiController.js` | Added `export` to `callOpenRouter` |
| `backend/app.js` | +2 lines: import + mount agentRoutes at `/api/agent` |

## Step 7 — Frontend (2026-06-13)

**Goal:** Give the agent a face — a "Run AI assistant" action on each job card that
opens a modal, runs the agent, and shows the three results in tabs.

### What was built

| File | What it does |
|------|--------------|
| `frontend/src/components/AgentResultsModal.jsx` | Modal: runs the agent, tabbed results (Cover Letter / Interview Prep / Resume Tailor), loading + error states, copy button |
| `frontend/src/components/JobCard.jsx` | Added the bot-icon "Run AI assistant" action |
| `frontend/src/components/icons.jsx` | Added `BotIcon` (and later `DownloadIcon`) |
| `frontend/src/components/KanbanBoard.jsx`, `KanbanColumn.jsx` | Thread the `onRunAgent` callback down to each card |
| `frontend/src/components/StatsBar.jsx`, `pages/Dashboard.jsx` | Own the modal state and the `onRunAgent` handler |

### How & why

**1. One modal, three tabs.** Each tab reads its own slice of the result. The first
tab that actually has content is auto-selected on open, so the user never lands on an
empty tab.

**2. Full UI states.** Loading (animated dots), error (retryable), and a per-tab empty
state for tools the agent chose to skip — matching the rest of the app's state handling.

---

## Step 7.5 — Refinements after live use (2026-06-14)

After driving the agent against real jobs in the database, several refinements followed.

### 1. "NOT_NEEDED" now carries a reason

**Problem:** When the agent skipped a tool, the UI just showed a blank "not needed"
placeholder with no explanation.
**Fix:** Each tool's system prompt now offers an escape hatch — `NOT_NEEDED: <reason>`.
A small `parseToolResponse()` helper in every tool splits that into
`{ content: null, reason }`. The result shape changed from a bare string to
`{ content, reason }` per tool, and `agentRunner.js` defaults every tool to
`{ content: null, reason: null }`.

### 2. Results cached on the job

**Problem:** Re-opening a job's assistant re-ran the agent every time — slow and
wasteful of rate-limited free-tier calls.
**Fix:** Added an `agentResults` subdocument on the `Job` model
(`coverLetter`, `interviewPrep`, `resumeTailor`, `generatedAt`). The controller serves
the cache instantly when present and only runs the agent when missing or when the
caller sends `force: true`. The modal got a **Re-run** button (sends `force: true`) and
a "Generated …" timestamp.

### 3. `max_tokens` made configurable

**Problem:** A hard-coded 700-token cap truncated longer cover letters.
**Fix:** `askModel` / `callOpenRouter` now take a `maxTokens` argument. Tools pass
1500 (cover letter, resume tailor) and 2500 (interview prep). The free-model fallback
list was also expanded to ride out daily quota exhaustion.

### 4. Three UX additions

- **Low-match nudge:** when a job's AI score is below 60, `JobCard` shows a
  "Low match — get help applying →" button that opens the agent — connecting the
  Phase 5 matcher to the Phase 7 agent so they feel like one workflow.
- **Reassuring "not needed" state:** replaced the generic placeholder with a teal
  checkmark and "You're already covered here" — visually distinct from an error.
- **Download as .txt:** each result tab can be downloaded as a text file
  (`Blob` + `URL.createObjectURL`), named like `cover-letter-acme-corp.txt`.

### 5. Matcher scores the whole posting, not just skills

**Problem:** The resume matcher scored on skills (and skill-derived keywords) only —
it ignored experience level, education, and domain requirements, so a fresh grad could
score high on a "3+ years" role.
**Fix:** `buildMessages` in `aiController.js` now instructs the model to weigh five
requirement categories — skills, **years/level of experience**, education/certs, domain
keywords/responsibilities, and explicit soft requirements — and fold them into one
overall score. A strong skills match with too little experience can no longer score
high. `missingSkills` may now surface experience gaps and missing degrees too.

### 6. Interview prep made rigorous and honest

**Problem:** The interview prep was polite and surface-level.
**Fix:** The system prompt now directs a "brutally honest, no-nonsense" coach to ask
the hard, probing questions a tough interviewer actually asks — targeting gaps and
shallow experience — and to call out weak talking points plainly with what to shore up.
No sugar-coating. The honesty guardrail (only real resume content, never fabricate) is
preserved.

### Verified
- `npm test` → 20/20 passing (the `steps` assertion became `generatedAt` since the
  response now comes from the persisted cache). ✅
- `npm run build` (frontend) compiles cleanly. ✅

---

## Steps remaining

- [ ] Step 8 — Deploy (Railway + Vercel) + final docs/README + demo
