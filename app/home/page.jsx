import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/require-user";
import { fetchBooksDashboardData } from "@/lib/books/dashboard-data";
import AppBottomNav from "@/components/navigation/AppBottomNav";

function CalendarIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M6 2.5a.75.75 0 0 1 .75.75v.5h6.5v-.5a.75.75 0 0 1 1.5 0v.5h.75A1.5 1.5 0 0 1 17 5.25v10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.75V5.25A1.5 1.5 0 0 1 4.5 3.75h.75v-.5A.75.75 0 0 1 6 2.5Zm9.5 6.25h-11v6.75h11V8.75Z"
      />
    </svg>
  );
}

function NotesIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M4.5 3.5A1.5 1.5 0 0 0 3 5v10a1.5 1.5 0 0 0 1.5 1.5h8a.75.75 0 0 0 .53-.22l3-3a.75.75 0 0 0 .22-.53V5a1.5 1.5 0 0 0-1.5-1.5h-9.5Zm0 1.5h9.5v7.44H12.5A1.5 1.5 0 0 0 11 13.94v1.56H4.5V5Z"
      />
    </svg>
  );
}

function OpenInNewIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M14 5h5v5M10 14 19 5M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function SectionHeader({ title, subtitle }) {
  return (
    <header className="space-y-1">
      <h2 className="text-[20px] leading-7 font-semibold text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-h3)" }}>
        {title}
      </h2>
      {subtitle ? <p className="caption text-[var(--color-text-disabled)]">{subtitle}</p> : null}
    </header>
  );
}

