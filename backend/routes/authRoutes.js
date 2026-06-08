import express from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import { register, login, getMe } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

// This file maps the auth URLs to controller functions. No logic lives here.
const router = express.Router();

// Rate limiter for auth routes. Login and register are the most attacked
// endpoints (people try thousands of passwords), so we cap how many requests
// one IP can make in a time window. This is brute-force protection.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // allow 10 attempts per IP per window, then block
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true, // send the limit info in the standard RateLimit headers
  legacyHeaders: false,
});

// Validation for register: all three fields required, email must look like an
// email, and the password must be at least 6 characters.
const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("A valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

// Validation for login: just need a valid email and a non-empty password.
const loginValidation = [
  body("email").trim().isEmail().withMessage("A valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Skip rate limiting in the test environment so tests can hit auth routes freely
// without triggering the 10-request cap. In production it always runs.
const withRateLimit = process.env.NODE_ENV === "test" ? [] : [authLimiter];

// Routes are relative to "/api/auth" (set in server.js).
// The rate limiter runs first, then validation, then the controller.
router.post("/register", ...withRateLimit, registerValidation, register);
router.post("/login", ...withRateLimit, loginValidation, login);

// GET /me is protected (needs a valid token) and is NOT rate-limited, because
// the frontend calls it on every page load to validate the saved session.
router.get("/me", protect, getMe);

export default router;
