import KanbanColumn from "./KanbanColumn.jsx";
import { STATUSES } from "../constants/jobStatus.js";

// The board: one column per status, laid out horizontally. On smaller screens
// it scrolls sideways. It is a "dumb" layout component - it just slices the jobs
// by status and hands the actions down; all the data lives in the Dashboard.
export default function KanbanBoard({ jobs, onEdit, onDelete, onMove, onAdd }) {
  return (
    <div className="scroll-slim -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      {STATUSES.map((status) => (
        <KanbanColumn
          key={status.key}
          status={status}
          // Only the jobs whose status matches this column.
          jobs={jobs.filter((job) => job.status === status.key)}
          onEdit={onEdit}
          onDelete={onDelete}
          onMove={onMove}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
