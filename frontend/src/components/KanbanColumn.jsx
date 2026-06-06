import { useState } from "react";
import JobCard from "./JobCard.jsx";
import { PlusIcon } from "./icons.jsx";

// One column of the Kanban board, representing a single status. It lists the
// jobs in that stage and acts as a drop target: when a card is dragged over and
// released here, the column tells the dashboard to change that job's status.
export default function KanbanColumn({
  status,
  jobs,
  onEdit,
  onDelete,
  onMove,
  onAdd,
  onScore,
}) {
  // Tracks whether a card is currently hovering over this column, so we can
  // highlight it as a valid drop zone.
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault(); // required to allow a drop
    e.dataTransfer.dropEffect = "move";
    if (!isOver) setIsOver(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    const jobId = e.dataTransfer.getData("text/plain");
    if (jobId) onMove(jobId, status.key);
  };

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={`flex w-[280px] shrink-0 flex-col rounded-xl2 border bg-polar/20 transition-colors duration-200 ${
        isOver ? "border-ateneo/50 bg-ateneo-50" : "border-transparent"
      }`}
    >
      {/* Column header: colour bar + label + live count */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
          <h3 className="text-sm font-semibold text-ink">{status.label}</h3>
          <span className="tabular rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink/55">
            {jobs.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAdd(status.key)}
          className="rounded-lg p-1 text-ink/40 hover:bg-white hover:text-ateneo"
          title={`Add to ${status.label}`}
          aria-label={`Add application to ${status.label}`}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
      <div className={`mx-3 mt-2 h-0.5 rounded-full ${status.bar} opacity-70`} />

      {/* Cards (scrolls independently if the column gets tall) */}
      <div className="scroll-slim flex max-h-[calc(100dvh-320px)] min-h-[120px] flex-col gap-2.5 overflow-y-auto p-3">
        {jobs.length === 0 ? (
          // Per-column empty state - quietly invites adding a job here.
          <button
            type="button"
            onClick={() => onAdd(status.key)}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-polar py-8 text-center text-xs text-ink/40 transition-colors hover:border-ateneo/40 hover:text-ateneo"
          >
            <PlusIcon className="h-5 w-5" />
            Drop a card here or add one
          </button>
        ) : (
          jobs.map((job, i) => (
            <JobCard
              key={job._id}
              job={job}
              index={i}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              onScore={onScore}
            />
          ))
        )}
      </div>
    </section>
  );
}
