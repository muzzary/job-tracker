// The five Kanban stages, defined ONCE here so the board, the cards, the stats
// strip, and the add/edit form all stay in sync. The values must match the
// `status` enum in the backend Job model exactly.
//
// Each stage carries its own colour classes (drawn from the brand palette) so a
// job's stage is recognisable at a glance without reading the label.
export const STATUSES = [
  {
    key: "Saved",
    label: "Saved",
    // Neutral slate - a job you've bookmarked but not yet applied to.
    dot: "bg-slate-400",
    text: "text-slate-600",
    soft: "bg-slate-100",
    ring: "ring-slate-200",
    bar: "bg-slate-400",
  },
  {
    key: "Applied",
    label: "Applied",
    // Brand deep blue - application sent.
    dot: "bg-ateneo",
    text: "text-ateneo",
    soft: "bg-ateneo-50",
    ring: "ring-ateneo/20",
    bar: "bg-ateneo",
  },
  {
    key: "Interview",
    label: "Interview",
    // Amber - things are heating up.
    dot: "bg-buckthorn",
    text: "text-[#9a6b14]",
    soft: "bg-[#FFF4DE]",
    ring: "ring-buckthorn/40",
    bar: "bg-buckthorn",
  },
  {
    key: "Offer",
    label: "Offer",
    // Teal (from the logo) - the win.
    dot: "bg-teal",
    text: "text-teal",
    soft: "bg-[#E2F4F5]",
    ring: "ring-teal/30",
    bar: "bg-teal",
  },
  {
    key: "Rejected",
    label: "Rejected",
    // Coral - closed out.
    dot: "bg-coral",
    text: "text-[#c5523c]",
    soft: "bg-[#FFE9E3]",
    ring: "ring-coral/30",
    bar: "bg-coral",
  },
];

// Quick lookup by key, e.g. STATUS_MAP["Applied"].
export const STATUS_MAP = STATUSES.reduce((map, s) => {
  map[s.key] = s;
  return map;
}, {});

// Just the string values, handy for <select> options and validation.
export const STATUS_KEYS = STATUSES.map((s) => s.key);
