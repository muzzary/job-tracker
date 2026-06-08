import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "../app.js";
import User from "../models/User.js";

dotenv.config();

// Use MONGO_URI_TEST if set; otherwise fall back to MONGO_URI but point at a
// separate "job-tracker-test" database so tests never touch real data.
const TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI;

beforeAll(async () => {
  await mongoose.connect(TEST_URI, { dbName: "job-tracker-test" });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// Wipe users before each test so each test starts with a clean slate.
beforeEach(async () => {
  await User.deleteMany({});
});

const testUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
};

// ── Register ──────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("registers a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("rejects a duplicate email with 400", async () => {
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it("rejects missing fields with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "bad@example.com" }); // no name or password

    expect(res.status).toBe(400);
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Pre-register a user so the login tests have someone to authenticate.
    await request(app).post("/api/auth/register").send(testUser);
  });

  it("returns a token on correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "thisisthewrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });
});

// ── Get current user ──────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("returns the logged-in user with a valid token", async () => {
    const reg = await request(app).post("/api/auth/register").send(testUser);
    const token = reg.body.token;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it("returns 401 when no token is sent", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
  });
});
