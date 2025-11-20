import Link from "next/link";
import { headers } from "next/headers";

function SectionTitle({ children, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-h2)" }}>
        {children}
      </h2>
      {subtitle ? <p className="mt-1 text-[var(--color-secondary)]">{subtitle}</p> : null}
    </div>
  );
}

async function fetchJson(path) {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const abs = /^https?:\/\//i.test(path) ? path : `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(abs, { cache: "no-store" });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function buildRecentNotePreview(aiSummary, content, maxLength = 150) {
  let text =
    typeof content === "string" ? content.replace(/\s+/g, " ").trim() : "";

  if (!text && aiSummary) {
    if (typeof aiSummary === "string") {
      text = aiSummary;
    } else if (typeof aiSummary === "object") {
      const blocks = [];
      if (Array.isArray(aiSummary.summary)) blocks.push(...aiSummary.summary);
      if (Array.isArray(aiSummary.bullets)) blocks.push(...aiSummary.bullets);
      if (Array.isArray(aiSummary.reflections)) {
        blocks.push(...aiSummary.reflections);
      }
      if (!blocks.length && Array.isArray(aiSummary)) {
        blocks.push(...aiSummary);
      }
      text = blocks
        .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
        .join(" ");
    }
    text = (text || "").replace(/\s+/g, " ").trim();
  }

  if (!text) return "";
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const withoutPartial = sliced.replace(/\s+\S*$/, "");
  const base = withoutPartial.trim() || sliced.trim();
  return `${base} ...`;
}

export default async function HomePage() {
  const [readingData, recentData, statsData] = await Promise.all([
    fetchJson("/api/home/currently-reading"),
    fetchJson("/api/notes/recent?limit=1"),
    fetchJson("/api/home/stats"),
  ]);

  const reading = Array.isArray(readingData?.books) ? readingData.books : [];
  const recentNote = Array.isArray(recentData?.notes) ? recentData.notes[0] : null;
  const stats = statsData ?? {
    totalNotes: 0,
    mostReadBookTitle: "",
    favoriteCharacter: "",
    readingThisWeekMinutes: 0,
  };

  const hours = Math.floor((stats.readingThisWeekMinutes ?? 0) / 60);
  const hasStats = (stats.totalNotes ?? 0) > 0;

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-10 bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      {/* Currently reading */}
      <section>
        <SectionTitle>Currently reading</SectionTitle>
        {reading.length === 0 ? (
          <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">
            No books yet.{" "}
            <Link href="/books/new" className="text-[var(--color-text-accent)] underline">
              Add new Book
            </Link>
          </div>
        ) : (
          <div
            className={`flex gap-3 ${
              reading.length > 1
                ? "no-scrollbar overflow-x-auto snap-x snap-mandatory pr-8"
                : ""
            }`}
          >
            {reading.map((b, index) => {
              const isCarousel = reading.length > 1;
              const isLast = index === reading.length - 1;
              const widthClass = isCarousel
                ? isLast
                  ? "snap-start min-w-full"
                  : "snap-start min-w-[82%]"
                : "";
              return (
                <Link
                  key={b.id}
                  href={`/books/${b.id}`}
                  className={`flex w-full shrink-0 items-center gap-4 rounded-2xl bg-[var(--color-surface)] p-4 no-underline ${widthClass}`}
                >
                <div className="h-28 w-[64px] overflow-hidden rounded-xl bg-white/60">
                  {b.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverUrl} alt={b.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-secondary)]">
                      No cover
                    </div>
                  )}
                </div>
                <div className="flex-1 text-[var(--color-text-main)]">
                  <div className="text-base font-medium">{b.title}</div>
                  <div className="text-sm font-medium text-[var(--color-secondary)]">{b.author || ""}</div>
                  <div className="mt-2 text-sm text-[var(--color-secondary)]">
                    Started on {b.firstNoteAt ? formatDate(b.firstNoteAt) : formatDate(new Date().toISOString())}
                  </div>
                </div>
                <span className="rounded-full p-1.5 text-[var(--color-text-accent)]" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M9 18l6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
              );
            })}
          </div>
        )}
        {reading.length > 0 ? (
          <div className="mt-3 flex justify-center">
            <Link href="/books/new" className="inline-flex items-center gap-2 text-[var(--color-text-accent)]">
              <span className="text-xl">+</span> Add new Book
            </Link>
          </div>
        ) : null}
      </section>

      {/* Recent notes */}
      <section>
        <SectionTitle>Recent notes</SectionTitle>
        {recentNote ? (
          (() => {
            const href =
              recentNote.bookId && recentNote.chapterNumber && recentNote.id
                ? `/books/${recentNote.bookId}/chapters/${recentNote.chapterNumber}/notes/${recentNote.id}`
                : null;
            const container = (
              <div className="rounded-2xl bg-[var(--color-surface)] p-4">
                <div className="text-lg font-medium">{recentNote.bookTitle || "Untitled book"}</div>
                <div className="caption">
                  Chapter {recentNote.chapterNumber} | {formatDate(recentNote.createdAt)}
                </div>
                <div className="mt-3">
                  {(() => {
                    const preview = buildRecentNotePreview(
                      recentNote.aiSummary,
                      recentNote.content,
                    );
                    return preview ? (
                      <p className="text-sm text-[var(--color-text-main)]">
                        {preview}
                      </p>
                    ) : (
                      <div className="text-sm text-[var(--color-secondary)]">
                        No summary yet.
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
            return href ? (
              <Link href={href} className="block no-underline text-[var(--color-text-main)]">
                {container}
              </Link>
            ) : (
              container
            );
          })()
        ) : (
          <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">No notes yet.</div>
        )}
      </section>

      {/* Stats */}
      <section>
        <SectionTitle subtitle="See how your reading week is going">Stats</SectionTitle>
        <div className="rounded-2xl bg-[var(--color-surface)] p-6">
          {hasStats ? (
            <div className="flex items-stretch gap-6">
              <div className="flex flex-col items-center justify-center pr-1">
                <div className="text-5xl font-semibold leading-none">{hours}</div>
                <div className="mt-1 text-sm leading-tight">
                  <div>Hours</div>
                  <div className="caption -mt-1">Read</div>
                </div>
              </div>
              <div className="w-px self-stretch bg-[color:var(--rc-color-text-secondary)/30%]" />
              <div className="flex-1 space-y-1 text-sm">
                <div>Most read: {stats.mostReadBookTitle || "-"}</div>
                <div>Notes taken: {stats.totalNotes ?? 0}</div>
                <div>Favorite character: {stats.favoriteCharacter || "-"}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[var(--color-secondary)]">
              Start taking notes on your books to see how your reading week is going.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
