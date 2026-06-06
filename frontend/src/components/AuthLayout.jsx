import Logo from "./Logo.jsx";
import { CheckIcon } from "./icons.jsx";

// Shared layout for the Login and Register pages.
// Split-screen: a deep-blue brand panel on the left (hidden on small screens)
// and the form on the right. This avoids the over-used "centered card on a
// plain background" pattern and makes the auth screens feel like a real product.
const HIGHLIGHTS = [
  "Track every application on one Kanban board",
  "Move jobs from Saved to Offer as you progress",
  "Score your resume against any job description",
];

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* LEFT - brand panel. A tonal blue gradient with soft glow blobs and a
          faint grid, all palette-matched (no rainbow AI gradient). */}
      <aside className="relative hidden overflow-hidden bg-ateneo-700 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-buckthorn/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-coral/20 blur-3xl" />

        <div className="relative">
          <Logo
            tone="light"
            mark="w-16 h-16"
            text="text-3xl"
            tag="text-xs"
            gap="gap-3.5"
          />
        </div>

        <div className="relative">
          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-white">
            Run your job search like a pro.
          </h2>
          <p className="mt-4 max-w-sm text-white/60">
            One clean board for every application, from the first bookmark to the
            signed offer.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-center gap-3 text-white/85">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10">
                  <CheckIcon className="h-3.5 w-3.5 text-buckthorn" />
                </span>
                <span className="text-sm">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          Built by Muzzary Babar - MERN portfolio project.
        </p>
      </aside>

      {/* RIGHT - the form slot, vertically centred with generous spacing. */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Larger logo for small screens where the brand panel is hidden. */}
          <div className="mb-8 lg:hidden">
            <Logo mark="w-14 h-14" text="text-2xl" tag="text-[11px]" gap="gap-3" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
