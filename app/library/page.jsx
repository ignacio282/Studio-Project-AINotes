import Link from "next/link";
import { redirect } from "next/navigation";
import BackArrowIcon from "@/components/BackArrowIcon";
import { requireUser } from "@/lib/supabase/require-user";
import { fetchBooksDashboardData } from "@/lib/books/dashboard-data";
import { resolveQaState } from "@/lib/qa/state";
import LibraryLoading from "./loading";

function BookIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 4h10a2 2 0 0 1 2 2v13H8a2 2 0 0 0-2 2V4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 7h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LibraryEmptyStateBookIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M15 44C13.0667 44 11.4167 43.3167 10.05 41.95C8.68333 40.5833 8 38.9333 8 37V11C8 9.06667 8.68333 7.41667 10.05 6.05C11.4167 4.68333 13.0667 4 15 4H40V34C39.1667 34 38.4583 34.2917 37.875 34.875C37.2917 35.4583 37 36.1667 37 37C37 37.8333 37.2917 38.5417 37.875 39.125C38.4583 39.7083 39.1667 40 40 40V44H15ZM12 30.65C12.4667 30.4167 12.95 30.25 13.45 30.15C13.95 30.05 14.4667 30 15 30H16V8H15C14.1667 8 13.4583 8.29167 12.875 8.875C12.2917 9.45833 12 10.1667 12 11V30.65ZM20 30H36V8H20V30ZM15 40H33.65C33.45 39.5333 33.2917 39.0583 33.175 38.575C33.0583 38.0917 33 37.5667 33 37C33 36.4667 33.05 35.95 33.15 35.45C33.25 34.95 33.4167 34.4667 33.65 34H15C14.1333 34 13.4167 34.2917 12.85 34.875C12.2833 35.4583 12 36.1667 12 37C12 37.8667 12.2833 38.5833 12.85 39.15C13.4167 39.7167 14.1333 40 15 40Z"
        fill="#5A8A84"
      />
    </svg>
  );
}

function ArrowForwardIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        d="M10 3.5 8.94 4.56l4.22 4.19H4v1.5h9.16l-4.22 4.19L10 15.5l6-6-6-6Z"
        fill="currentColor"
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

