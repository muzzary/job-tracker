import { STATUS_MAP, STATUS_KEYS } from "../constants/jobStatus.js";
import {
  CalendarIcon,
  LinkIcon,
  EditIcon,
  TrashIcon,
  SparkleIcon,
  GripIcon,
} from "./icons.jsx";

// Format an ISO date into something short and human, e.g. "12 Jun 2026".
// Returns "" if there's no date so we can hide the row entirely.
function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// A single job application. It is draggable (native HTML5 drag-and-drop) so the
// user can drag it between Kanban columns to change its status. A compact status
// dropdown is also provided so the same move works on touch devices.
export default function JobCard({ job, index = 0, onEdit, onDelete, onMove, onScore }) {
  const status = STATUS_MAP[job.status] || STATUS_MAP.Saved;
  const date = formatDate(job.dateApplied);

  // When dragging starts, stash the job id so the drop target knows which card
  // was dropped on it.
  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", job._id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <article
      draggable
      onDragStart={handleDragStart}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="group animate-fade-up cursor-grab rounded-xl border border-polar/70 bg-white p-3.5
        shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ateneo/30
        hover:shadow-card active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-semibold leading-snug text-ink">
            {job.company}
          </h4>
          <p className="truncate text-sm text-ink/55">{job.role}</p>
        </div>

        {/* Drag affordance + hover actions */}
        <div className="flex shrink-0 items-center">
          <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onScore(job)}
              className="rounded-lg p-1.5 text-ink/40 hover:bg-ateneo-50 hover:text-ateneo"
              title="AI resume match"
              aria-label="Score against resume"
            >
              <SparkleIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(job)}
              className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ateneo"
              title="Edit"
              aria-label="Edit application"
            >
              <EditIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(job)}
              className="rounded-lg p-1.5 text-ink/40 hover:bg-[#FFE9E3] hover:text-coral"
              title="Delete"
              aria-label="Delete application"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
          <GripIcon className="h-4 w-4 text-ink/20" />
        </div>
      </div>

      {/* Meta row: date + external link + optional AI score */}
      {(date || job.jobUrl || job.aiScore != null) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink/50">
          {date && (
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3.5 w-3.5" />
              {date}
            </span>
          )}
          {job.jobUrl && (
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-ateneo hover:underline"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Posting
            </a>
          )}
          {job.aiScore != null && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onScore(job);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-ateneo-50 px-2 py-0.5 font-medium text-ateneo transition-colors hover:bg-ateneo/15"
              title="View AI match"
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              <span className="tabular">{job.aiScore}</span>
            </button>
          )}
        </div>
      )}

      {/* Notes preview, if any */}
      {job.notes && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink/45">
          {job.notes}
        </p>
      )}

      {/* Footer: status pill that doubles as the touch-friendly "move" control */}
      <div className="mt-3 flex items-center justify-between border-t border-polar/50 pt-2.5">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <label className="sr-only" htmlFor={`move-${job._id}`}>
          Move application
        </label>
        <select
          id={`move-${job._id}`}
          value={job.status}
          onChange={(e) => onMove(job._id, e.target.value)}
          className="cursor-pointer rounded-lg border border-polar/70 bg-white px-2 py-1 text-xs
            font-medium text-ink/70 hover:border-ateneo/40 focus:border-ateneo"
        >
          {STATUS_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
