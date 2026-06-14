import Job from "../models/Job.js";
import User from "../models/User.js";
import { runAgent } from "../agent/agentRunner.js";

export const runAgentHandler = async (req, res) => {
  const { jobId, force } = req.body;
  if (!jobId) return res.status(400).json({ message: "jobId is required" });

  const job = await Job.findOne({ _id: jobId, userId: req.user.id });
  if (!job) return res.status(404).json({ message: "Job not found" });
  if (!job.jobDescription)
    return res.status(400).json({ message: "This job has no description. Add one first." });

  // Return cached results immediately unless the caller explicitly forces a re-run.
  if (!force && job.agentResults?.generatedAt) {
    return res.json(job.agentResults);
  }

  const user = await User.findById(req.user.id).select("resume");
  if (!user.resume)
    return res.status(400).json({ message: "No resume found. Upload your resume first." });

  try {
    const result = await runAgent({ jobDescription: job.jobDescription, resumeText: user.resume });

    // Persist so the next open is instant.
    job.agentResults = { ...result, generatedAt: new Date() };
    await job.save();

    res.json(job.agentResults);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Agent failed" });
  }
};
