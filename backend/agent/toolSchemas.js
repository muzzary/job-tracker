export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "draft_cover_letter",
      description:
        "Draft a tailored, professional cover letter for the specific job, " +
        "grounded in the candidate's real resume. Call when the goal requires a letter.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_interview_prep",
      description:
        "Produce likely interview questions for the role and suggested talking points " +
        "drawn from the candidate's actual background. Call when the goal requires interview preparation.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "tailor_resume",
      description:
        "Suggest concrete, specific edits to the resume to better match the job. " +
        "Call when there is a visible skills gap between the resume and the job.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];
