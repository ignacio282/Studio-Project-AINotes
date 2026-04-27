import Link from "next/link";

export default function MissingResourcePage({
  title = "We could not find that page",
  message = "This item may have been removed, or it may belong to another account.",
  actionHref = "/home",
  actionLabel = "Return home",
}) {
  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10 text-center">
        <div className="rounded-[8px] bg-[var(--color-surface)] px-5 py-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-text-accent)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
              <path
                d="M11 7h2v6h-2V7Zm0 8h2v2h-2v-2Zm1-13a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="type-h2 mt-5">{title}</h1>
          <p className="type-body mt-2 text-[var(--color-secondary)]">{message}</p>
          <Link
            href={actionHref}
            className="type-button mt-6 inline-flex justify-center rounded-[8px] bg-[var(--color-accent)] px-5 py-3 text-[var(--color-text-on-accent)]"
          >
            {actionLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
