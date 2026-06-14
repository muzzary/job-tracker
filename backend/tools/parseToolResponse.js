// Shared parser for every AI tool's raw LLM reply.
//
// Each tool prompt offers an escape hatch: if the tool isn't useful for the
// given job, the model replies with "NOT_NEEDED: <reason>" instead of forced
// output. This helper turns the raw string into the uniform shape the rest of
// the app expects:
//   - normal output   -> { content: "<text>", reason: null }
//   - tool bowed out   -> { content: null, reason: "<why>" }
//
// Centralised here so all three tools (coverLetter, interviewPrep, resumeTailor)
// stay byte-for-byte consistent.
export function parseToolResponse(raw) {
  const trimmed = (raw ?? "").trim();
  if (trimmed.startsWith("NOT_NEEDED:")) {
    return { content: null, reason: trimmed.slice("NOT_NEEDED:".length).trim() };
  }
  return { content: trimmed, reason: null };
}
