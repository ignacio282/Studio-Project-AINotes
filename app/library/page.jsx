import Link from "next/link";
import { redirect } from "next/navigation";
import BackArrowIcon from "@/components/BackArrowIcon";
import { requireUser } from "@/lib/supabase/require-user";
import { fetchBooksDashboardData } from "@/lib/books/dashboard-data";

function BookIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 4h10a2 2 0 0 1 2 2v13H8a2 2 0 0 0-2 2V4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 7h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7.22 4.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 0-1.06Z"
      />
    </svg>
  );
}

function PlusIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function SwapVertIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="m8 7 4-4 4 4M12 3v18M16 17l-4 4-4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookRow({ book, href = "", showArrow = false }) {
  const content = (
    <div className="flex items-center gap-4 rounded-3xl bg-[var(--color-surface)] px-5 py-4">
      <div className="h-28 w-20 overflow-hidden rounded-xl bg-white/70">
        {book?.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-secondary)]">
            No cover
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[24px] leading-8 font-medium" style={{ fontFamily: "var(--font-h2)" }}>
          {book?.title || "Untitled"}
        </div>
        <div className="truncate text-[14px] leading-[22px] text-[var(--color-secondary)]">
          By {book?.author || "Unknown author"}
        </div>
      </div>
      {showArrow ? <ArrowRightIcon className="h-10 w-10 text-[var(--color-text-main)]" /> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");

  const { books, currentBook, toReadBooks, finishedBooks } = await fetchBooksDashboardData(
    supabase,
    user.id,
  );
  const hasBooks = books.length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <main className="mx-auto max-w-2xl px-6 pb-32 pt-10">
        <header className="mb-10 flex items-center gap-4">
          <Link href="/home" className="text-[var(--color-text-main)]">
            <BackArrowIcon className="h-9 w-9 text-[var(--color-text-main)]" />
          </Link>
          <h1 className="text-[24px] leading-8 font-medium" style={{ fontFamily: "var(--font-h2)" }}>
            Library
          </h1>
        </header>

        {!hasBooks ? (
          <section className="mx-auto mt-24 max-w-lg text-center">
            <BookIcon className="mx-auto h-16 w-16 text-[var(--color-text-accent)]" />
            <h2 className="mt-5 text-[24px] leading-8 font-medium" style={{ fontFamily: "var(--font-h2)" }}>
              Start your first book
            </h2>
            <p className="mt-3 text-[14px] leading-[22px] text-[var(--color-secondary)]">
              Track what you read, organize your thoughts, and build deeper understanding with the help of your AI assistant.
            </p>
            <Link href="/books/new" className="mt-8 inline-flex items-center gap-3 text-[var(--color-text-accent)]">
              <PlusIcon className="h-8 w-8" />
              <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "var(--font-title)" }}>
                Add a book
              </span>
            </Link>
          </section>
        ) : (
          <div className="space-y-9">
            <section className="space-y-4">
              <h2 className="text-[20px] leading-7 font-semibold" style={{ fontFamily: "var(--font-h3)" }}>
                Currently reading
              </h2>
              {currentBook ? (
                <BookRow
                  book={currentBook}
                  href={`/books/${encodeURIComponent(currentBook.id)}`}
                  showArrow
                />
              ) : null}
            </section>

            <section className="space-y-4">
              <h2 className="text-[20px] leading-7 font-semibold" style={{ fontFamily: "var(--font-h3)" }}>
                To be read
              </h2>
              {toReadBooks.length > 0 ? (
                <div className="space-y-3">
                  {toReadBooks.map((book) => (
                    <BookRow key={book.id} book={book} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl bg-[var(--color-surface)] px-5 py-10 text-center">
                  <BookIcon className="mx-auto h-14 w-14 text-[var(--color-text-accent)]" />
                  <h3 className="mt-6 text-[20px] leading-7 font-semibold" style={{ fontFamily: "var(--font-h3)" }}>
                    You don&apos;t have any book in your &quot;To be read&quot; list
                  </h3>
                  <p className="mt-3 text-[14px] leading-[22px] text-[var(--color-secondary)]">
                    Add books you want to read in the future to swap between them
                  </p>
                  <Link href="/books/new" className="mt-8 inline-flex items-center gap-3 text-[var(--color-text-accent)]">
                    <PlusIcon className="h-8 w-8" />
                    <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "var(--font-title)" }}>
                      Add a book
                    </span>
                  </Link>
                </div>
              )}
            </section>

            {finishedBooks.length > 0 ? (
              <section className="space-y-4">
                <h2 className="text-[20px] leading-7 font-semibold" style={{ fontFamily: "var(--font-h3)" }}>
                  Finished
                </h2>
                <div className="space-y-3">
                  {finishedBooks.map((book) => (
                    <BookRow key={book.id} book={book} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>

      {hasBooks && books.length > 1 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-surface)] bg-[var(--color-page)] px-6 pb-8 pt-6">
          <div className="mx-auto max-w-2xl">
            <Link
              href="/library/switch"
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-[14px] leading-5 font-medium text-[var(--color-text-on-accent)]"
              style={{ fontFamily: "var(--font-title)" }}
            >
              <SwapVertIcon className="h-7 w-7" />
              <span>Switch current book</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
