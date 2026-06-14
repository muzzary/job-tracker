// A small set of inline SVG icons.
//
// We use inline SVG (not an icon library and never emojis) so there are no extra
// dependencies and every icon inherits the current text colour and a consistent
// stroke width. Each icon takes a className for sizing/colour.
//
// All icons share the same 24x24 viewBox, currentColor stroke, and 1.75 weight.

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CloseIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const LogoutIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const TrashIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const EditIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const LinkIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const CalendarIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const SparkleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M12 3l1.9 4.8L18.7 9 13.9 10.9 12 15.7 10.1 10.9 5.3 9l4.8-1.2L12 3Z" />
    <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
  </svg>
);

export const SearchIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const MailIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);

export const LockIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const UserIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const EyeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.4M6.6 6.6A13.2 13.2 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 3.4-.66" />
    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88M2 2l20 20" />
  </svg>
);

export const BriefcaseIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export const GripIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="9" cy="6" r="1.4" />
    <circle cx="15" cy="6" r="1.4" />
    <circle cx="9" cy="12" r="1.4" />
    <circle cx="15" cy="12" r="1.4" />
    <circle cx="9" cy="18" r="1.4" />
    <circle cx="15" cy="18" r="1.4" />
  </svg>
);

export const AlertIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

export const CheckIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const ChevronDownIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const UploadIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5M12 3v12" />
  </svg>
);

// Upward trend line — used for the "in progress / active pipeline" stat.
export const TrendingUpIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M17 7h4v4" />
  </svg>
);

// Trophy — used for the "offers" stat.
export const TrophyIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </svg>
);

// Target — used for the "response rate" stat.
export const TargetIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </svg>
);

export const DownloadIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5M12 15V3" />
  </svg>
);

export const FileTextIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

// CPU/chip icon — used to represent the AI agent.
export const BotIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </svg>
);

export const CopyIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} {...base}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