function BookRow({ book, href = "", showArrow = false, compact = false }) {
  const containerClass = compact
    ? "flex items-center gap-4 rounded-[8px] bg-[#F0EEE5] px-4 py-2"
    : "flex items-center gap-4 rounded-3xl bg-[var(--color-surface)] px-5 py-4";
  const coverClass = compact
    ? "h-[71px] w-12 overflow-hidden rounded-[8px] bg-white/70"
    : "h-28 w-20 overflow-hidden rounded-xl bg-white/70";
  const arrowClass = compact
    ? "h-6 w-6 text-[#2A2A2A]"
    : "h-6 w-6 text-[var(--color-secondary)]";

  const content = (
    <div className={containerClass}>
      <div className={coverClass}>
        {book?.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <div className="type-caption flex h-full w-full items-center justify-center text-[var(--color-secondary)]">
            No cover
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="type-title truncate">
          {book?.title || "Untitled"}
        </div>
        <div className="type-body truncate text-[var(--color-secondary)]">
          By {book?.author || "Unknown author"}
        </div>
      </div>
      {showArrow ? <ArrowForwardIcon className={arrowClass} /> : null}
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

export default async function LibraryPage({ searchParams }) {
  const query = (await searchParams) || {};
  const qaState = resolveQaState(query);
  if (qaState === "loading") return <LibraryLoading />;
  if (qaState === "error") {
    throw new Error("QA forced error state on Library page.");
  }

  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");

  const { books, currentBook, toReadBooks, finishedBooks } = await fetchBooksDashboardData(
    supabase,
    user.id,
  );
  const effectiveBooks = qaState === "empty" ? [] : books;
  const effectiveCurrentBook = qaState === "empty" ? null : currentBook;
  const effectiveToReadBooks = qaState === "empty" ? [] : toReadBooks;
  const effectiveFinishedBooks = qaState === "empty" ? [] : finishedBooks;
  const hasBooks = effectiveBooks.length > 0;
  const isSingleBookNoToRead = hasBooks && effectiveBooks.length === 1 && effectiveToReadBooks.length === 0;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[var(--color-text-main)]">
      <main className="mx-auto w-full max-w-[390px] pb-32">
        <header className="flex h-16 items-center px-4">
          <Link
            href="/home"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full text-[var(--color-text-main)]"
          >
            <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
          </Link>
          <h1 className="type-h2 ml-5">
            Library
          </h1>
        </header>

        {!hasBooks ? (
          <section className="px-6 pt-4">
            <div className="h-[242px] rounded-[8px] p-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center">
                <LibraryEmptyStateBookIcon className="h-12 w-12" />
              </div>

              <div className="mx-auto mt-4 w-full max-w-[310px] text-center">
                <h2 className="type-h1 text-[#2A2A2A]">
                  Start your first book
                </h2>
                <p className="type-body text-[#595853]">
                  Track what you read, organize your thoughts, and build deeper understanding with the help of your AI assistant.
                </p>
              </div>

              <Link
                href="/books/new"
                className="mx-auto mt-4 inline-flex h-8 w-full max-w-[310px] items-center justify-center gap-2 px-1 text-[#4C7B75]"
              >
                <PlusIcon className="h-6 w-6" />
                <span className="type-button">
                  Add a book
                </span>
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div className="space-y-9 px-6 pt-4">
              <section className="space-y-4">
                <h2 className={isSingleBookNoToRead ? "type-h1" : "type-h3"}>
                  Currently reading
                </h2>
                {effectiveCurrentBook ? (
                  <BookRow
                    book={effectiveCurrentBook}
                    href={`/books/${encodeURIComponent(effectiveCurrentBook.id)}`}
                    showArrow
                    compact={isSingleBookNoToRead}
                  />
                ) : null}
              </section>

              <section className="space-y-4">
                <h2 className={isSingleBookNoToRead ? "type-h1" : "type-h3"}>
                  To be read
                </h2>
                {effectiveToReadBooks.length > 0 ? (
                  <div className="space-y-3">
                    {effectiveToReadBooks.map((book) => (
                      <BookRow key={book.id} book={book} />
                    ))}
                  </div>
                ) : isSingleBookNoToRead ? (
                  <div className="h-[252px] rounded-[8px] p-4 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center">
                      <LibraryEmptyStateBookIcon className="h-12 w-12" />
                    </div>
                    <div className="mx-auto mt-4 w-full max-w-[310px]">
                      <h3 className="type-title text-[#2A2A2A]">
                        You don&apos;t have any book in your
                        <br />
                        &quot;To be read&quot; list
                      </h3>
                      <p className="type-body mt-2 text-[#595853]">
                        Add books you want to read in the future to swap between them
                      </p>
                    </div>
                    <Link
                      href="/books/new"
                      className="mx-auto mt-4 inline-flex h-10 w-full max-w-[310px] items-center justify-center gap-2 px-1 text-[#4C7B75]"
                    >
                      <PlusIcon className="h-6 w-6" />
                      <span className="type-button">
                        Add a book
                      </span>
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-3xl bg-[var(--color-surface)] px-5 py-10 text-center">
                    <BookIcon className="mx-auto h-14 w-14 text-[var(--color-text-accent)]" />
                    <h3 className="type-h3 mt-6">
                      You don&apos;t have any book in your &quot;To be read&quot; list
                    </h3>
                    <p className="type-body mt-3 text-[var(--color-secondary)]">
                      Add books you want to read in the future to swap between them
                    </p>
                    <Link href="/books/new" className="mt-8 inline-flex items-center gap-3 text-[var(--color-text-accent)]">
                      <PlusIcon className="h-8 w-8" />
                      <span className="type-button">
                        Add a book
                      </span>
                    </Link>
                  </div>
                )}
              </section>

              {effectiveFinishedBooks.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="type-h3">
                    Finished
                  </h2>
                  <div className="space-y-3">
                    {effectiveFinishedBooks.map((book) => (
                      <BookRow key={book.id} book={book} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </>
        )}
      </main>

      {hasBooks && effectiveBooks.length > 1 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-surface)] bg-[var(--color-page)] px-6 pb-8 pt-6">
          <div className="mx-auto max-w-2xl space-y-3">
            <Link
              href="/library/switch"
              className="type-button inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-[var(--color-text-on-accent)]"
            >
              <SwapVertIcon className="h-7 w-7" />
              <span>Switch current book</span>
            </Link>
            <Link
              href="/books/new"
              className="type-button block w-full text-center text-[var(--color-text-accent)] underline"
            >
              Add new book
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