function EmptyHomeSections() {
  return (
    <>
      <section className="space-y-4">
        <SectionHeader
          title="No summary yet"
          subtitle="After your first reading session, your evolving story summary will appear here. It grows as you reflect."
        />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Progress"
          subtitle="Log your first reading session to begin tracking chapters and momentum."
        />
      </section>

      <section className="space-y-4 pb-24">
        <SectionHeader
          title="Important characters"
          subtitle="Mention characters in your notes and we will organize them here automatically."
        />
        <p className="text-[14px] leading-[22px] italic text-[var(--color-text-disabled)]">
          Tip: Tap a character later to see their evolving profile.
        </p>
      </section>
    </>
  );
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  if (!user) {
    redirect("/login");
  }

  const { books, currentBook } = await fetchBooksDashboardData(supabase, user.id);

  const hasBooks = books.length > 0;
  const hasCurrentBook = Boolean(currentBook);
  const hasNotes = Boolean(currentBook && currentBook.noteCount > 0);
  const switchHref = books.length > 1 ? "/library/switch" : "/library";

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <section className="bg-[var(--color-accent)] px-8 pb-44 pt-8">
        <h1
          className="text-[28px] leading-9 font-medium text-[var(--color-text-on-accent)]"
          style={{ fontFamily: "var(--font-h2)" }}
        >
          Currently reading
        </h1>
      </section>

      <main className="-mt-36 mx-auto max-w-2xl space-y-9 px-6 pb-44">
        {!hasBooks ? (
          <section className="rounded-3xl bg-[var(--color-surface)] px-6 py-7">
            <h2 className="text-[24px] leading-8 font-medium" style={{ fontFamily: "var(--font-h2)" }}>
              Start your first book
            </h2>
            <p className="mt-3 text-[14px] leading-[22px] text-[var(--color-secondary)]">
              Track what you read, organize your thoughts, and build deeper understanding with the help of your AI assistant.
            </p>
            <Link href="/books/new" className="mt-5 inline-flex items-center gap-3 text-[var(--color-text-accent)]">
              <PlusIcon className="h-8 w-8" />
              <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "var(--font-title)" }}>
                Add a book
              </span>
            </Link>
          </section>
        ) : (
          <section className="rounded-3xl bg-[var(--color-surface)] px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="h-36 w-24 overflow-hidden rounded-xl bg-white/70">
                {currentBook?.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentBook.cover_url} alt={currentBook.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--color-secondary)]">
                    No cover
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[24px] leading-8 font-medium" style={{ fontFamily: "var(--font-h2)" }}>
                  {currentBook?.title || "Untitled"}
                </h2>
                <p className="mt-1 truncate text-[14px] leading-[22px] text-[var(--color-secondary)]">
                  By {currentBook?.author || "Unknown author"}
                </p>

                <div className="mt-5 space-y-2 text-[14px] leading-[22px] text-[var(--color-secondary)]">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-[var(--color-text-accent)]" />
                    <span>Started on {formatDate(currentBook?.firstNoteAt || currentBook?.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <NotesIcon className="h-4 w-4 text-[var(--color-text-accent)]" />
                    <span>{currentBook?.noteCount || 0} notes</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-[var(--color-text-disabled)]/40 pt-4">
              <div className="grid grid-cols-2">
                <Link
                  href={`/books/${encodeURIComponent(currentBook?.id || "")}`}
                  className="inline-flex items-center justify-center gap-2 border-r border-[var(--color-text-disabled)]/40 py-2 text-[var(--color-text-accent)]"
                >
                  <OpenInNewIcon className="h-6 w-6" />
                  <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "var(--font-title)" }}>
                    Explore book
                  </span>
                </Link>
                <Link
                  href={switchHref}
                  className="inline-flex items-center justify-center gap-2 py-2 text-[var(--color-text-accent)]"
                >
                  <SwapVertIcon className="h-6 w-6" />
                  <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "var(--font-title)" }}>
                    Switch book
                  </span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {!hasBooks || !hasNotes ? (
          <EmptyHomeSections />
        ) : (
          <>
            <section className="space-y-3">
              <SectionHeader
                title="The story so far"
                subtitle={`Last chapter read: Chapter ${currentBook.lastChapter || "-"}`}
              />
              <p className="text-[14px] leading-[22px] text-[var(--color-text-main)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] overflow-hidden">
                {currentBook.storySoFar || "No summary yet."}
              </p>
            </section>

            <section className="space-y-4">
              <SectionHeader title="Progress" subtitle={currentBook.daysAgoLabel || "Last reading session -"} />

              <div className="rounded-3xl bg-[var(--color-surface)] px-5 py-5">
                <div className="text-[14px] leading-[22px] text-[var(--color-text-main)]">
                  On chapter <strong>{currentBook.lastChapter || 0}</strong> of{" "}
                  <strong>{currentBook.totalChapters || "-"}</strong>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-text-disabled)]/60">
                    <div
                      className="h-full rounded bg-[var(--color-accent)]"
                      style={{ width: `${currentBook.progressPercent || 0}%` }}
                    />
                  </div>
                  <div className="text-[24px] leading-8 font-semibold text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-h3)" }}>
                    {currentBook.progressPercent || 0}%
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 pb-24">
              <SectionHeader title="Important characters" subtitle="Characters that appear the most" />

              {currentBook.topCharacters.length === 0 ? (
                <>
                  <p className="caption text-[var(--color-text-disabled)]">
                    Mention characters in your notes and we will organize them here automatically.
                  </p>
                  <p className="text-[32px] leading-6 italic text-[var(--color-text-disabled)]">
                    Tip: Tap a character later to see their evolving profile.
                  </p>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {currentBook.topCharacters.slice(0, 4).map((character) => {
                    const row = (
                      <div className="rounded-2xl bg-[var(--color-surface)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[20px] leading-7 font-medium" style={{ fontFamily: "var(--font-h2)" }}>
                              {character.name}
                            </div>
                            <p className="mt-1 text-[14px] leading-[22px] text-[var(--color-secondary)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                              {character.subtitle}
                            </p>
                          </div>
                          <ArrowRightIcon className="mt-1 h-5 w-5 shrink-0 text-[var(--color-text-main)]" />
                        </div>
                      </div>
                    );

                    return character.slug ? (
                      <Link
                        key={character.slug}
                        href={`/books/${encodeURIComponent(currentBook.id)}/characters/${encodeURIComponent(character.slug)}`}
                        className="block"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div key={character.name}>{row}</div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <AppBottomNav
        active="home"
        hasActionContext={hasCurrentBook}
        currentBookId={currentBook?.id || ""}
        currentBookTitle={currentBook?.title || ""}
      />
    </div>
  );
}
