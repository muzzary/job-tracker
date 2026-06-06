import mongoose from "mongoose";

// The Job schema describes one job application a user is tracking.
// Every job belongs to exactly one user (the userId reference below).
const jobSchema = new mongoose.Schema({
  // Links this job to the user who created it.
  // "ref: User" lets us populate the full user later if needed.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // The company the user applied to.
  company: {
    type: String,
    required: true,
    trim: true,
  },

  // The job title / role.
  role: {
    type: String,
    required: true,
    trim: true,
  },

  // Link to the original job posting (optional).
  jobUrl: {
    type: String,
    trim: true,
  },

  // Where the application currently sits on the Kanban board.
  // "enum" limits the value to this fixed list of allowed stages.
  status: {
    type: String,
    enum: ["Saved", "Applied", "Interview", "Offer", "Rejected"],
    default: "Saved",
  },

  // The date the user applied.
  dateApplied: {
    type: Date,
  },

  // Free-text notes the user wants to keep about this application.
  notes: {
    type: String,
    trim: true,
  },

  // The full job description text (Phase 5). The AI matcher scores the user's
  // saved resume against this to produce aiScore + missingSkills below.
  jobDescription: {
    type: String,
    trim: true,
  },

  // The AI match score (0-100) added in Phase 5. Optional for now.
  aiScore: {
    type: Number,
    min: 0,
    max: 100,
  },

  // Skills the AI says are missing from the resume. Filled in Phase 5.
  missingSkills: {
    type: [String], // an array of skill names
    default: [],
  },

  // A short, human-readable summary of the AI match (Phase 5).
  aiSummary: {
    type: String,
    default: "",
  },

  // When the AI score was last computed - lets the UI show "scored on ...".
  aiScoredAt: {
    type: Date,
  },

  // When this job record was created.
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// "Job" is the model name; Mongoose creates a "jobs" collection from it.
const Job = mongoose.model("Job", jobSchema);

export default Job;
