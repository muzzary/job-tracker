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
        `Suggest necessary concrete, specific edits to the resume below to better match the job.\n\n` +
        `For each edit: state which line/bullet to change and what to change it to.\n\n` +
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}\n\n` +
        `Return as a numbered list.`,
    },
  ];
  return callOpenRouter(messages);
}
