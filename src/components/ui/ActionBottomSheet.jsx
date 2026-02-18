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
      <div className="relative z-10 w-full max-w-2xl rounded-t-3xl bg-[var(--color-page)] px-4 pb-6 pt-4 shadow-xl">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--color-text-disabled)]/45" />
        <div className="px-1 text-sm font-medium text-[var(--color-secondary)]">{title}</div>
        <div className="mt-3 space-y-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium ${
                action.destructive
                  ? "border-[color:var(--rc-color-text-secondary)/30%] text-[color:#9b3f3f]"
                  : "border-[color:var(--rc-color-text-secondary)/25%] text-[var(--color-text-main)]"
              } ${action.disabled ? "opacity-60" : ""}`}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/25%] px-4 py-3 text-sm font-medium text-[var(--color-secondary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
