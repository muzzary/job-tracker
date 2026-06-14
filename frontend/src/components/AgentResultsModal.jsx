import { useEffect, useState } from "react";
import api from "../api/axios.js";
import useBodyScrollLock from "../hooks/useBodyScrollLock.js";
import {
  CloseIcon,
  AlertIcon,
  BotIcon,
  FileTextIcon,
  BriefcaseIcon,
  EditIcon,
  CopyIcon,
  CheckIcon,
  DownloadIcon,
} from "./icons.jsx";

const TABS = [
  { key: "coverLetter",  label: "Cover Letter",   Icon: FileTextIcon  },
  { key: "interviewPrep", label: "Interview Prep", Icon: BriefcaseIcon },
  { key: "resumeTailor", label: "Resume Tailor",   Icon: EditIcon      },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingState({ isRerun }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center gap-1.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2.5 w-2.5 animate-bounce rounded-full bg-ateneo"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <p className="mt-5 font-semibold text-ink">
        {isRerun ? "Re-running your assistant…" : "Running your assistant…"}
      </p>
      <p className="mt-1.5 text-sm text-ink/45">
        {isRerun
          ? "Generating fresh results. This usually takes 20–40 seconds."
          : "Drafting your cover letter, interview prep, and resume suggestions.\nThis usually takes 20–40 seconds."}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FFE9E3] text-coral">
        <AlertIcon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-semibold text-ink">{message}</p>
      <button type="button" onClick={onRetry} className="btn-outline mt-5">
        Try again
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AgentResultsModal({ job, onClose }) {
  const [status, setStatus] = useState("loading"); // "loading" | "done" | "error"
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("coverLetter");
  const [copied, setCopied] = useState(false);
  const [isRerun, setIsRerun] = useState(false);

  useBodyScrollLock(!!job);

  const runAgent = async (force = false) => {
    setIsRerun(force);
    setStatus("loading");
    setError("");
    if (!force) setResult(null);
    try {
      const { data } = await api.post("/agent/run", { jobId: job._id, force });
      setResult(data);
      setStatus("done");
      const first = TABS.find((t) => data[t.key]?.content);
      setActiveTab(first ? first.key : "coverLetter");
    } catch (err) {
      setError(err?.response?.data?.message || "The assistant failed. Please try again.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (!job) return;
    runAgent();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [job]);

  if (!job) return null;

  const activeContent = result?.[activeTab]?.content ?? null;
  const activeReason  = result?.[activeTab]?.reason  ?? null;

  const handleCopy = async () => {
    if (!activeContent) return;
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeContent) return;
    // Build a readable filename like "cover-letter-acme-corp.txt".
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const filename = `${slug(activeTab.replace(/([A-Z])/g, "-$1"))}-${slug(job.company)}.txt`;
    const blob = new Blob([activeContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI job assistant"
        className="relative z-10 flex h-[85dvh] max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl2 bg-white shadow-lift animate-scale-in sm:rounded-xl2"
      >
        {/* ── Header ── */}
        <div className="shrink-0 flex items-start justify-between border-b border-polar/60 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ateneo-50 text-ateneo">
              <BotIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">AI Job Assistant</h2>
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

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1 flex-col">
          {status === "loading" && <LoadingState isRerun={isRerun} />}

          {status === "error" && (
            <ErrorState message={error} onRetry={runAgent} />
          )}

          {status === "done" && result && (
            <div className="flex flex-1 flex-col overflow-hidden px-6 pt-5 pb-0">
              {/* Tab bar */}
              <div className="shrink-0 flex gap-1 rounded-xl bg-polar/30 p-1">
                {TABS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setActiveTab(key); setCopied(false); }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      activeTab === key
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink/50 hover:text-ink"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:block">{label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="relative mt-4 mb-6 flex-1 overflow-hidden rounded-xl border border-polar/60 bg-polar/10">
                {activeContent ? (
                  <>
                    {/* Sticky copy + download buttons */}
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-lg border border-polar bg-white px-2.5 py-1.5 text-xs font-medium text-ink/60 shadow-sm transition-all hover:border-ateneo/40 hover:text-ateneo"
                      >
                        {copied ? (
                          <>
                            <CheckIcon className="h-3.5 w-3.5 text-teal" />
                            <span className="text-teal">Copied</span>
                          </>
                        ) : (
                          <>
                            <CopyIcon className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 rounded-lg border border-polar bg-white px-2.5 py-1.5 text-xs font-medium text-ink/60 shadow-sm transition-all hover:border-ateneo/40 hover:text-ateneo"
                        title="Download as .txt"
                      >
                        <DownloadIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    </div>
                    {/* Scrollable text */}
                    <div className="scroll-slim absolute inset-0 overflow-y-auto p-4 pr-32 sm:pr-48">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                        {activeContent}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-[160px] items-center justify-center p-8 text-center">
                    <div className="max-w-sm">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal/10 text-teal">
                        <CheckIcon className="h-6 w-6" />
                      </span>
                      <p className="mt-4 font-semibold text-ink">You're already covered here</p>
                      <p className="mt-1.5 text-sm text-ink/45">
                        {activeReason ?? "The assistant reviewed your resume against this job and decided this step wouldn't add anything."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {status !== "loading" && (
          <div className="shrink-0 flex items-center justify-between border-t border-polar/60 px-6 py-4">
            <div>
              {result?.generatedAt && (
                <p className="text-xs text-ink/35">
                  Generated {new Date(result.generatedAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {status === "done" && (
                <button type="button" onClick={() => runAgent(true)} className="btn-outline">
                  Re-run
                </button>
              )}
              <button type="button" onClick={onClose} className="btn-ghost">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
