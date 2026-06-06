import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";
import { LogoutIcon } from "./icons.jsx";

// Build initials from a name, e.g. "Muzzary Babar" -> "MB".
function initialsOf(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

// The sticky top bar shown on the dashboard: brand on the left, the current
// user and a logout button on the right. Frosted ("glass") so content scrolls
// elegantly underneath it.
export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="glass sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo mark="w-9 h-9" />

        <div className="flex items-center gap-3">
          {/* User chip: initials avatar + name (name hidden on small screens) */}
          <div className="flex items-center gap-2.5 rounded-full border border-polar/70 bg-white/70 py-1 pl-1 pr-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ateneo text-xs font-bold text-white">
              {initialsOf(user?.name) || "U"}
            </span>
            <span className="hidden text-sm font-medium text-ink/80 sm:block">
              {user?.name || "User"}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="btn-ghost px-3"
            title="Log out"
          >
            <LogoutIcon className="h-5 w-5" />
            <span className="hidden sm:block">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
