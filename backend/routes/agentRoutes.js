import express from "express";
import { runAgentHandler } from "../controllers/agentController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);
router.post("/run", runAgentHandler);
export default router;
