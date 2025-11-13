import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/server";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function bulletsFrom(note) {
  const ai = note?.ai_summary;
  let bullets = [];
  if (ai && typeof ai === "object") {
    if (Array.isArray(ai?.bullets)) bullets = ai.bullets;
    if (!bullets.length && Array.isArray(ai)) bullets = ai; // tolerate raw list
  }
  if (!bullets.length && typeof note?.content === "string") {
    const sentences = note.content.split(/(?<=[.!?])\s+/).slice(0, 2);
    bullets = sentences.filter(Boolean);
  }
  return bullets.slice(0, 2);
}

function extractSetsFromNotes(notes) {
  const charSet = new Set();
  const placeSet = new Set();
  for (const n of notes) {
    const ai = n?.ai_summary;
    if (!ai || typeof ai !== "object") continue;
    const chars = Array.isArray(ai?.characters) ? ai.characters : [];
    const places = Array.isArray(ai?.setting) ? ai.setting : [];
    chars.forEach((c) => {
      if (typeof c === "string" && c.trim()) charSet.add(c.trim());
    });
    places.forEach((p) => {
      if (typeof p === "string" && p.trim()) placeSet.add(p.trim());
    });
  }
  return { charCount: charSet.size, placeCount: placeSet.size };
}

export const dynamic = "force-dynamic";

export default async function BookHubPage({ params }) {
  const { bookId } = await params;
  const supabase = getServiceSupabase();

  // Book basics
  const { data: book } = await supabase
    .from("books")
    .select("id,title,author,cover_url,created_at")
    .eq("id", bookId)
    .single();

  // All notes for the book (latest first)
  const { data: notesData } = await supabase
    .from("notes")
    .select("id,chapter_number,content,ai_summary,created_at")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });
  const notes = Array.isArray(notesData) ? notesData : [];

  const firstNoteAt = notes.length > 0 ? notes[notes.length - 1].created_at : null;
  const noteCount = notes.length;
  const { charCount, placeCount } = extractSetsFromNotes(notes);

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-8 bg-[var(--color-page)] px-6 pb-28 pt-6 text-[var(--color-text-main)]">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Link href="/home" className="text-[var(--color-text-main)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Book header */}
      <section className="flex items-center gap-4 rounded-2xl bg-[var(--color-surface)] p-4">
        <div className="h-28 w-20 overflow-hidden rounded-xl bg-white/60">
          {book?.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_url} alt={book?.title ?? ""} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-secondary)]">No cover</div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-h1)" }}>{book?.title || "Untitled"}</div>
          <div className="text-[var(--color-secondary)]">{book?.author || ""}</div>
          <div className="mt-3 space-y-1 text-[var(--color-secondary)]">
            <div>📅 Started on {firstNoteAt ? formatDate(firstNoteAt) : "—"}</div>
            <div>📁 {noteCount} {noteCount === 1 ? "note" : "notes"}</div>
            <div>👥 {charCount + placeCount} Entities</div>
          </div>
        </div>
      </section>

      {/* Notes section */}
      <section>
        <div className="mb-1 text-2xl font-semibold" style={{ fontFamily: "var(--font-h2)" }}>Notes</div>
        <div className="caption mb-4">{noteCount} {noteCount === 1 ? "note" : "notes"}</div>

        {/* Filter chips (non-functional placeholders) */}
        <div className="mb-4 flex gap-2 overflow-x-auto">
          <span className="rounded-xl bg-[color:var(--rc-color-accent-subtle)/60%] px-3 py-1.5">✓ All</span>
          <span className="rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] px-3 py-1.5">Chapter ▾</span>
          <span className="rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] px-3 py-1.5">Date ▾</span>
          <span className="rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] px-3 py-1.5">Character ▾</span>
          <span className="rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] px-3 py-1.5">Place ▾</span>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">Start taking notes to see them here.</div>
        ) : (
          <div className="space-y-4">
            {notes.map((n) => {
              const bullets = bulletsFrom(n);
              const href = `/books/${bookId}/chapters/${n.chapter_number}/notes/${n.id}`;
              return (
                <Link key={n.id} href={href} className="block rounded-2xl bg-[var(--color-surface)] p-4">
                  <div className="text-lg font-medium">{new Date(n.created_at).toLocaleString()}</div>
                  <div className="caption">Chapter {n.chapter_number}</div>
                  <div className="mt-2">
                    {bullets.length ? (
                      <ul className="list-disc space-y-1 pl-5">
                        {bullets.map((b, i) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <li key={i} className="text-sm text-[var(--color-text-main)]">
                            {typeof b === 'string' ? b : JSON.stringify(b)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-[var(--color-secondary)]">Open to view full note</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <div className="fixed inset-x-0 bottom-6 mx-auto w-full max-w-2xl px-6">
        <Link
          href={`/books/${bookId}/journal`}
          className="block w-full rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-center text-[var(--color-text-on-accent)]"
        >
          Write a note
        </Link>
      </div>
    </div>
  );
}

