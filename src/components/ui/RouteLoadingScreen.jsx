"use client";

export default function RouteLoadingScreen({
  eyebrow = "Scriba",
  title = "Loading your reading space",
  detail = "Pulling together your latest notes, memory, and book context.",
}) {
  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-12">
        <div className="rounded-[32px] border border-[var(--color-accent-subtle)] bg-[var(--color-text-on-accent)] px-6 py-7 shadow-[0_18px_48px_rgba(0,0,0,0.06)]">
          <div className="type-caption uppercase tracking-[0.18em] text-[var(--color-secondary)]">
            {eyebrow}
          </div>
          <h1 className="type-h2 mt-3 text-[var(--color-text-main)]">
            {title}
          </h1>
          <p className="type-body mt-2 text-[var(--color-secondary)]">
            {detail}
          </p>

          <div className="mt-6 space-y-3">
            <div className="h-24 animate-pulse rounded-3xl bg-[var(--color-surface)]" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-28 animate-pulse rounded-3xl bg-[var(--color-surface)]" />
              <div className="h-28 animate-pulse rounded-3xl bg-[var(--color-surface)]" />
            </div>
            <div className="h-40 animate-pulse rounded-3xl bg-[var(--color-surface)]" />
          </div>
        </div>
      </main>
    </div>
  );
}
