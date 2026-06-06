import express from "express";
import { matchResume } from "../controllers/aiController.js";
import protect from "../middleware/authMiddleware.js";

// AI routes. Protected - only a logged-in user can score their own jobs.
const router = express.Router();

router.use(protect);

// Score the saved resume against a job's description.
router.post("/match", matchResume);

export default router;
