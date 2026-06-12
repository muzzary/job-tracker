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
