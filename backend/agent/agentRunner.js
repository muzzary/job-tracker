import { draftCoverLetter } from "../tools/coverLetter.js";
import { generateInterviewPrep } from "../tools/interviewPrep.js";
import { tailorResume } from "../tools/resumeTailor.js";

// All three tools, always run in parallel.
// Running them sequentially with a free-tier planning LLM added 50-150 s of
// latency and was unreliable (the model sometimes returned no tool_calls,
// leaving all results null). Each tool still calls the LLM internally with the
// same honesty guardrail — we just removed the routing layer.
const TOOLS = [
  { key: "coverLetter",   fn: draftCoverLetter      },
  { key: "interviewPrep", fn: generateInterviewPrep  },
  { key: "resumeTailor",  fn: tailorResume           },
];

export async function runAgent({ jobDescription, resumeText }) {
  const results = {
    coverLetter:   { content: null, reason: null },
    interviewPrep: { content: null, reason: null },
    resumeTailor:  { content: null, reason: null },
  };
  const steps = TOOLS.map(({ key }) => ({ step: 0, action: key }));

  await Promise.all(
    TOOLS.map(async ({ key, fn }) => {
      try {
        results[key] = await fn({ jobDescription, resumeText });
      } catch {
        // per-tool failure — content stays null, others continue
      }
    })
  );

  steps.push({ step: 1, action: "done" });
  return { ...results, steps };
}
