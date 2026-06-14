import { callOpenRouter } from "../controllers/aiController.js";
import { parseToolResponse } from "./parseToolResponse.js";

export async function tailorResume({ jobDescription, resumeText }) {
  const messages = [
    {
      role: "system",
      content:
        "You are a resume editor. You only suggest edits to real content — never invent " +
        "experience, employers, or skills the candidate does not already have. " +
        "If the resume already matches the role well and no meaningful edits are warranted, " +
        "respond with exactly: NOT_NEEDED: <one-sentence reason>. Otherwise suggest the edits.",
    },
    {
      role: "user",
      content:
        `Suggest necessary concrete, specific edits to the resume below to better match the job.\n\n` +
        `For each edit: state which line/bullet to change and what to change it to.\n\n` +
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}\n\n` +
        `Return as a numbered list.`,
    },
  ];
  const raw = await callOpenRouter(messages, 1500);
  return parseToolResponse(raw);
}
