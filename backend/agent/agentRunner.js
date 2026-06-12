import { TOOL_SCHEMAS } from "./toolSchemas.js";
import { draftCoverLetter } from "../tools/coverLetter.js";
import { generateInterviewPrep } from "../tools/interviewPrep.js";
import { tailorResume } from "../tools/resumeTailor.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_TIMEOUT_MS = 45000;

const AGENT_MODELS = (
  process.env.AGENT_MODELS ||
  "meta-llama/llama-3.3-70b-instruct:free,openai/gpt-oss-120b:free"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const MAX_STEPS = parseInt(process.env.AGENT_MAX_STEPS || "10", 10);

// Like askModel in aiController but returns the full message object (not just text),
// so the loop can read tool_calls. Also passes tools + tool_choice.
const callAgentModel = async (messages, tools) => {
  let lastError;
  for (const model of AGENT_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
          "X-Title": "Job Tracker",
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: "auto",
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const e = new Error(`model ${model} returned ${response.status}`);
        e.status = response.status === 429 ? 429 : 502;
        throw e;
      }

      const data = await response.json();
      const message = data?.choices?.[0]?.message;
      if (!message) {
        const e = new Error("empty agent response");
        e.status = 502;
        throw e;
      }
      return message;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
    }
  }
  const e = new Error(
    lastError?.status === 429
      ? "The free AI tier is busy right now. Please try again in a minute."
      : "The AI service is unavailable right now. Please try again shortly."
  );
  e.status = lastError?.status === 429 ? 429 : 503;
  throw e;
};

const TOOL_MAP = {
  draft_cover_letter: draftCoverLetter,
  generate_interview_prep: generateInterviewPrep,
  tailor_resume: tailorResume,
};

const RESULT_KEY = {
  draft_cover_letter: "coverLetter",
  generate_interview_prep: "interviewPrep",
  tailor_resume: "resumeTailor",
};

export async function runAgent({ jobDescription, resumeText }) {
  const messages = [
    {
      role: "system",
      content:
        "You are an AI job application assistant with access to three tools.\n" +
        "Given a job description and a resume, use the tools to help the candidate apply.\n" +
        "- For a normal application: call all three tools.\n" +
        "- If the resume already strongly matches the job: skip the resume tailor tool.\n" +
        "- If the resume is a very poor fit (completely different field): warn the user and skip all tools.\n" +
        "- Call each tool at most once. Stop when all necessary tools have been called.\n" +
        "Never fabricate experience, employers, or skills the candidate does not have.",
    },
    {
      role: "user",
      content:
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}`,
    },
  ];

  const results = { coverLetter: null, interviewPrep: null, resumeTailor: null };
  const steps = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const message = await callAgentModel(messages, TOOL_SCHEMAS);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      steps.push({ step, action: "done", content: message.content });
      break;
    }

    messages.push({ role: "assistant", tool_calls: message.tool_calls });

    for (const toolCall of message.tool_calls) {
      const name = toolCall.function.name;
      steps.push({ step, action: name });

      let toolResult;
      try {
        const fn = TOOL_MAP[name];
        if (!fn) throw new Error(`Unknown tool: ${name}`);
        toolResult = await fn({ jobDescription, resumeText });
      } catch (err) {
        toolResult = "[Tool failed — please try again]";
      }

      const key = RESULT_KEY[name];
      if (key) results[key] = toolResult;

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }
  }

  return { ...results, steps };
}
