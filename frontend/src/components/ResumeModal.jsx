import { useEffect, useRef, useState } from "react";
import api from "../api/axios.js";
import useBodyScrollLock from "../hooks/useBodyScrollLock.js";
import { useAuth } from "../context/AuthContext.jsx";
import { CloseIcon, AlertIcon, UploadIcon, FileTextIcon, CheckIcon } from "./icons.jsx";

// Format an ISO date for the "uploaded on ..." line.
function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Modal for uploading / replacing the saved resume. The resume is sent as a PDF;
// the backend extracts the text and stores it on the user so the AI matcher can
// reuse it. The user can come back here any time to upload an updated CV.
export default function ResumeModal({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setError("");
    setSuccess("");
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Validate a chosen file (PDF, under 5 MB) before we even try to upload.
  const pickFile = (f) => {
    setError("");
    setSuccess("");
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("That file is over 5 MB. Please upload a smaller PDF.");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a PDF first.");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      // Send as multipart/form-data. axios sets the right Content-Type (with the
      // boundary) automatically when given a FormData object.
      const form = new FormData();
      form.append("resume", file);
      const { data } = await api.post("/users/resume", form);

      // Update the global user so the navbar/matcher know a resume now exists.
      updateUser({
        hasResume: true,
        resumeFileName: data.fileName,
        resumeUpdatedAt: data.resumeUpdatedAt,
      });
      setSuccess(
        `Saved "${data.fileName}" - ${data.characters.toLocaleString()} characters of text extracted.`
      );
      setFile(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Resume"
        className="relative z-10 w-full max-w-lg overflow-y-auto rounded-t-xl2 bg-white p-6 shadow-lift animate-scale-in sm:rounded-xl2"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Your resume</h2>
            <p className="mt-0.5 text-sm text-ink/50">
              Upload a PDF once - the AI matcher reuses it to score any job.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Current status */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-polar/70 bg-polar/15 px-3.5 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-ateneo">
            <FileTextIcon className="h-5 w-5" />
          </span>
          <div className="text-sm">
            {user?.hasResume ? (
              <>
                <p className="truncate font-medium text-ink" title={user.resumeFileName || undefined}>
                  {user.resumeFileName || "Resume on file"}
                </p>
                <p className="text-ink/55">
                  Last updated {formatDate(user.resumeUpdatedAt) || "recently"}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-ink">No resume yet</p>
                <p className="text-ink/55">Upload one to unlock AI job scoring.</p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-[#FFE9E3] px-3.5 py-2.5 text-sm text-[#c5523c]">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-teal/30 bg-[#E2F4F5] px-3.5 py-2.5 text-sm text-teal">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          {/* Click-to-pick dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-polar bg-polar/10 py-8 text-center transition-colors hover:border-ateneo/50 hover:bg-ateneo-50"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ateneo">
              <UploadIcon className="h-5 w-5" />
            </span>
            {file ? (
              <span className="text-sm font-medium text-ink">{file.name}</span>
            ) : (
              <span className="text-sm text-ink/55">
                Click to choose a <span className="font-medium text-ink">PDF</span> (max 5 MB)
              </span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <div className="mt-5 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">
              Close
            </button>
            <button type="submit" className="btn-primary" disabled={uploading || !file}>
              {uploading ? "Uploading..." : user?.hasResume ? "Replace resume" : "Upload resume"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
