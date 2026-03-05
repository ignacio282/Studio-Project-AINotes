export default function LibraryLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        <header className="mb-10 flex items-center gap-4">
          <div className="h-9 w-9 rounded bg-[var(--color-surface)]" />
          <div className="h-8 w-28 rounded bg-[var(--color-surface)]" />
        </header>

        <div className="space-y-6">
          <div className="h-7 w-48 rounded bg-[var(--color-surface)]" />
          <div className="h-44 rounded-3xl bg-[var(--color-surface)]" />
          <div className="h-7 w-40 rounded bg-[var(--color-surface)]" />
          <div className="h-44 rounded-3xl bg-[var(--color-surface)]" />
          <div className="h-44 rounded-3xl bg-[var(--color-surface)]" />
          <div className="h-7 w-36 rounded bg-[var(--color-surface)]" />
          <div className="h-44 rounded-3xl bg-[var(--color-surface)]" />
        </div>
      </main>
    </div>
  );
}
