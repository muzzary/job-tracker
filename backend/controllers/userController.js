// pdf-parse is a CommonJS library. Importing its package entry runs some debug
// code that tries to read a sample file and crashes under ES modules, so we
// import the inner library file directly - the documented workaround.
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import User from "../models/User.js";

// pdf-parse occasionally throws a transient "bad XRef entry" on its first run for
// a given PDF (a quirk of the old pdf.js it bundles) and then succeeds on a
// retry. So we attempt the parse a few times before giving up. Returns the
// extracted text, or throws if every attempt fails (a genuinely unreadable PDF).
const extractPdfText = async (buffer, attempts = 3) => {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const parsed = await pdfParse(buffer);
      return (parsed.text || "").trim();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

// This file handles the user's saved resume. The resume is uploaded once as a
// PDF, converted to plain text, and stored on the user so the AI matcher can
// reuse it without the user re-uploading every time. They can upload again to
// replace it with an updated CV.

// POST /api/users/resume   (multipart/form-data, field name: "resume")
// Receives a PDF, extracts its text, and saves that text on the user.
export const uploadResume = async (req, res) => {
  try {
    // multer puts the uploaded file on req.file. If it's missing, nothing was
    // sent (or it failed the PDF/size checks in the route).
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a PDF resume." });
    }

    // Extract the text layer from the PDF buffer (held in memory, never written
    // to disk), retrying a few times to ride out pdf-parse's transient errors.
    let text = "";
    try {
      text = await extractPdfText(req.file.buffer);
    } catch {
      return res
        .status(400)
        .json({ message: "Could not read that PDF. Please try a different file." });
    }

    // A scanned/image-only PDF has no text layer, so extraction comes back tiny.
    // We reject it with a clear message instead of saving an empty resume.
    if (text.length < 30) {
      return res.status(400).json({
        message:
          "Couldn't find readable text in that PDF. Please upload a text-based PDF, not a scan or image.",
      });
    }

    // Save the extracted text and the time it was updated.
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.resume = text;
    user.resumeFileName = req.file.originalname;
    user.resumeUpdatedAt = new Date();
    await user.save();

    // Send back enough for the UI to confirm success (not the whole text).
    res.json({
      message: "Resume saved",
      resumeUpdatedAt: user.resumeUpdatedAt,
      characters: text.length,
      fileName: req.file.originalname,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to save resume", error: error.message });
  }
};

// GET /api/users/resume
// Return the saved resume text (and when it was updated) so the UI can show a
// preview / "you uploaded a resume on ..." state.
export const getResume = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "resume resumeFileName resumeUpdatedAt"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      hasResume: Boolean(user.resume),
      resume: user.resume || "",
      resumeFileName: user.resumeFileName || "",
      resumeUpdatedAt: user.resumeUpdatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resume", error: error.message });
  }
};
