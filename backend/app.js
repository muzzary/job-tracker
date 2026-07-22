import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import jobRoutes from "./routes/jobRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";

dotenv.config();

const app = express();

// Render (and Nginx, for the OCI deploy) sit in front of this app as a single
// reverse-proxy hop. Without this, express-rate-limit can't trust the
// X-Forwarded-For header and can't tell real clients apart by IP.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Job Tracker API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/agent", agentRoutes);

export default app;
