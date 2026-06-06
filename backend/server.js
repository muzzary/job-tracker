import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import jobRoutes from "./routes/jobRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

// Connect to MongoDB before the server starts handling requests.
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// helmet sets safe HTTP security headers (helps protect against common attacks).
// It runs first so every response - including errors - gets the headers.
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Health check route - confirms the server is alive (used in Phase 1)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Job Tracker API is running" });
});

// Routes
// Auth routes (Phase 3): register + login + me.
app.use("/api/auth", authRoutes);
// Job CRUD routes (Phase 2).
app.use("/api/jobs", jobRoutes);
// User routes (Phase 5): resume upload/fetch.
app.use("/api/users", userRoutes);
// AI routes (Phase 5): resume-to-job matcher.
app.use("/api/ai", aiRoutes);

// Wired up in a later phase:
// import statsRoutes from "./routes/statsRoutes.js";
// app.use("/api/stats", statsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
