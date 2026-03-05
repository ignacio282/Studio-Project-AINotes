"use client";

export default function HomeError({ reset }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-page)] px-6 py-12 text-[var(--color-text-main)]">
      <div className="mx-auto mt-40 flex w-full max-w-2xl flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-[7px] border-[var(--color-secondary)] text-5xl font-semibold text-[var(--color-secondary)]">
          !
        </div>
        <h1 className="mt-8 text-[20px] leading-7 font-semibold" style={{ fontFamily: "var(--font-h3)" }}>
          Something went wrong
        </h1>
        <p className="mt-4 max-w-md text-[14px] leading-[22px] text-[var(--color-secondary)]">
          We are having some trouble showing your information, try refreshing this page
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex items-center gap-3 text-[var(--color-text-accent)]"
        >
          <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden>
            <path
              d="M20 11a8 8 0 1 0 2.2 5.5M20 11V5m0 6h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "var(--font-title)" }}>
            Refresh page
          </span>
        </button>
      </div>
    </div>
  );
}
