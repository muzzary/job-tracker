import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User from "../models/User.js";

// This file holds the logic for creating accounts and logging in.
// Passwords are hashed with bcrypt (never stored as plain text) and a JWT is
// returned so the client can prove who it is on future requests.

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRY = "7d";

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

// Shape the safe, public view of a user for API responses. We never send the
// password hash, and we send the resume as a simple "do they have one + when"
// flag rather than the whole text (the frontend fetches the text separately).
const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  hasResume: Boolean(user.resume),
  resumeUpdatedAt: user.resumeUpdatedAt || null,
});

// POST /api/auth/register
// Create a new account, then return a token so the user is logged in right away.
export const register = async (req, res) => {
  // Stop early if express-validator found bad input.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }

  try {
    const { name, email, password } = req.body;

    // Don't allow two accounts with the same email.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // Hash the password before saving. The "10" is the salt strength -
    // higher is slower but harder to crack. 10 is a sensible default.
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save the user with the hashed password (never the plain one).
    const user = await User.create({ name, email, password: hashedPassword });

    // Return a token plus the safe user fields (never the password hash).
    res.status(201).json({
      token: generateToken(user._id),
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

// GET /api/auth/me
// Return the currently logged-in user. The auth middleware has already verified
// the token AND confirmed the user still exists, attaching it to req.user. The
// frontend calls this on startup to check a saved session is still valid (e.g.
// it rejects a token whose account was deleted).
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user no longer exists" });
    }
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
};

// POST /api/auth/login
// Check the email + password and, if they match, return a token.
export const login = async (req, res) => {
  // Stop early if express-validator found bad input.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Validation failed", errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Find the user by email.
    const user = await User.findOne({ email });
    // Compare the typed password against the stored hash.
    // We only run the compare if a user was found.
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password)
      : false;

    // If either the email is unknown or the password is wrong, give the SAME
    // generic message. This stops attackers learning which emails exist.
    if (!user || !passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Credentials are good - send back a fresh token.
    res.json({
      token: generateToken(user._id),
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
