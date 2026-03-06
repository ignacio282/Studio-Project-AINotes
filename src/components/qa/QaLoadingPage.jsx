export default function QaLoadingPage({ title = "Loading preview..." }) {
  return (
    <div className="min-h-screen bg-[var(--color-page)] px-6 py-10 text-[var(--color-text-main)]">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="type-caption text-[var(--color-secondary)]">{title}</div>
        <div className="h-8 w-56 animate-pulse rounded bg-[var(--color-surface)]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
      </div>
    </div>
  );
}

