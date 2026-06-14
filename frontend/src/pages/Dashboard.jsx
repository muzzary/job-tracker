import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import StatsBar from "../components/StatsBar.jsx";
import KanbanBoard from "../components/KanbanBoard.jsx";
import AddJobModal from "../components/AddJobModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import AIMatcherModal from "../components/AIMatcherModal.jsx";
import AgentResultsModal from "../components/AgentResultsModal.jsx";
import ResumeModal from "../components/ResumeModal.jsx";
import { PlusIcon, SearchIcon, BriefcaseIcon, AlertIcon } from "../components/icons.jsx";
import { STATUSES } from "../constants/jobStatus.js";

// The main screen. It owns all the job data and the CRUD actions, then hands
// slices + handlers down to the board. Kept as the single source of truth so the
// stats, columns, and cards never disagree about the data.
export default function Dashboard() {
  const { user } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");

  // Modal + dialog state.
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [addStatus, setAddStatus] = useState("Saved");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // AI matcher, agent assistant, and resume modals.
  const [matcherJob, setMatcherJob] = useState(null);
  const [agentJob, setAgentJob] = useState(null);
  const [resumeOpen, setResumeOpen] = useState(false);

  // A tiny transient message for background failures (e.g. a drag that didn't
  // save). Auto-clears after a few seconds.
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load the user's jobs once on mount.
  const fetchJobs = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/jobs");
      setJobs(data);
    } catch (err) {
      setLoadError(
        err?.response?.data?.message || "Couldn't load your applications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Filter by the search box (company or role). useMemo so we don't re-filter on
  // every unrelated render.
  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.company.toLowerCase().includes(q) || j.role.toLowerCase().includes(q)
    );
  }, [jobs, query]);

  // --- CRUD handlers -------------------------------------------------------

  // Open the modal to create, optionally pre-set to a column's status.
  const openAdd = (status = "Saved") => {
    setEditingJob(null);
    setAddStatus(status);
    setModalOpen(true);
  };

  // Open the modal to edit an existing job.
  const openEdit = (job) => {
    setEditingJob(job);
    setModalOpen(true);
  };

  // Create (POST) or update (PUT). The modal awaits this and shows any error.
  const saveJob = async (payload, id) => {
    if (id) {
      const { data } = await api.put(`/jobs/${id}`, payload);
      setJobs((prev) => prev.map((j) => (j._id === id ? data : j)));
    } else {
      const { data } = await api.post("/jobs", payload);
      setJobs((prev) => [data, ...prev]);
    }
  };

  // Move a job to a new status (from drag-drop or the card dropdown).
  // Optimistic: update the UI immediately, then save; revert if it fails.
  const moveJob = async (id, status) => {
    const current = jobs.find((j) => j._id === id);
    if (!current || current.status === status) return;

    const previous = jobs;
    setJobs((prev) => prev.map((j) => (j._id === id ? { ...j, status } : j)));
    try {
      await api.put(`/jobs/${id}`, { status });
    } catch {
      setJobs(previous); // roll back
      setToast("Couldn't move that card. Please try again.");
    }
  };

  // Open the AI matcher for a job.
  const openMatcher = (job) => setMatcherJob(job);

  // Open the AI agent assistant for a job.
  const openAgent = (job) => setAgentJob(job);

  // When the AI returns a score, update that job in our state (so the card badge
  // and stats reflect it) and keep the open matcher in sync.
  const handleScored = (updatedJob) => {
    setJobs((prev) => prev.map((j) => (j._id === updatedJob._id ? updatedJob : j)));
    setMatcherJob(updatedJob);
  };

  // Delete after confirmation.
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/jobs/${pendingDelete._id}`);
      setJobs((prev) => prev.filter((j) => j._id !== pendingDelete._id));
      setPendingDelete(null);
    } catch {
      setToast("Couldn't delete that application. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // --- Render --------------------------------------------------------------

  const firstName = user?.name?.split(" ")[0] || "there";
  const hasAnyJobs = jobs.length > 0;

  // Time-aware greeting + a friendly live date for the hero header.
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative min-h-[100dvh]">
      {/* Animated ambient backdrop (pure CSS, sits behind everything) */}
      <div className="aurora" aria-hidden="true" />
      <div className="aurora-warm" aria-hidden="true" />

      <Navbar onOpenResume={() => setResumeOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header row: greeting + search + add */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-xs font-medium text-ink/60 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
              </span>
              {todayLabel}
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {greeting}, <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="mt-1.5 text-sm text-ink/55">
              Drag cards between columns to update where each application stands.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search company or role"
                className="input w-full pl-9 sm:w-64"
              />
            </div>
            <button type="button" onClick={() => openAdd("Saved")} className="btn-primary shrink-0">
              <PlusIcon className="h-5 w-5" />
              <span className="hidden sm:block">Add application</span>
            </button>
          </div>
        </div>

        {/* Background-failure toast */}
        {toast && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-coral/30 bg-[#FFE9E3] px-3.5 py-2.5 text-sm text-[#c5523c]">
            <AlertIcon className="h-4 w-4 shrink-0" />
            {toast}
          </div>
        )}

        {/* Body: loading / error / empty / board */}
        <div className="mt-6">
          {loading ? (
            <BoardSkeleton />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={fetchJobs} />
          ) : !hasAnyJobs ? (
            <EmptyState onAdd={() => openAdd("Saved")} />
          ) : (
            <>
              <StatsBar jobs={jobs} />
              <div className="mt-6">
                <KanbanBoard
                  jobs={visibleJobs}
                  onEdit={openEdit}
                  onDelete={setPendingDelete}
                  onMove={moveJob}
                  onAdd={openAdd}
                  onScore={openMatcher}
                  onRunAgent={openAgent}
                />
              </div>
              {/* If a search hides everything, say so. */}
              {visibleJobs.length === 0 && (
                <p className="mt-4 text-center text-sm text-ink/50">
                  No applications match "{query}".
                </p>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add / edit modal */}
      <AddJobModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveJob}
        editingJob={editingJob}
        initialStatus={addStatus}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete application?"
        message={
          pendingDelete
            ? `"${pendingDelete.role} at ${pendingDelete.company}" will be permanently removed.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* AI resume matcher */}
      <AIMatcherModal
        open={Boolean(matcherJob)}
        job={matcherJob}
        onClose={() => setMatcherJob(null)}
        onScored={handleScored}
        onUploadResume={() => setResumeOpen(true)}
      />

      {/* AI agent assistant */}
      <AgentResultsModal job={agentJob} onClose={() => setAgentJob(null)} />

      {/* Resume upload (also opened from the navbar) */}
      <ResumeModal open={resumeOpen} onClose={() => setResumeOpen(false)} />
    </div>
  );
}

