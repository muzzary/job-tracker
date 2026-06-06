// The brand logo, rebuilt as clean inline SVG so it stays crisp at any size and
// uses the exact brand colours. It echoes the supplied logo: an upward "career
// growth" arrow rising over chart bars.
//
// Props:
//   withWordmark - show the "Job Tracker" text next to the mark (default true)
//   className    - sizing/spacing for the wrapper
//   mark         - extra classes for just the mark (e.g. a fixed size)
//   tone         - "dark" (default, for light backgrounds) or "light" (for the
//                  deep-blue brand panel)

export function LogoMark({ className = "w-9 h-9" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#003A6C" />
      {/* chart bars rising left-to-right */}
      <rect x="9" y="23" width="3.4" height="8" rx="1.4" fill="#FFFFFF" opacity="0.28" />
      <rect x="15" y="19" width="3.4" height="12" rx="1.4" fill="#FFFFFF" opacity="0.28" />
      <rect x="21" y="15" width="3.4" height="16" rx="1.4" fill="#FFFFFF" opacity="0.28" />
      {/* growth arrow */}
      <path
        d="M9 25.5L17 18.5L22 22.5L31 12"
        stroke="#FFBF65"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25.5 12H31V17.5"
        stroke="#FD8973"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({
  withWordmark = true,
  className = "",
  mark = "w-9 h-9",
  // Wordmark + tagline sizes are props so the same logo can be small in the
  // navbar and large on the auth screens, without duplicating the markup.
  text = "text-base",
  tag = "text-[10px]",
  gap = "gap-2.5",
  tone = "dark",
}) {
  const wordColor = tone === "light" ? "text-white" : "text-ateneo";
  const tagColor = tone === "light" ? "text-white/60" : "text-ink/45";

  return (
    <span className={`inline-flex items-center ${gap} ${className}`}>
      <LogoMark className={mark} />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className={`font-extrabold tracking-tight ${text} ${wordColor}`}>
            Job<span className="text-coral">Tracker</span>
          </span>
          <span
            className={`mt-1 ${tag} font-medium uppercase tracking-[0.18em] ${tagColor}`}
          >
            Career Navigator
          </span>
        </span>
      )}
    </span>
  );
}
