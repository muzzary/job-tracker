import useEscapeKey from "../hooks/useEscapeKey.js";
import { AlertIcon } from "./icons.jsx";

// A small reusable confirmation modal, used before destructive actions like
// deleting a job. Nicer and on-brand compared to the browser's window.confirm.
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  loading = false,
}) {
  // Allow Escape to cancel.
  useEscapeKey(onCancel, open);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-xl2 bg-white p-6 shadow-lift animate-scale-in"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FFE9E3] text-coral">
            <AlertIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-ink">{title}</h3>
            {message && <p className="mt-1 text-sm text-ink/60">{message}</p>}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost" disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn bg-coral text-white hover:bg-[#f5765f]"
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
