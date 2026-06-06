import { validationResult } from "express-validator";
import Job from "../models/Job.js";

// This file holds the business logic for jobs. The routes file decides the
// URLs; these functions decide what actually happens at each URL.
// Each user can only see and change their own jobs (req.user.id comes from
// the auth middleware).

// GET /api/jobs
// Return every job that belongs to the logged-in user.
export const getAllJobs = async (req, res) => {
  try {
    // Find only the jobs whose userId matches the current user.
    // Sort newest first so the most recent applications show on top.
    const jobs = await Job.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    // Any unexpected database error ends up here.
    res.status(500).json({ message: "Failed to fetch jobs", error: error.message });
  }
};

// POST /api/jobs
// Create a new job for the logged-in user.
export const createJob = async (req, res) => {
  // express-validator put any input errors here. If there are any, stop and
  // tell the client what was wrong instead of saving bad data.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Pull the allowed fields off the request body.
    const { company, role, jobUrl, status, dateApplied, notes, jobDescription } =
      req.body;

    // Build the new job. We set userId from the token, never from the body,
    // so a user cannot create jobs for someone else.
    const job = await Job.create({
      userId: req.user.id,
      company,
      role,
      jobUrl,
      status,
      dateApplied,
      notes,
      jobDescription,
    });

    // 201 means "created".
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: "Failed to create job", error: error.message });
  }
};

// GET /api/jobs/:id
// Return one job by its id, but only if it belongs to the current user.
export const getJobById = async (req, res) => {
  try {
    // Match both the id and the owner so users can't read others' jobs.
    const job = await Job.findOne({ _id: req.params.id, userId: req.user.id });

    // If nothing matched, the job either doesn't exist or isn't theirs.
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch job", error: error.message });
  }
};

// PUT /api/jobs/:id
// Update an existing job that belongs to the current user.
export const updateJob = async (req, res) => {
  // Check the validation results first, same as createJob.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Find the job by id AND owner, apply the new values, and return the
    // updated document. "new: true" returns the document after the update.
    // "runValidators: true" makes the schema rules (like the status enum)
    // apply on updates too.
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: "Failed to update job", error: error.message });
  }
};

// DELETE /api/jobs/:id
// Delete a job that belongs to the current user.
export const deleteJob = async (req, res) => {
  try {
    // Delete only if the id and owner both match.
    const job = await Job.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ message: "Job deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete job", error: error.message });
  }
};
