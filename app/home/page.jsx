import Link from "next/link";
import { redirect } from "next/navigation";
import AppBottomNav from "@/components/navigation/AppBottomNav";
import SignOutButton from "@/components/SignOutButton";
import { fetchBooksDashboardData } from "@/lib/books/dashboard-data";
import HomeLoading from "./loading";
import { requireUser } from "@/lib/supabase/require-user";
import { resolveQaState } from "@/lib/qa/state";
import {
  getProgressEmptyText,
  getProgressLastReadText,
  getProgressProgressText,
  normalizeTrackingMode,
} from "@/lib/books/progress";

function TodayIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden>
      <path d="M4.5 8.25c-.35 0-.646-.121-.888-.362A1.21 1.21 0 0 1 3.25 7c0-.35.121-.646.362-.888A1.21 1.21 0 0 1 4.5 5.75c.35 0 .646.121.888.362.241.242.362.538.362.888 0 .35-.121.646-.362.887-.242.242-.538.363-.888.363ZM2.5 11c-.275 0-.51-.098-.706-.294A.96.96 0 0 1 1.5 10V3c0-.275.098-.51.294-.706A.96.96 0 0 1 2.5 2H3V1h1v1h4V1h1v1h.5c.275 0 .51.098.706.294.196.196.294.431.294.706v7c0 .275-.098.51-.294.706-.196.196-.431.294-.706.294h-7Zm0-1h7V5h-7v5Z" fill="currentColor" />
    </svg>
  );
}

function FolderIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden>
      <path d="M2 10a.96.96 0 0 1-.706-.294A.96.96 0 0 1 1 9V3c0-.275.098-.51.294-.706A.96.96 0 0 1 2 2h3l1 1h4c.275 0 .51.098.706.294.196.196.294.431.294.706v5c0 .275-.098.51-.294.706A.96.96 0 0 1 10 10H2Zm0-1h8V4H5.588l-1-1H2v6Z" fill="currentColor" />
    </svg>
  );
}

function OpenInNewIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7ZM14 3v2h3.59L7.76 14.83l1.41 1.41L19 6.41V10h2V3h-7Z" fill="currentColor" />
    </svg>
  );
}

function SwapVertIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M8 13V5.825L5.425 8.4 4 7l5-5 5 5-1.425 1.4L10 5.825V13H8Zm7 9-5-5 1.425-1.4L14 18.175V11h2v7.175l2.575-2.575L20 17l-5 5Z" fill="currentColor" />
    </svg>
  );
}

function AddIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronForwardIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7.22 4.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 0-1.06Z"
      />
    </svg>
  );
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const value = new Date(isoDate);
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function pairCharacters(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

function ActionLink({ href, icon, label, ariaLabel }) {
  return (
    <Link href={href} aria-label={ariaLabel} className="flex flex-1 items-center justify-center gap-2 px-1 text-[#4C7B75]">
      <span className="h-6 w-6">{icon}</span>
      <span className="type-button tracking-[0.01em]">
        {label}
      </span>
    </Link>
  );
}

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const query = (await searchParams) || {};
  const qaState = resolveQaState(query);
  if (qaState === "loading") return <HomeLoading />;
  if (qaState === "error") {
    throw new Error("QA forced error state on Home page.");
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    redirect("/login");
  }

  const { books, currentBook } = await fetchBooksDashboardData(supabase, user.id);
  const effectiveBooks = qaState === "empty" ? [] : books;
  const effectiveCurrentBook = qaState === "empty" ? null : currentBook;
  const hasCurrentBook = Boolean(effectiveCurrentBook);
  const canSwitchBooks = effectiveBooks.length > 1;
  const switchHref = "/library/switch";

  const title = effectiveCurrentBook?.title?.trim() || "No current book";
  const author = effectiveCurrentBook?.author?.trim() || (hasCurrentBook ? "Author not set" : "Add a book to begin");
  const startedOn = formatDate(effectiveCurrentBook?.firstNoteAt || effectiveCurrentBook?.created_at) || "";
  const noteCount = Number.isFinite(Number(effectiveCurrentBook?.noteCount)) ? Number(effectiveCurrentBook.noteCount) : 0;
  const trackingMode = normalizeTrackingMode(effectiveCurrentBook?.trackingMode);
  const lastProgressValue =
    Number.isFinite(Number(effectiveCurrentBook?.lastProgressValue)) ? Number(effectiveCurrentBook.lastProgressValue) : null;
  const totalProgressValue =
    Number.isFinite(Number(effectiveCurrentBook?.totalProgressValue)) ? Number(effectiveCurrentBook.totalProgressValue) : null;
  const progressPercent = formatPercent(effectiveCurrentBook?.progressPercent ?? 0);
  const daysAgoLabel = hasCurrentBook
    ? effectiveCurrentBook?.daysAgoLabel?.trim() || "No reading sessions logged yet."
    : "Add your first book to start tracking progress.";
  const storySoFar = hasCurrentBook
    ? effectiveCurrentBook?.storySoFar?.trim() || "No reading summary yet. Write a note to build your story summary."
    : "Your reading summaries will appear here after you add a book and write your first note.";
  const baseCharacters =
    hasCurrentBook && Array.isArray(effectiveCurrentBook?.topCharacters) && effectiveCurrentBook.topCharacters.length > 0
      ? effectiveCurrentBook.topCharacters.slice(0, 4)
      : [];
  const topCharacters = baseCharacters.slice(0, 4);
  const characterRows = pairCharacters(topCharacters);
  const coverSrc = effectiveCurrentBook?.cover_url || "";
  const canShowProgress =
    hasCurrentBook &&
    Number.isFinite(lastProgressValue) &&
    (trackingMode === "percent" || Number.isFinite(totalProgressValue));
  const primaryActionHref = hasCurrentBook ? `/books/${encodeURIComponent(effectiveCurrentBook.id)}` : "/books/new";
  const primaryActionLabel = hasCurrentBook ? "Explore book" : "Add book";

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2A2A2A]">
      <main className="mx-auto w-full sm:max-w-screen-sm">
        <section className={`relative ${hasCurrentBook ? "h-[282px]" : "h-[284px]"}`}>
          <div className="h-[148px] bg-[#5A8A84] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="type-h1 text-white">
                Currently reading
              </h1>
              <SignOutButton className="type-button rounded-full border border-white/60 px-3 py-1 text-white transition hover:bg-white/10" />
            </div>
          </div>

          {hasCurrentBook ? (
            <div className="absolute left-6 right-6 top-[62px] flex flex-col items-center gap-4 rounded-[8px] bg-[#F0EEE5] p-4">
              <div className="flex h-[132px] w-full items-center gap-4">
                <div className="h-[132px] w-[89px] overflow-hidden rounded-[8px]">
                  {coverSrc ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverSrc} alt={title} className="h-full w-full object-cover" />
                    </>
                  ) : (
                    <div className="type-caption flex h-full w-full items-center justify-center bg-white/70 px-2 text-center text-[#595853]">
                      No cover yet
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 self-stretch">
                  <div className="w-full">
                    <div className="type-h1 truncate text-[#2F2F2F]">
                      {title}
                    </div>
                    <div className="type-body truncate text-[#4A4A4A]">
                      By {author}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex h-5 items-center gap-1 text-[#595853]">
                      <TodayIcon className="h-3 w-3 text-[#5A8A84]" />
                      <span className="type-body">
                        {startedOn ? `Started on ${startedOn}` : "Start your first session"}
                      </span>
                    </div>
                    <div className="flex h-5 items-center gap-1 text-[#595853]">
                      <FolderIcon className="h-3 w-3 text-[#5A8A84]" />
                      <span className="type-body">
                        {noteCount} notes
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-[#D0CEC7]" />

              <div className="flex w-full items-center gap-1">
                <ActionLink
                  href={primaryActionHref}
                  icon={<OpenInNewIcon className="h-6 w-6" />}
                  label={primaryActionLabel}
                  ariaLabel={primaryActionLabel}
                />
                {canSwitchBooks ? (
                  <>
                    <div className="h-6 w-px bg-[#D0CEC7]" />
                    <ActionLink
                      href={switchHref}
                      icon={<SwapVertIcon className="h-6 w-6" />}
                      label="Switch book"
                      ariaLabel="Switch book"
                    />
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="absolute left-6 right-6 top-[62px] rounded-[8px] bg-[#F0EEE5] p-4">
              <h2 className="type-h1 text-[#2F2F2F]">
                Start your first book
              </h2>
              <p className="type-body mt-3 text-[#595853]">
                Track what you read, organize your thoughts, and build deeper understanding with the help of your AI assistant.
              </p>
              <Link href="/books/new" className="mt-4 inline-flex items-center gap-2 px-1 text-[#4C7B75]">
                <AddIcon className="h-6 w-6" />
                <span className="type-button">Add a book</span>
              </Link>
            </div>
          )}
        </section>

        {hasCurrentBook ? (
          <>
            <section className="px-6 py-4">
              <div className="space-y-1">
                <h2 className="type-h3 text-[#2A2A2A]">
                  The story so far
                </h2>
                <p className="type-caption text-[#A19F99]">
                  {lastProgressValue
                    ? getProgressLastReadText(trackingMode, lastProgressValue)
                    : "No reading progress logged yet"}
                </p>
                <p
                  className="type-body pt-1 text-[#2A2A2A] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] overflow-hidden"
                >
                  {storySoFar}
                </p>
              </div>
            </section>

            <section className="px-6 py-4">
              <div className="space-y-1">
                <h2 className="type-h3 text-[#2A2A2A]">
                  Progress
                </h2>
                <p className="type-caption text-[#A19F99]">
                  {daysAgoLabel}
                </p>
              </div>

              <div className="mt-4 rounded-[8px] bg-[#F0EEE5] px-4 pb-6 pt-4">
                <p className="type-body text-[#2A2A2A]">
                  {canShowProgress
                    ? getProgressProgressText(trackingMode, lastProgressValue, totalProgressValue)
                    : getProgressEmptyText(trackingMode)}
                </p>
                <div className="mt-2 flex items-end gap-4">
                  <div className="h-4 flex-1 overflow-hidden rounded-[2px] bg-[#C0C0BE]">
                    <div className="h-full rounded-[2px] bg-[#4C7B75]" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <div className="type-title h-5 w-[34px] text-[#2A2A2A]">
                    {progressPercent}%
                  </div>
                </div>
              </div>
            </section>

            <section className="px-6 py-4 pb-32">
              <div className="space-y-1">
                <h2 className="type-h3 text-[#2A2A2A]">
                  Important characters
                </h2>
                <p className="type-caption text-[#A19F99]">
                  Characters that appear the most
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {characterRows.length > 0 ? (
                  characterRows.map((row, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="grid grid-cols-2 gap-2">
                      {row.map((character) => {
                        const key = character.slug || character.name;
                        const tile = (
                          <div className="flex items-center justify-center gap-2 rounded-[5px] bg-[#F0EEE5] px-4 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="type-title truncate text-[#2F2F2F]">
                                {character.name}
                              </div>
                              <p className="type-caption truncate text-[#595853]">
                                {character.subtitle || "Mentioned in your notes."}
                              </p>
                            </div>
                            <ChevronForwardIcon className="h-5 w-5 shrink-0 text-[#595853]" />
                          </div>
                        );

                        if (character.slug && hasCurrentBook) {
                          return (
                            <Link
                              key={key}
                              href={`/books/${encodeURIComponent(effectiveCurrentBook.id)}/characters/${encodeURIComponent(character.slug)}`}
                            >
                              {tile}
                            </Link>
                          );
                        }

                        return (
                          <div key={key}>
                            {tile}
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div className="type-body rounded-[8px] bg-[#F0EEE5] px-4 py-5 text-[#595853]">
                    Important characters will show up here once they are mentioned in your notes.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="px-6 py-4">
              <div className="space-y-1">
                <h2 className="type-h3 text-[#2A2A2A]">
                  No summary yet
                </h2>
                <p className="type-body text-[#9C9A95]">
                  After your first reading session, your evolving story summary will appear here. It grows as you reflect.
                </p>
              </div>
            </section>

            <section className="px-6 py-4">
              <div className="space-y-1">
                <h2 className="type-h3 text-[#2A2A2A]">
                  Progress
                </h2>
                <p className="type-body text-[#9C9A95]">
                  Log your first reading session to begin tracking progress and momentum.
                </p>
              </div>
            </section>

            <section className="px-6 py-4 pb-32">
              <div className="space-y-1">
                <h2 className="type-h3 text-[#2A2A2A]">
                  Important characters
                </h2>
                <p className="type-body text-[#9C9A95]">
                  Mention characters in your notes and we will organize them here automatically.
                </p>
                <p className="type-caption pt-1 italic text-[#9C9A95]">
                  Tip: Tap a character later to see their evolving profile.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      <AppBottomNav
        active="home"
        hasActionContext={hasCurrentBook}
        currentBookId={effectiveCurrentBook?.id || ""}
        currentBookTitle={effectiveCurrentBook?.title || ""}
      />
    </div>
  );
}
