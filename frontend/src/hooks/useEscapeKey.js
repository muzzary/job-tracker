import { useEffect } from "react";

// Calls `onEscape` whenever the Escape key is pressed while `active` is true.
// Used by every modal/dialog so the "press Esc to close" wiring lives in one
// place instead of being re-implemented in each component.
export default function useEscapeKey(onEscape, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onEscape, active]);
}
