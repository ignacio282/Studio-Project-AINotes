"use client";

import { useEffect } from "react";

export default function ActionBottomSheet({ open, onClose, title = "Options", actions = [] }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-label="Close actions"
      />
      <div className="relative z-10 w-full max-w-screen-sm overflow-hidden rounded-t-[32px] bg-[rgba(247,246,243,0.94)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_45px_rgba(42,42,42,0.18)] backdrop-blur">
        <div className="mx-auto h-1 w-8 rounded-full bg-[var(--color-text-main)]/55" />
        <div className="mt-6">
          <div className="type-h3 text-[var(--color-text-main)]">{title}</div>
        </div>
        <div className="mt-4 space-y-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`type-button w-full rounded-[8px] px-4 py-4 text-left transition ${
                action.destructive
                  ? "bg-[rgba(155,63,63,0.1)] text-[#9b3f3f] hover:bg-[rgba(155,63,63,0.14)]"
                  : "bg-[rgba(240,238,229,0.78)] text-[var(--color-text-main)] hover:bg-[rgba(240,238,229,0.92)]"
              } ${action.disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="type-button h-11 w-full rounded-[8px] text-center text-[var(--color-text-accent)] transition hover:text-[var(--color-accent-hover)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
