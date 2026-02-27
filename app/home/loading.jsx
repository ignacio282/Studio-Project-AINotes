export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <section className="bg-[var(--color-accent)] px-8 pb-44 pt-14">
        <div className="h-10 w-60 rounded-md bg-[var(--color-surface)]/90" />
      </section>

      <main className="-mt-36 mx-auto max-w-2xl space-y-7 px-6 pb-44">
        <div className="h-[340px] rounded-3xl bg-[var(--color-surface)]" />
        <div className="h-7 w-52 rounded bg-[var(--color-surface)]" />
        <div className="h-28 rounded bg-[var(--color-surface)]" />
        <div className="h-7 w-44 rounded bg-[var(--color-surface)]" />
        <div className="h-32 rounded bg-[var(--color-surface)]" />
        <div className="h-7 w-52 rounded bg-[var(--color-surface)]" />
        <div className="h-44 rounded bg-[var(--color-surface)]" />
      </main>
    </div>
  );
}
