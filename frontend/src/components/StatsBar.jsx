import useCountUp from "../hooks/useCountUp.js";
import { BriefcaseIcon, TrendingUpIcon, TrophyIcon, TargetIcon } from "./icons.jsx";

// One headline metric tile: a colour-chipped icon, a count-up number, a label,
// and a soft glow that lifts on hover. These give the dashboard its "at a glance"
// wow before the detailed funnel below.
function StatTile({ Icon, label, value, suffix = "", accent, delay = 0 }) {
  const display = useCountUp(value);
  return (
    <div
      className="group relative overflow-hidden rounded-xl2 glass-card p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative corner glow, brightens on hover */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full ${accent.blob} opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-90`}
      />

      <span
        className={`relative grid h-10 w-10 place-items-center rounded-xl ${accent.chip} shadow-sm`}
      >
        <Icon className="h-5 w-5" />
      </span>

      <p className="tabular mt-3.5 text-3xl font-semibold leading-none text-ink">
        {display}
        {suffix}
      </p>
      <p className="mt-1.5 text-xs font-medium text-ink/50">{label}</p>
    </div>
  );
}

export default function StatsBar({ jobs }) {
  const total = jobs.length;
  const countFor = (key) => jobs.filter((j) => j.status === key).length;

  const applied = countFor("Applied");
  const interviewing = countFor("Interview");
  const offers = countFor("Offer");
  // "In progress" = live applications still moving through the pipeline.
  const inProgress = applied + interviewing;
  // "Response rate" = share of applications that earned an interview or offer.
  const responded = interviewing + offers;
  const responseRate = total ? Math.round((responded / total) * 100) : 0;

  const tiles = [
    {
      Icon: BriefcaseIcon,
      label: "Total applications",
      value: total,
      accent: { chip: "bg-ateneo-50 text-ateneo", blob: "bg-ateneo/30" },
    },
    {
      Icon: TrendingUpIcon,
      label: "In progress",
      value: inProgress,
      accent: { chip: "bg-[#FFF4DE] text-[#9a6b14]", blob: "bg-buckthorn/40" },
    },
    {
      Icon: TrophyIcon,
      label: "Offers",
      value: offers,
      accent: { chip: "bg-[#E2F4F5] text-teal", blob: "bg-teal/30" },
    },
    {
      Icon: TargetIcon,
      label: "Response rate",
      value: responseRate,
      suffix: "%",
      accent: { chip: "bg-[#FFE9E3] text-[#c5523c]", blob: "bg-coral/30" },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
      {tiles.map((t, i) => (
        <StatTile key={t.label} {...t} delay={i * 70} />
      ))}
    </div>
  );
}
