import Link from "next/link";
import { redirect } from "next/navigation";
import AppBottomNav from "@/components/navigation/AppBottomNav";
import { fetchBooksDashboardData } from "@/lib/books/dashboard-data";
import { requireUser } from "@/lib/supabase/require-user";

const FALLBACK_SUMMARY =
  "Darrow is a red, he and his people are in the bottom of human society. He was sentenced to death but he was saved by someone unknown to him. He has a new purpose now, he will save his people.";

const FALLBACK_CHARACTERS = [
  { name: "Darrow", subtitle: "Rebel leader, Red, Passionate", slug: "" },
  { name: "Mustang", subtitle: "Rebel leader, Red, Passionate", slug: "" },
  { name: "Ragnar", subtitle: "Rebel leader, Red, Passionate", slug: "" },
  { name: "Cassius", subtitle: "Rebel leader, Red, Passionate", slug: "" },
];

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

function ChevronForwardIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden>
      <path d="M9.45 9 6 5.55 7.05 4.5 11.55 9l-4.5 4.5L6 12.45 9.45 9Z" fill="currentColor" />
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
      <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "0.01em" }}>
        {label}
      </span>
    </Link>
  );
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  if (!user) {
    redirect("/login");
  }

  const { books, currentBook } = await fetchBooksDashboardData(supabase, user.id);
  const hasCurrentBook = Boolean(currentBook);
  const switchHref = books.length > 1 ? "/library/switch" : "/library";

  const title = currentBook?.title?.trim() || "Red rising";
  const author = currentBook?.author?.trim() || "Pierce Brown";
  const startedOn = formatDate(currentBook?.firstNoteAt || currentBook?.created_at) || "9/18/2025";
  const noteCount = Number.isFinite(Number(currentBook?.noteCount)) ? Number(currentBook.noteCount) : 3;
  const lastChapter = Number.isFinite(Number(currentBook?.lastChapter)) ? Number(currentBook.lastChapter) : 20;
  const totalChapters =
    Number.isFinite(Number(currentBook?.totalChapters)) && Number(currentBook.totalChapters) > 0
      ? Number(currentBook.totalChapters)
      : 40;
  const progressPercent = formatPercent(
    hasCurrentBook ? currentBook?.progressPercent : Math.round((lastChapter * 100) / totalChapters),
  );
  const daysAgoLabel = currentBook?.daysAgoLabel?.trim() || "Last reading session 3 days ago.";
  const storySoFar = currentBook?.storySoFar?.trim() || FALLBACK_SUMMARY;
  const baseCharacters =
    hasCurrentBook && Array.isArray(currentBook?.topCharacters) && currentBook.topCharacters.length > 0
      ? currentBook.topCharacters.slice(0, 4)
      : [];
  const paddedCharacters = [...baseCharacters];
  for (const fallbackCharacter of FALLBACK_CHARACTERS) {
    if (paddedCharacters.length >= 4) break;
    const exists = paddedCharacters.some(
      (character) =>
        String(character?.name || "").toLowerCase() ===
        String(fallbackCharacter.name).toLowerCase(),
    );
    if (!exists) {
      paddedCharacters.push(fallbackCharacter);
    }
  }
  const topCharacters = paddedCharacters.slice(0, 4);
  const characterRows = pairCharacters(topCharacters);
  const coverSrc = currentBook?.cover_url || "/figma/home-book-cover.png";

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#2A2A2A]">
      <main className="mx-auto w-full max-w-[390px]">
        <section className="relative h-[282px]">
          <div className="h-[148px] bg-[#5A8A84] px-4 py-4">
            <h1 className="text-[24px] leading-8 font-medium text-white" style={{ fontFamily: "Inter, sans-serif" }}>
              Currently reading
            </h1>
          </div>

          <div className="absolute left-6 right-6 top-[62px] flex flex-col items-center gap-4 rounded-[8px] bg-[#F0EEE5] p-4">
            <div className="flex h-[132px] w-full items-center gap-4">
              <div className="h-[132px] w-[89px] overflow-hidden rounded-[8px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverSrc} alt={title} className="h-full w-full object-cover" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 self-stretch">
                <div className="w-full">
                  <div className="truncate text-[24px] leading-8 font-medium text-[#2F2F2F]" style={{ fontFamily: "Inter, sans-serif" }}>
                    {title}
                  </div>
                  <div className="truncate text-[14px] leading-[22px] text-[#4A4A4A]" style={{ fontFamily: "Inter, sans-serif" }}>
                    By {author}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex h-5 items-center gap-1 text-[#595853]">
                    <TodayIcon className="h-3 w-3 text-[#5A8A84]" />
                    <span className="text-[14px] leading-[22px]" style={{ fontFamily: "Inter, sans-serif" }}>
                      Started on {startedOn}
                    </span>
                  </div>
                  <div className="flex h-5 items-center gap-1 text-[#595853]">
                    <FolderIcon className="h-3 w-3 text-[#5A8A84]" />
                    <span className="text-[14px] leading-[22px]" style={{ fontFamily: "Inter, sans-serif" }}>
                      {noteCount} notes
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-[#D0CEC7]" />

            <div className="flex w-full items-center gap-1">
              <ActionLink
                href={hasCurrentBook ? `/books/${encodeURIComponent(currentBook.id)}` : "/books/new"}
                icon={<OpenInNewIcon className="h-6 w-6" />}
                label="Explore book"
                ariaLabel="Explore book"
              />
              <div className="h-6 w-px bg-[#D0CEC7]" />
              <ActionLink href={switchHref} icon={<SwapVertIcon className="h-6 w-6" />} label="Switch book" ariaLabel="Switch book" />
            </div>
          </div>
        </section>

        <section className="px-6 py-4">
          <div className="space-y-1">
            <h2 className="text-[20px] leading-7 font-normal text-[#2A2A2A]" style={{ fontFamily: "Inter, sans-serif" }}>
              The story so far
            </h2>
            <p className="text-[12px] leading-4 text-[#A19F99]" style={{ fontFamily: "Inter, sans-serif" }}>
              Last chapter read: Chapter {lastChapter}
            </p>
            <p
              className="pt-1 text-[14px] leading-[22px] text-[#2A2A2A] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] overflow-hidden"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {storySoFar}
            </p>
          </div>
        </section>

        <section className="px-6 py-4">
          <div className="space-y-1">
            <h2 className="text-[20px] leading-7 font-normal text-[#2A2A2A]" style={{ fontFamily: "Inter, sans-serif" }}>
              Progress
            </h2>
            <p className="text-[12px] leading-4 text-[#A19F99]" style={{ fontFamily: "Inter, sans-serif" }}>
              {daysAgoLabel}
            </p>
          </div>

          <div className="mt-4 rounded-[8px] bg-[#F0EEE5] px-4 pb-6 pt-4">
            <p className="text-[14px] leading-[22px] text-[#2A2A2A]" style={{ fontFamily: "Inter, sans-serif" }}>
              On chapter {lastChapter} of {totalChapters}
            </p>
            <div className="mt-2 flex items-end gap-4">
              <div className="h-4 flex-1 overflow-hidden rounded-[2px] bg-[#C0C0BE]">
                <div className="h-full rounded-[2px] bg-[#4C7B75]" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="h-5 w-[34px] text-[16px] leading-6 font-medium text-[#2A2A2A]" style={{ fontFamily: "Inter, sans-serif" }}>
                {progressPercent}%
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-4 pb-32">
          <div className="space-y-1">
            <h2 className="text-[20px] leading-7 font-normal text-[#2A2A2A]" style={{ fontFamily: "Inter, sans-serif" }}>
              Important characters
            </h2>
            <p className="text-[12px] leading-4 text-[#A19F99]" style={{ fontFamily: "Inter, sans-serif" }}>
              Characters that appear the most
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {characterRows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-2 gap-2">
                {row.map((character) => {
                  const key = character.slug || character.name;
                  const tile = (
                    <div className="flex items-center justify-center gap-2 rounded-[5px] bg-[#F0EEE5] px-4 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] leading-6 font-medium text-[#2F2F2F]" style={{ fontFamily: "Inter, sans-serif" }}>
                          {character.name}
                        </div>
                        <p className="truncate text-[12px] leading-4 text-[#595853]" style={{ fontFamily: "Inter, sans-serif" }}>
                          {character.subtitle || "Mentioned in your notes."}
                        </p>
                      </div>
                      <ChevronForwardIcon className="h-[18px] w-[18px] shrink-0 text-[#2A2A2A]" />
                    </div>
                  );

                  if (character.slug && hasCurrentBook) {
                    return (
                      <Link
                        key={key}
                        href={`/books/${encodeURIComponent(currentBook.id)}/characters/${encodeURIComponent(character.slug)}`}
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
            ))}
          </div>
        </section>
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
