// Small date helpers shared across the app. Both guard against invalid dates
// (returning "") so callers never render "Invalid Date".

// Human-readable date for display, e.g. "5 Jun 2026".
export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// YYYY-MM-DD value expected by <input type="date">.
export function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
