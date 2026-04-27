export default function RouteSkeletonScreen({ status = "Loading screen" }) {
  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <div role="status" aria-live="polite" className="sr-only">
        {status}
      </div>

      <header className="sticky top-0 z-40 border-b border-[var(--color-surface)] bg-[var(--color-page)]">
        <div className="mx-auto flex max-w-2xl items-center px-6 py-4">
          <div className="h-6 w-6 animate-pulse rounded bg-[var(--color-surface)]" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-6 pb-44">
        <section className="-mx-6 flex items-center gap-4 bg-[var(--color-surface)] px-6 py-5">
          <div className="h-28 w-20 shrink-0 animate-pulse rounded-xl bg-white/60" />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-7 w-4/5 animate-pulse rounded bg-[var(--color-page)]" />
            <div className="h-5 w-2/5 animate-pulse rounded bg-[var(--color-page)]" />

            <div className="space-y-2 pt-2">
              <div className="h-4 w-36 animate-pulse rounded bg-[var(--color-page)]" />
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-page)]" />
              <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-page)]" />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--color-surface)] p-1.5">
            <div className="h-10 animate-pulse rounded-xl bg-[var(--color-page)]" />
            <div className="h-10 animate-pulse rounded-xl bg-[var(--color-page)]/70" />
            <div className="h-10 animate-pulse rounded-xl bg-[var(--color-page)]/70" />
          </div>

          <div className="rounded-2xl bg-[var(--color-accent-subtle)] p-4">
            <div className="h-5 w-44 animate-pulse rounded bg-[var(--color-page)]" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--color-page)]" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-[var(--color-page)]" />
          </div>

          <div className="space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-surface)]" />
            <div className="rounded-2xl bg-[var(--color-surface)] p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-page)]" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--color-page)]" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-[var(--color-page)]" />
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] p-4">
              <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-page)]" />
              <div className="mt-3 h-4 w-11/12 animate-pulse rounded bg-[var(--color-page)]" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-[var(--color-page)]" />
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-[var(--color-bg-subtle)] shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-2xl space-y-3 px-6 py-4">
          <div className="h-14 animate-pulse rounded-2xl bg-[var(--color-accent)]/65" />
          <div className="mx-auto h-5 w-32 animate-pulse rounded bg-[var(--color-surface)]" />
        </div>
      </div>
    </div>
  );
}
