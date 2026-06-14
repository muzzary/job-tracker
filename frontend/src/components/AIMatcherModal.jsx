import { useEffect, useState } from "react";
import api from "../api/axios.js";
import useBodyScrollLock from "../hooks/useBodyScrollLock.js";
import useEscapeKey from "../hooks/useEscapeKey.js";
import { useAuth } from "../context/AuthContext.jsx";
import { CloseIcon, AlertIcon, SparkleIcon, UploadIcon } from "./icons.jsx";
import { readError } from "../utils/readError.js";

// A circular gauge for the 0-100 match score. Colour shifts from coral (poor)
// through amber to teal (strong) so the result reads at a glance.
function ScoreRing({ score }) {
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circ - (pct / 100) * circ;
  const color = score >= 70 ? "#0E9AA7" : score >= 40 ? "#FFBF65" : "#FD8973";
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className="shrink-0">
      <circle cx="46" cy="46" r={radius} fill="none" stroke="#E8ECEF" strokeWidth="8" />
      <circle
        cx="46"
        cy="46"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 46 46)"
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text
        x="46"
        y="47"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="24"
        fontWeight="700"
        fill="#13181B"
        fontFamily="'JetBrains Mono', monospace"
      >
        {score}
      </text>
    </svg>
  );
}

// The AI resume matcher for a single job. The user pastes/edits the job
// description, clicks score, and we send it + their saved resume to the backend,
// which returns a 0-100 score, missing skills, and a short summary.
export default function AIMatcherModal({ open, job, onClose, onScored, onUploadResume }) {
  const { user } = useAuth();

  const [description, setDescription] = useState("");
  const [result, setResult] = useState(null); // { aiScore, missingSkills, aiSummary }
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState("");

  // When opened, seed the description + any previous result from the job.
  useEffect(() => {
    if (!open || !job) return;
    setDescription(job.jobDescription || "");
    setError("");
    setResult(
      job.aiScore != null
        ? {
            aiScore: job.aiScore,
            missingSkills: job.missingSkills || [],
            aiSummary: job.aiSummary || "",
          }
        : null
    );
  }, [open, job]);

  useBodyScrollLock(open && !!job);
  useEscapeKey(onClose, open && !!job);

  if (!open || !job) return null;

  const handleScore = async () => {
    setError("");
    if (description.trim().length < 30) {
      setError("Please paste a job description (at least a few lines) to score against.");
      return;
    }
    setScoring(true);
    try {
      const { data } = await api.post("/ai/match", {
        jobId: job._id,
        jobDescription: description.trim(),
      });
      setResult({
        aiScore: data.aiScore,
        missingSkills: data.missingSkills || [],
        aiSummary: data.aiSummary || "",
      });
      onScored(data); // let the dashboard update the card/board
    } catch (err) {
      setError(readError(err, "Scoring failed. Please try again."));
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI resume match"
        className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl2 bg-white p-6 shadow-lift animate-scale-in sm:rounded-xl2"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ateneo-50 text-ateneo">
              <SparkleIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">AI resume match</h2>
              <p className="text-sm text-ink/50">
                {job.role} at {job.company}
              </p>
            </div>
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

        {/* No resume yet: block scoring and offer to upload. */}
        {!user?.hasResume ? (
          <div className="mt-5 rounded-xl border border-dashed border-polar bg-polar/10 p-6 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-ateneo">
              <UploadIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 font-semibold text-ink">Upload your resume first</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink/55">
              The matcher scores your saved resume against this job. Upload a PDF once
              and reuse it for every job.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onUploadResume();
              }}
              className="btn-primary mx-auto mt-4"
            >
              <UploadIcon className="h-5 w-5" />
              Upload resume
            </button>
          </div>
        ) : (
          <>
            {/* Result (if scored) */}
            {result && (
              <div className="mt-5 flex items-start gap-4 rounded-xl2 border border-polar/70 bg-polar/10 p-4">
                <ScoreRing score={result.aiScore} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
                    Match score
                  </p>
                  {result.aiSummary && (
                    <p className="mt-1 text-sm leading-relaxed text-ink/75">
                      {result.aiSummary}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Missing skills */}
            {result && result.missingSkills.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
                  Skills to add
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-[#FFE9E3] px-2.5 py-1 text-xs font-medium text-[#c5523c]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-[#FFE9E3] px-3.5 py-2.5 text-sm text-[#c5523c]">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Job description input */}
            <div className="mt-4">
              <label htmlFor="ai-jd" className="label">
                Job description
              </label>
              <textarea
                id="ai-jd"
                rows={6}
                className="input resize-none"
                placeholder="Paste the full job posting here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-ghost">
                Close
              </button>
              <button
                type="button"
                onClick={handleScore}
                className="btn-primary"
                disabled={scoring}
              >
                <SparkleIcon className="h-5 w-5" />
                {scoring
                  ? "Scoring..."
                  : result
                  ? "Re-score against resume"
                  : "Score against my resume"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
