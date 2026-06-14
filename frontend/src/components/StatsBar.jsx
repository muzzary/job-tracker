import { STATUSES } from "../constants/jobStatus.js";

export default function StatsBar({ jobs }) {
  const total = jobs.length;
  const countFor = (key) => jobs.filter((j) => j.status === key).length;
  // Bars are scaled relative to the stage with the most applications
  // so the widest bar fills the track and others are proportional to it.
  const maxCount = Math.max(...STATUSES.map((s) => countFor(s.key)), 1);

  return (
    <div className="rounded-xl2 border border-polar/60 bg-white px-6 py-5 shadow-sm">
      {/* Total headline */}
      <div className="flex items-baseline gap-2.5">
        <span className="tabular text-4xl font-semibold leading-none text-ink">{total}</span>
        <span className="text-sm font-medium text-ink/45">applications</span>
      </div>

      <div className="my-4 h-px bg-polar/50" />

      {/* Funnel rows */}
      <div className="flex flex-col gap-2.5">
        {STATUSES.map((s) => {
          const count = countFor(s.key);
          const barPct = (count / maxCount) * 100;
          return (
            <div key={s.key} className="flex items-center gap-3">
              {/* Status label — fixed width so bars align */}
              <div className="flex w-24 shrink-0 items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <span className="text-xs font-medium text-ink/60">{s.label}</span>
              </div>
              {/* Horizontal bar */}
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-polar/35">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${s.bar} transition-all duration-700`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              {/* Count */}
              <span className={`tabular w-7 shrink-0 text-right text-sm font-semibold ${s.text}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
