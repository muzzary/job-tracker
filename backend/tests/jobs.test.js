import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "../app.js";
import User from "../models/User.js";
import Job from "../models/Job.js";

dotenv.config();

const TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI;

let token; // valid JWT, refreshed before each test

beforeAll(async () => {
  await mongoose.connect(TEST_URI, { dbName: "job-tracker-test" });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// Wipe all data and create a fresh user + token before each test.
// This guarantees every test starts from a known clean state.
beforeEach(async () => {
  await User.deleteMany({});
  await Job.deleteMany({});

  const res = await request(app).post("/api/auth/register").send({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  });
  token = res.body.token;
});

const newJob = { company: "Acme Corp", role: "Frontend Developer" };

// ── Create job ────────────────────────────────────────────────────────────────

describe("POST /api/jobs", () => {
  it("creates a job for the logged-in user and returns 201", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send(newJob);

    expect(res.status).toBe(201);
    expect(res.body.company).toBe("Acme Corp");
    expect(res.body.role).toBe("Frontend Developer");
    expect(res.body.status).toBe("Saved"); // model default
  });

  it("rejects missing required fields with 400", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({ company: "Acme Corp" }); // role is missing

    expect(res.status).toBe(400);
  });

  it("returns 401 when no token is sent", async () => {
    const res = await request(app).post("/api/jobs").send(newJob);

    expect(res.status).toBe(401);
  });
});

// ── List jobs ─────────────────────────────────────────────────────────────────

describe("GET /api/jobs", () => {
  it("returns an array of only the logged-in user's jobs", async () => {
    await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send(newJob);

    const res = await request(app)
      .get("/api/jobs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });
});

// ── Get single job ────────────────────────────────────────────────────────────

describe("GET /api/jobs/:id", () => {
  it("returns the job when the owner requests it", async () => {
    const created = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send(newJob);
    const jobId = created.body._id;

    const res = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(jobId);
  });

  it("returns 404 for a job that belongs to another user", async () => {
    // Create a second user and a job under their account.
    const other = await request(app).post("/api/auth/register").send({
      name: "Other User",
      email: "other@example.com",
      password: "password123",
    });
    const otherToken = other.body.token;
    const otherJob = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${otherToken}`)
      .send(newJob);
    const otherId = otherJob.body._id;

    // The first user must NOT be able to fetch it.
    const res = await request(app)
      .get(`/api/jobs/${otherId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ── Update job ────────────────────────────────────────────────────────────────

describe("PUT /api/jobs/:id", () => {
  it("updates the job status and returns the updated job", async () => {
    const created = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send(newJob);
    const jobId = created.body._id;

    const res = await request(app)
      .put(`/api/jobs/${jobId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Applied" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Applied");
  });
});

// ── Delete job ────────────────────────────────────────────────────────────────

describe("DELETE /api/jobs/:id", () => {
  it("deletes the job so it can no longer be fetched", async () => {
    const created = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send(newJob);
    const jobId = created.body._id;

    const deleteRes = await request(app)
      .delete(`/api/jobs/${jobId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const fetchRes = await request(app)
      .get(`/api/jobs/${jobId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(fetchRes.status).toBe(404);
  });
});
