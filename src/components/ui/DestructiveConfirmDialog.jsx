"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DestructiveConfirmDialog({
  open,
  onClose,
  title,
  description = "This action is permanent and cannot be undone.",
  confirmLabel = "Delete permanently",
  cancelLabel = "Keep it",
  onConfirm,
  isConfirming = false,
  error = "",
}) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !isConfirming) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose, isConfirming]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-8">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        onClick={isConfirming ? undefined : onClose}
        aria-label="Close confirmation"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="destructive-confirm-title"
        className="relative z-10 w-full max-w-sm rounded-[24px] bg-[rgba(250,249,245,0.96)] p-6 text-center shadow-[0_24px_70px_rgba(42,42,42,0.28)] backdrop-blur"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(155,63,63,0.12)] text-[#9b3f3f]">
          <AlertTriangle className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
        </div>

        <h2 id="destructive-confirm-title" className="type-h3 mt-5 text-[var(--color-text-main)]">
          {title}
        </h2>
        <p className="type-body mx-auto mt-2 max-w-[28ch] text-[var(--color-secondary)]">
          {description}
        </p>

        {error ? (
          <div className="type-caption mt-4 rounded-[8px] bg-[rgba(155,63,63,0.1)] px-3 py-2 text-[#9b3f3f]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="type-button h-12 w-full rounded-[8px] bg-[#9b3f3f] px-4 text-[var(--color-text-on-accent)] transition hover:bg-[#873535] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming ? "Deleting..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="type-button h-12 w-full rounded-[8px] bg-[rgba(240,238,229,0.78)] px-4 text-[var(--color-text-main)] transition hover:bg-[rgba(240,238,229,0.92)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
