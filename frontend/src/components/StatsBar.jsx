import { STATUSES } from "../constants/jobStatus.js";

// A compact strip of metrics across the top of the dashboard: the total number
// of applications plus a count for each stage. Numbers use the mono font so the
// figures feel precise and line up. Following the design guidance, these are
// separated by hairlines rather than boxed into five identical cards.
export default function StatsBar({ jobs }) {
  const total = jobs.length;
  // Count how many jobs sit in each status.
  const countFor = (key) => jobs.filter((j) => j.status === key).length;

  return (
    <div className="rounded-xl2 border border-polar/70 bg-white shadow-card">
      <div className="grid grid-cols-2 divide-polar/60 sm:grid-cols-3 sm:divide-x lg:grid-cols-6">
        {/* Total */}
        <div className="flex flex-col gap-1 border-b border-polar/60 px-5 py-4 sm:border-b-0 lg:border-r">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/45">
            Total
          </span>
          <span className="tabular text-3xl font-semibold text-ink">{total}</span>
        </div>

        {/* One metric per stage */}
        {STATUSES.map((s) => (
          <div
            key={s.key}
            className="flex flex-col gap-1 border-b border-polar/60 px-5 py-4 last:border-b-0 sm:border-b-0"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink/45">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            <span className="tabular text-3xl font-semibold text-ink">
              {countFor(s.key)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
