import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User from "../models/User.js";

// This file holds the logic for creating accounts and logging in.
// Passwords are hashed with bcrypt (never stored as plain text) and a JWT is
// returned so the client can prove who it is on future requests.

// Small helper: build a signed JWT that contains the user's id.
// The token is signed with JWT_SECRET so nobody can forge one, and it expires
// after 7 days so a stolen token does not work forever.
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// POST /api/auth/register
// Create a new account, then return a token so the user is logged in right away.
export const register = async (req, res) => {
  // Stop early if express-validator found bad input.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
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
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save the user with the hashed password (never the plain one).
    const user = await User.create({ name, email, password: hashedPassword });

    // Return a token plus the safe user fields (never the password hash).
    res.status(201).json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};

// POST /api/auth/login
// Check the email + password and, if they match, return a token.
export const login = async (req, res) => {
  // Stop early if express-validator found bad input.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
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
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
