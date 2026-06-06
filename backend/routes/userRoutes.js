import express from "express";
import multer from "multer";
import { uploadResume, getResume } from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";

// Routes for the logged-in user's own data (currently their resume).
const router = express.Router();

// multer config for the resume upload:
//  - memoryStorage: keep the file in RAM as a buffer; we parse it and discard
//    it, so nothing is ever written to disk (zero storage cost).
//  - limits: cap the size at 5 MB so a huge file can't tie up the server.
//  - fileFilter: only accept PDFs.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// All user routes require a logged-in user.
router.use(protect);

// Upload/replace the resume. The multer middleware runs first to receive the
// single file sent under the field name "resume". We wrap it so a multer error
// (wrong type / too big) returns a clean 400 instead of crashing the request.
router.post(
  "/resume",
  (req, res, next) => {
    upload.single("resume")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  uploadResume
);

// Read the saved resume back.
router.get("/resume", getResume);

export default router;
