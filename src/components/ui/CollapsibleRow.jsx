"use client";

import { useState } from "react";

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function CollapsibleRow({ label, value, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-3 text-left"
      >
        <div className="text-[var(--color-text-main)]">
          <span className="font-semibold">{label}: </span>
          <span className="text-[var(--color-secondary)]">{value}</span>
        </div>
        <span className="text-[var(--color-secondary)]">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open ? <div className="pb-2">{children}</div> : null}
    </div>
  );
}

