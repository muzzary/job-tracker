import express from "express";
import { body } from "express-validator";
import {
  getAllJobs,
  createJob,
  getJobById,
  updateJob,
  deleteJob,
} from "../controllers/jobController.js";
import protect from "../middleware/authMiddleware.js";

// This file maps URLs to controller functions. It does not contain logic.
const router = express.Router();

// Every job route is protected: a request must pass the auth middleware
// before it reaches any controller. (protect is a placeholder until Phase 3.)
router.use(protect);

// Validation rules for creating a job.
// company and role are required; the rest are optional but checked if present.
const createJobValidation = [
  body("company").trim().notEmpty().withMessage("Company is required"),
  body("role").trim().notEmpty().withMessage("Role is required"),
  body("jobUrl").optional().isURL().withMessage("jobUrl must be a valid URL"),
  body("status")
    .optional()
    .isIn(["Saved", "Applied", "Interview", "Offer", "Rejected"])
    .withMessage("Invalid status value"),
  body("dateApplied").optional().isISO8601().withMessage("dateApplied must be a valid date"),
  body("notes").optional().trim(),
  body("jobDescription").optional().trim(),
];

// Validation rules for updating a job.
// On update every field is optional (the user may change just one thing),
// but if a field is sent it must still be valid.
const updateJobValidation = [
  body("company").optional().trim().notEmpty().withMessage("Company cannot be empty"),
  body("role").optional().trim().notEmpty().withMessage("Role cannot be empty"),
  body("jobUrl").optional().isURL().withMessage("jobUrl must be a valid URL"),
  body("status")
    .optional()
    .isIn(["Saved", "Applied", "Interview", "Offer", "Rejected"])
    .withMessage("Invalid status value"),
  body("dateApplied").optional().isISO8601().withMessage("dateApplied must be a valid date"),
  body("notes").optional().trim(),
  body("jobDescription").optional().trim(),
];

// Routes are written relative to "/api/jobs" (set in server.js).
router.get("/", getAllJobs); // list all jobs
router.post("/", createJobValidation, createJob); // create a job
router.get("/:id", getJobById); // get one job
router.put("/:id", updateJobValidation, updateJob); // update a job
router.delete("/:id", deleteJob); // delete a job

export default router;
