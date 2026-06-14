import { callOpenRouter } from "../controllers/aiController.js";
import { parseToolResponse } from "./parseToolResponse.js";

export async function draftCoverLetter({ jobDescription, resumeText }) {
  const messages = [
    {
      role: "system",
      content:
        "You are a professional cover letter writer. You only use information from the " +
        "candidate's real resume — never invent experience, employers, or skills they do not have. " +
        "If the job explicitly says no cover letter is needed, or it is not a standard application " +
        "(e.g. a take-home test spec, referral form), respond with exactly: " +
        "NOT_NEEDED: <one-sentence reason>. Otherwise write the letter.",
    },
    {
      role: "user",
      content:
        `Write a tailored, professional cover letter for the job below.\n\n` +
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}\n\n` +
        `Return only the letter text, no commentary.`,
    },
  ];
  const raw = await callOpenRouter(messages, 1500);
  return parseToolResponse(raw);
}
