import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "../app.js";
import User from "../models/User.js";
import Job from "../models/Job.js";

dotenv.config();

const TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI;

let token;
let jobId;

beforeAll(async () => {
  await mongoose.connect(TEST_URI, { dbName: "job-tracker-test" });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Job.deleteMany({});

  // Register a fresh user and grab their token
  const res = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  });
  token = res.body.token;

  // Give the user a resume
  await User.findOneAndUpdate(
    { email: "test@example.com" },
    { resume: "Muzzary Babar. Skills: React, Node.js, MongoDB, Express. Built JobTracker app." }
  );

  // Create a job with a description
  const jobRes = await request(app)
    .post("/api/jobs")
    .set("Authorization", `Bearer ${token}`)
    .send({
      company: "Acme Corp",
      role: "React Developer",
      jobDescription: "React developer. Must know React, Node.js, REST APIs.",
    });
  jobId = jobRes.body._id;
});

// ── Valid request ─────────────────────────────────────────────────────────────

describe("POST /api/agent/run", () => {
  it("returns coverLetter, interviewPrep, resumeTailor on a valid request", async () => {
    // All 3 tools run in parallel — each calls callOpenRouter once (one fetch per tool).
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { role: "assistant", content: "mock output", tool_calls: null } }],
        }),
    });

    const res = await request(app)
      .post("/api/agent/run")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("coverLetter");
    expect(res.body).toHaveProperty("interviewPrep");
    expect(res.body).toHaveProperty("resumeTailor");
    expect(res.body).toHaveProperty("generatedAt");
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("returns 401 when no token is sent", async () => {
    const res = await request(app).post("/api/agent/run").send({ jobId });
    expect(res.status).toBe(401);
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  it("returns 400 when jobId is missing", async () => {
    const res = await request(app)
      .post("/api/agent/run")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/jobId/i);
  });

  it("returns 400 when the job has no description", async () => {
    const noDescJob = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({ company: "No Desc Corp", role: "Developer" });

    const res = await request(app)
      .post("/api/agent/run")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: noDescJob.body._id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/description/i);
  });

  it("returns 400 when the user has no resume", async () => {
    await User.findOneAndUpdate({ email: "test@example.com" }, { resume: "" });

    const res = await request(app)
      .post("/api/agent/run")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/resume/i);
  });
});
