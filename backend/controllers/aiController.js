import User from "../models/User.js";
import Job from "../models/Job.js";

// This file holds the AI resume-matcher logic. It takes the user's saved resume
// and a job's description, asks an LLM (via OpenRouter) how well they match, and
// saves the score + missing skills onto the job.
//
// The OpenRouter API key lives only on the backend (never sent to the browser),
// and we use a FREE model so running the app costs nothing. The model id is read
// from an env var so we never hard-code it and can swap it if a free model goes
// away.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Free models to try, in order. OpenRouter's free tier is flaky - any single
// model can be momentarily rate-limited ("429 ... temporarily rate-limited
// upstream") or retired - so we try several and use the first that answers.
// Override/extend with a comma-separated OPENROUTER_MODEL list in .env.
const MODELS = (
  process.env.OPENROUTER_MODEL ||
  "google/gemma-4-31b-it:free,meta-llama/llama-3.3-70b-instruct:free,qwen/qwen3-coder:free,liquid/lfm-2.5-1.2b-instruct:free"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Free models have smaller context windows, so we trim very long inputs. A
// resume + job description still fit comfortably after this cap.
const cap = (text, max) => (text.length > max ? text.slice(0, max) : text);

// Models sometimes wrap JSON in prose or ```json fences. This pulls the JSON
// object out of the reply and parses it, returning null if it can't.
const extractJson = (text) => {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

// Build the prompt that asks the model for a strict JSON verdict.
const buildMessages = (resume, jobDescription) => [
  {
    role: "system",
    content:
      "You are an expert technical recruiter. You compare a candidate's resume to a " +
      "job description and judge the match honestly. Respond with ONLY a single valid " +
      "JSON object and no other text.",
  },
  {
    role: "user",
    content:
      "Compare the RESUME to the JOB DESCRIPTION and return a JSON object with exactly " +
      "these keys:\n" +
      '- "score": integer 0-100 (how well the resume matches; higher = better fit)\n' +
      '- "missingSkills": array of up to 8 short strings (important requirements in the ' +
      "job description that are NOT clearly shown in the resume)\n" +
      '- "summary": one or two sentences of specific, honest feedback\n\n' +
      `RESUME:\n"""\n${cap(resume, 6000)}\n"""\n\n` +
      `JOB DESCRIPTION:\n"""\n${cap(jobDescription, 6000)}\n"""\n\n` +
      "Respond with ONLY the JSON object.",
  },
];

// Try one model. Returns the assistant text on success, or throws a tagged error.
const askModel = async (model, messages) => {
  // Abort the request if the model takes too long, so we don't hang forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // OpenRouter asks for these so free usage is attributed to the app.
        "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
        "X-Title": "Job Tracker",
      },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 700 }),
      signal: controller.signal,
    });
  } catch (err) {
    const e = new Error(
      err.name === "AbortError" ? "AI request timed out" : "Could not reach AI service"
    );
    e.status = err.name === "AbortError" ? 504 : 503;
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const e = new Error(`model ${model} returned ${response.status}`);
    // 429 = rate-limited (transient), 404 = model gone - both worth trying the
    // next model. Keep the status so the final error maps sensibly.
    e.status = response.status === 429 ? 429 : 502;
    throw e;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  if (!content) {
    const e = new Error("empty AI response");
    e.status = 502;
    throw e;
  }
  return content;
};

// Call OpenRouter, trying each free model in turn until one answers. If every
// model fails, throw the last error so the route maps it to the right status
// (e.g. a 429 becomes a friendly "free tier is busy" message).
const callOpenRouter = async (messages) => {
  let lastError;
  for (const model of MODELS) {
    try {
      return await askModel(model, messages);
    } catch (err) {
      lastError = err;
      // Try the next model on rate-limit / not-found / server errors.
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

// POST /api/ai/match
// Body: { jobId, jobDescription? }
// Scores the user's saved resume against the job's description.
export const matchResume = async (req, res) => {
  try {
    const { jobId, jobDescription } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "A jobId is required." });
    }

    // 1) The user must have a saved resume to score against.
    const user = await User.findById(req.user.id).select("resume");
    if (!user || !user.resume) {
      return res
        .status(400)
        .json({ message: "Please upload your resume before scoring a job." });
    }

    // 2) The job must exist and belong to this user.
    const job = await Job.findOne({ _id: jobId, userId: req.user.id });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // 3) Use the description sent now (and save it) or the one already on the job.
    const description = (jobDescription || job.jobDescription || "").trim();
    if (description.length < 30) {
      return res.status(400).json({
        message: "Please add a job description (at least a few lines) to score against.",
      });
    }

    // 4) Ask the model and parse its JSON answer.
    const raw = await callOpenRouter(buildMessages(user.resume, description));
    const result = extractJson(raw);
    if (!result || typeof result.score === "undefined") {
      return res
        .status(502)
        .json({ message: "The AI returned an unexpected response. Please try again." });
    }

    // 5) Clean up the values defensively before saving.
    let score = Math.round(Number(result.score));
    if (Number.isNaN(score)) score = 0;
    score = Math.max(0, Math.min(100, score));
    const missingSkills = Array.isArray(result.missingSkills)
      ? result.missingSkills.map((s) => String(s)).filter(Boolean).slice(0, 8)
      : [];
    const summary = typeof result.summary === "string" ? result.summary.trim() : "";

    // 6) Save the result (and the description) on the job, then return it.
    job.jobDescription = description;
    job.aiScore = score;
    job.missingSkills = missingSkills;
    job.aiSummary = summary;
    job.aiScoredAt = new Date();
    await job.save();

    res.json(job);
  } catch (error) {
    // Errors thrown by callOpenRouter carry their own status; otherwise 500.
    res
      .status(error.status || 500)
      .json({ message: error.message || "AI matching failed" });
  }
};
