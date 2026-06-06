import mongoose from "mongoose";

// The User schema describes the shape of a user document in MongoDB.
// Each user owns many jobs (the link lives on the Job model via userId).
const userSchema = new mongoose.Schema({
  // The person's display name.
  name: {
    type: String,
    required: true,
    trim: true, // removes accidental spaces at the start/end
  },

  // The email is how a user logs in, so it must be unique.
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // store emails in lower case so logins are consistent
    trim: true,
  },

  // The hashed password. We never store the plain text password.
  // Hashing happens in Phase 3 (bcrypt) before the user is saved.
  password: {
    type: String,
    required: true,
  },

  // The user's resume as plain text, extracted from an uploaded PDF (Phase 5).
  // We store it once and reuse it for AI scoring so the user doesn't have to
  // re-upload every time. They can re-upload to replace it with an updated CV.
  resume: {
    type: String,
    default: "",
  },

  // When the resume was last uploaded/replaced - shown in the UI.
  resumeUpdatedAt: {
    type: Date,
  },

  // When the account was created.
  createdAt: {
    type: Date,
    default: Date.now, // set automatically when the user is created
  },
});

// "User" is the model name; Mongoose creates a "users" collection from it.
const User = mongoose.model("User", userSchema);

export default User;
