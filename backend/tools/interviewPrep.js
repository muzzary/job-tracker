import { callOpenRouter } from "../controllers/aiController.js";
import { parseToolResponse } from "./parseToolResponse.js";

export async function generateInterviewPrep({ jobDescription, resumeText }) {
  const messages = [
    {
      role: "system",
      content:
        "You are a demanding, no-nonsense interview coach who prepares candidates by being " +
        "brutally honest. You only use information from the candidate's real resume — " +
        "never invent experience or skills they do not have. " +
        "Ask the rigorous, probing questions a tough interviewer would actually ask — including " +
        "the hard ones that target gaps, weak spots, and shallow experience. Do NOT sugar-coat, " +
        "soften, or flatter. If a talking point would be weak, say so plainly and tell the " +
        "candidate what they must shore up. " +
        "If the posting is not a job interview (e.g. a freelance gig spec or take-home task with no interview), " +
        "respond with exactly: NOT_NEEDED: <one-sentence reason>. Otherwise generate the prep.",
    },
    {
      role: "user",
      content:
        `List 10–15 rigorous interview questions a tough interviewer would ask for the role below. ` +
        `Include hard technical questions, behavioral questions, and pointed questions that probe ` +
        `gaps or weak areas between my resume and the job. For each, give a 2–3 sentence honest ` +
        `talking point drawn ONLY from my actual resume. Where my background is thin or missing, ` +
        `say so directly and tell me how to prepare — do not pretend I am stronger than I am.\n\n` +
        `JOB DESCRIPTION:\n${jobDescription}\n\nMY RESUME:\n${resumeText}\n\n` +
        `Return as a numbered list. Format: Question → Talking Point.`,
    },
  ];
  const raw = await callOpenRouter(messages, 2500);
  return parseToolResponse(raw);
}
