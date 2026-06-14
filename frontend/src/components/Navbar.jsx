import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";
import {
  LogoutIcon,
  ChevronDownIcon,
  FileTextIcon,
  CheckIcon,
} from "./icons.jsx";

// Build initials from a name, e.g. "Muzzary Babar" -> "MB".
function initialsOf(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

// The sticky top bar. The profile chip is now a dropdown menu: it shows the
// account, the resume status (with a button to upload/replace it), and log out.
export default function Navbar({ onOpenResume }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the dropdown when clicking outside it or pressing Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="glass sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo mark="w-9 h-9" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full border border-polar/70 bg-white/70 py-1 pl-1 pr-2.5 transition-colors hover:border-ateneo/40"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ateneo text-xs font-bold text-white">
              {initialsOf(user?.name) || "U"}
            </span>
            <span className="hidden text-sm font-medium text-ink/80 sm:block">
              {user?.name || "User"}
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 text-ink/40 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl2 border border-polar/70 bg-white p-2 shadow-lift animate-scale-in"
            >
              {/* Account header */}
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-ink/50">{user?.email}</p>
              </div>

              <div className="my-1 h-px bg-polar/60" />

              {/* Resume status + action */}
              <div className="px-2.5 py-2">
                {user?.hasResume ? (
                  <div className="flex items-start gap-2 text-xs">
                    <FileTextIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    <div className="min-w-0">
                      <p
                        className="truncate font-medium text-ink"
                        title={user.resumeFileName || undefined}
                      >
                        {user.resumeFileName || "Resume on file"}
                      </p>
                      <span className="inline-flex items-center gap-1 text-teal">
                        <CheckIcon className="h-3 w-3" /> On file
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <FileTextIcon className="h-4 w-4 text-ink/45" />
                    <span className="font-medium text-ink/55">No resume uploaded</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenResume) onOpenResume();
                    setMenuOpen(false);
                  }}
                  className="btn-outline mt-2 w-full py-2 text-xs"
                >
                  {user?.hasResume ? "Update resume" : "Upload resume"}
                </button>
              </div>

              <div className="my-1 h-px bg-polar/60" />

              {/* Log out */}
              <button
                type="button"
                onClick={logout}
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-[#FFE9E3] hover:text-coral"
              >
                <LogoutIcon className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
