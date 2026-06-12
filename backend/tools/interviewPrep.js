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
        `List 10–15 likely interview questions for the role below, then provide a 2–3 sentence ` +
        `talking point for each, drawn from the candidate's actual resume.\n\n` +
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}\n\n` +
        `Return as a numbered list. Format: Question → Talking Point.`,
    },
  ];
  return callOpenRouter(messages);
}
