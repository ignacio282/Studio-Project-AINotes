import Link from "next/link";
import { headers } from "next/headers";

function SectionTitle({ children, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-h2)" }}>{children}</h2>
      {subtitle ? <p className="mt-1 text-[var(--color-secondary)]">{subtitle}</p> : null}
    </div>
  );
}

async function fetchJson(path) {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const abs = /^https?:\/\//i.test(path) ? path : `${proto}://${host}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(abs, { cache: "no-store" });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

export default async function HomePage() {
  const [readingData, recentData, statsData] = await Promise.all([
    fetchJson("/api/home/currently-reading"),
    fetchJson("/api/notes/recent?limit=1"),
    fetchJson("/api/home/stats"),
  ]);

  const reading = Array.isArray(readingData?.books) ? readingData.books : [];
  const recentNote = Array.isArray(recentData?.notes) ? recentData.notes[0] : null;
  const stats = statsData ?? { totalNotes: 0, mostReadBookTitle: "", favoriteCharacter: "", readingThisWeekMinutes: 0 };

  const hours = Math.floor((stats.readingThisWeekMinutes ?? 0) / 60);

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-10 bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      {/* Currently reading */}
      <section>
        <SectionTitle>Currently reading</SectionTitle>
        {reading.length === 0 ? (
          <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">
            No books yet. <Link href="/books/new" className="text-[var(--color-text-accent)] underline">Add new Book</Link>
          </div>
        ) : (
          <div className={`flex gap-4 ${reading.length > 1 ? 'overflow-x-auto snap-x snap-mandatory' : ''}`}>
            {reading.map((b) => (
              <div key={b.id} className={`flex w-full shrink-0 items-center gap-4 rounded-2xl bg-[var(--color-surface)] p-4 ${reading.length>1?'snap-center min-w-[90%]':''}`}>
                {/* Cover */}
                <div className="h-28 w-20 overflow-hidden rounded-xl bg-white/60">
                  {b.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.coverUrl} alt={b.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-secondary)]">No cover</div>
                  )}
                </div>
                {/* Meta */}
                <div className="flex-1">
                  <div className="text-lg font-medium">{b.title}</div>
                  <div className="text-[var(--color-secondary)]">{b.author || ""}</div>
                  <div className="mt-2 caption">Started on {b.firstNoteAt ? formatDate(b.firstNoteAt) : formatDate(new Date().toISOString())}</div>
                </div>
                <Link href={`/books/${b.id}`} className="rounded-full p-2 text-[var(--color-text-accent)]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        )}
        {reading.length > 0 ? (
          <div className="mt-3">
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
          <div className="rounded-2xl bg-[var(--color-surface)] p-4">
            <div className="text-lg font-medium">{recentNote.bookTitle || "Untitled book"}</div>
            <div className="caption">Chapter {recentNote.chapterNumber} | {formatDate(recentNote.createdAt)}</div>
            <div className="mt-3">
              {/* bullets from AI summary if available */}
              {Array.isArray(recentNote.aiSummary?.bullets) && recentNote.aiSummary.bullets.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5">
                  {recentNote.aiSummary.bullets.slice(0,2).map((b, i) => (
                    <li key={i} className="text-sm">{typeof b === 'string' ? b : JSON.stringify(b)}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-[var(--color-secondary)]">No summary yet.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">No notes yet.</div>
        )}
      </section>

      {/* Stats */}
      <section>
        <SectionTitle subtitle="See how your reading week is going">Stats</SectionTitle>
        <div className="flex items-center gap-6 rounded-2xl bg-[var(--color-surface)] p-6">
          <div className="flex items-baseline gap-2">
            <div className="text-5xl font-semibold">{hours}</div>
            <div className="leading-tight"><div>Hours</div><div className="caption -mt-1">Read</div></div>
          </div>
          <div className="h-12 w-px bg-[color:var(--rc-color-text-secondary)/30%]" />
          <div className="space-y-1 text-sm">
            <div>Most read: {stats.mostReadBookTitle || "—"}</div>
            <div>Notes taken: {stats.totalNotes ?? 0}</div>
            <div>Favorite character: {stats.favoriteCharacter || "—"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