// Skeleton shown while jobs load - mirrors the board so the layout doesn't jump.
function BoardSkeleton() {
  return (
    <div>
      <div className="skeleton h-52 w-full rounded-xl2" />
      <div className="mt-6 flex gap-4 overflow-hidden">
        {STATUSES.map((s) => (
          <div key={s.key} className="w-[280px] shrink-0">
            <div className="skeleton h-5 w-28 rounded-md" />
            <div className="mt-3 space-y-2.5">
              <div className="skeleton h-24 w-full rounded-xl" />
              <div className="skeleton h-24 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Shown if the jobs request fails - lets the user retry.
function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl2 border border-coral/30 glass-card p-10 text-center animate-fade-up">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#FFE9E3] text-coral">
        <AlertIcon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-semibold text-ink">{message}</h3>
      <p className="mt-1 text-sm text-ink/55">
        Check that the API is running, then try again.
      </p>
      <button type="button" onClick={onRetry} className="btn-outline mx-auto mt-5">
        Retry
      </button>
    </div>
  );
}

// Shown when the user has no jobs yet - a composed, inviting empty state.
function EmptyState({ onAdd }) {
  return (
    <div className="relative overflow-hidden rounded-xl2 glass-card p-12 text-center animate-fade-up">
      <span className="shine-streak opacity-40" aria-hidden="true" />
      <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-ateneo to-teal text-white shadow-lift">
        <BriefcaseIcon className="h-8 w-8" />
      </span>
      <h3 className="relative mt-5 text-xl font-bold text-ink">No applications yet</h3>
      <p className="relative mx-auto mt-1.5 max-w-sm text-sm text-ink/55">
        Add the first job you're chasing. You can move it across the board as you
        hear back and progress through interviews.
      </p>
      <button type="button" onClick={onAdd} className="btn-primary mx-auto mt-6">
        <PlusIcon className="h-5 w-5" />
        Add your first application
      </button>
    </div>
  );
}
