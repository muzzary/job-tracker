import { useEffect, useState } from "react";
import { STATUS_KEYS } from "../constants/jobStatus.js";
import useBodyScrollLock from "../hooks/useBodyScrollLock.js";
import useEscapeKey from "../hooks/useEscapeKey.js";
import { CloseIcon, AlertIcon } from "./icons.jsx";
import { readError } from "../utils/readError.js";
import { toDateInput } from "../utils/date.js";

const EMPTY = {
  company: "",
  role: "",
  jobUrl: "",
  status: "Saved",
  dateApplied: "",
  notes: "",
  jobDescription: "",
};

// A modal used for BOTH adding a new application and editing an existing one.
// `editingJob` decides the mode; `initialStatus` pre-selects a column when the
// user clicks "+" on a specific Kanban column.
export default function AddJobModal({
  open,
  onClose,
  onSave,
  editingJob,
  initialStatus = "Saved",
}) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(editingJob);

  // Whenever the modal opens, load the editing job's values (or a blank form
  // pre-set to the column the user clicked).
  useEffect(() => {
    if (!open) return;
    if (editingJob) {
      setForm({
        company: editingJob.company || "",
        role: editingJob.role || "",
        jobUrl: editingJob.jobUrl || "",
        status: editingJob.status || "Saved",
        dateApplied: toDateInput(editingJob.dateApplied),
        notes: editingJob.notes || "",
        jobDescription: editingJob.jobDescription || "",
      });
    } else {
      setForm({ ...EMPTY, status: initialStatus });
    }
    setErrors({});
    setServerError("");
  }, [open, editingJob, initialStatus]);

  useBodyScrollLock(open);
  useEscapeKey(onClose, open);

  if (!open) return null;

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError("");
  };

  // Match the backend rules: company + role required; jobUrl, if given, must be
  // a valid URL.
  const validate = () => {
    const next = {};
    if (!form.company.trim()) next.company = "Company is required";
    if (!form.role.trim()) next.role = "Role is required";
    if (form.jobUrl.trim()) {
      try {
        new URL(form.jobUrl.trim());
      } catch {
        next.jobUrl = "Enter a valid URL (including https://)";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");

    // Only send fields that have a value, so we don't post empty strings the
    // backend would have to reject or store.
    const payload = {
      company: form.company.trim(),
      role: form.role.trim(),
      status: form.status,
    };
    if (form.jobUrl.trim()) payload.jobUrl = form.jobUrl.trim();
    if (form.dateApplied) payload.dateApplied = form.dateApplied;
    if (form.notes.trim()) payload.notes = form.notes.trim();
    if (form.jobDescription.trim()) payload.jobDescription = form.jobDescription.trim();

    try {
      await onSave(payload, editingJob?._id);
      onClose();
    } catch (err) {
      setServerError(readError(err, "Could not save. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit application" : "Add application"}
        className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-xl2 bg-white
          p-6 shadow-lift animate-scale-in sm:max-w-lg sm:rounded-xl2"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">
              {isEdit ? "Edit application" : "Add application"}
            </h2>
            <p className="mt-0.5 text-sm text-ink/50">
              {isEdit
                ? "Update the details for this job."
                : "Track a new job you're interested in."}
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

        {serverError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-[#FFE9E3] px-3.5 py-2.5 text-sm text-[#c5523c]">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="company" className="label">Company</label>
              <input
                id="company"
                className="input"
                placeholder="Stripe"
                value={form.company}
                onChange={update("company")}
              />
              {errors.company && <p className="field-error">{errors.company}</p>}
            </div>
            <div>
              <label htmlFor="role" className="label">Role</label>
              <input
                id="role"
                className="input"
                placeholder="Backend Engineer"
                value={form.role}
                onChange={update("role")}
              />
              {errors.role && <p className="field-error">{errors.role}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="jobUrl" className="label">
              Job posting URL <span className="font-normal text-ink/40">(optional)</span>
            </label>
            <input
              id="jobUrl"
              className="input"
              placeholder="https://company.com/careers/123"
              value={form.jobUrl}
              onChange={update("jobUrl")}
            />
            {errors.jobUrl && <p className="field-error">{errors.jobUrl}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="label">Status</label>
              <select
                id="status"
                className="input cursor-pointer"
                value={form.status}
                onChange={update("status")}
              >
                {STATUS_KEYS.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dateApplied" className="label">
                Date applied <span className="font-normal text-ink/40">(optional)</span>
              </label>
              <input
                id="dateApplied"
                type="date"
                className="input cursor-pointer"
                value={form.dateApplied}
                onChange={update("dateApplied")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="label">
              Notes <span className="font-normal text-ink/40">(optional)</span>
            </label>
            <textarea
              id="notes"
              rows={2}
              className="input resize-none"
              placeholder="Recruiter name, referral, salary range, next steps..."
              value={form.notes}
              onChange={update("notes")}
            />
          </div>

          <div>
            <label htmlFor="jobDescription" className="label">
              Job description{" "}
              <span className="font-normal text-ink/40">(optional - used for AI scoring)</span>
            </label>
            <textarea
              id="jobDescription"
              rows={4}
              className="input resize-none"
              placeholder="Paste the job posting here. The AI matcher compares it against your resume to score the fit."
              value={form.jobDescription}
              onChange={update("jobDescription")}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEdit
                ? "Save changes"
                : "Add application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
