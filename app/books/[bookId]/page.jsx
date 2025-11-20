import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/server";
import BookChapterStartSheet from "@/components/BookChapterStartSheet";
import BackArrowIcon from "@/components/BackArrowIcon";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function notePreview(note) {
  const maxLength = 150;
  const content =
    typeof note?.content === "string" ? note.content.replace(/\s+/g, " ").trim() : "";
  let text = content;

  if (!text) {
    const ai = note?.ai_summary;
    if (ai && typeof ai === "object") {
      const pieces = [];
      if (Array.isArray(ai.summary)) pieces.push(...ai.summary);
      if (Array.isArray(ai.bullets)) pieces.push(...ai.bullets);
      if (!pieces.length && Array.isArray(ai)) pieces.push(...ai);
      text = pieces
        .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
        .join(" ");
    } else if (typeof ai === "string") {
      text = ai;
    }
    text = (text || "").replace(/\s+/g, " ").trim();
  }

  if (!text) return "";
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const withoutPartial = sliced.replace(/\s+\S*$/, "");
  const base = withoutPartial.trim() || sliced.trim();
  return `${base} (...)`;
}

function extractEntityCounts(notes) {
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
  const { bookId } = (await params) || {};
  const supabase = getServiceSupabase();

  const { data: book } = await supabase
    .from("books")
    .select("id,title,author,cover_url,total_chapters,created_at")
    .eq("id", bookId)
    .single();

  const { data: notesData } = await supabase
    .from("notes")
    .select("id,chapter_number,content,ai_summary,created_at")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  const notes = Array.isArray(notesData) ? notesData : [];
  const noteCount = notes.length;
  const firstNoteAt = noteCount > 0 ? notes[notes.length - 1].created_at : null;
  const { charCount, placeCount } = extractEntityCounts(notes);

  const startedOn = firstNoteAt ?? book?.created_at ?? null;
  const filtersDisabled = noteCount === 0;

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-8 bg-[var(--color-page)] px-6 pb-28 pt-6 text-[var(--color-text-main)]">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Link href="/home" className="text-[var(--color-text-main)]">
          <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
        </Link>
      </div>

      {/* Book header */}
      <section className="-mx-6 flex items-center gap-4 bg-[var(--color-surface)] px-6 py-5">
        <div className="h-28 w-20 overflow-hidden rounded-xl bg-white/60">
          {book?.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={book.cover_url}
              alt={book?.title ?? ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-secondary)]">
              No cover
            </div>
          )}
        </div>
        <div className="flex-1">
          <div
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-h1)" }}
          >
            {book?.title || "Untitled"}
          </div>
          <div className="mt-1 text-sm text-[var(--color-secondary)]">
            {book?.author || ""}
          </div>
          <div className="mt-3 space-y-1 text-sm text-[var(--color-secondary)]">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-[var(--color-page)]" aria-hidden />
              <span>
                Started on {startedOn ? formatDate(startedOn) : "-"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-[var(--color-page)]" aria-hidden />
              <span>
                {noteCount} {noteCount === 1 ? "note" : "notes"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-[var(--color-page)]" aria-hidden />
              <span>{charCount + placeCount} Entities</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notes section */}
      <section>
        <div
          className="mb-1 text-2xl font-semibold"
          style={{ fontFamily: "var(--font-h2)" }}
        >
          Notes
        </div>
        <div className="caption mb-4">
          {noteCount} {noteCount === 1 ? "note" : "notes"}
        </div>

        {/* Filter chips (non-functional placeholders) */}
        <div className="mb-4 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar">
          <span
            className={`flex-shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm ${
              filtersDisabled
                ? "bg-[var(--color-text-disabled)] text-[var(--color-secondary)]"
                : "bg-[color:var(--rc-color-accent-subtle)/60%] text-[var(--color-text-main)]"
            }`}
          >
            All
          </span>
          <span
            className={`flex-shrink-0 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm flex items-center gap-1 ${
              filtersDisabled
                ? "border-[var(--color-text-disabled)] text-[var(--color-secondary)]"
                : "border-[color:var(--rc-color-text-secondary)/35%] text-[var(--color-text-main)]"
            }`}
          >
            <span>Chapter</span>
            <span className="text-xs">▼</span>
          </span>
          <span
            className={`flex-shrink-0 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm flex items-center gap-1 ${
              filtersDisabled
                ? "border-[var(--color-text-disabled)] text-[var(--color-secondary)]"
                : "border-[color:var(--rc-color-text-secondary)/35%] text-[var(--color-text-main)]"
            }`}
          >
            <span>Date</span>
            <span className="text-xs">▼</span>
          </span>
          <span
            className={`flex-shrink-0 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm flex items-center gap-1 ${
              filtersDisabled
                ? "border-[var(--color-text-disabled)] text-[var(--color-secondary)]"
                : "border-[color:var(--rc-color-text-secondary)/35%] text-[var(--color-text-main)]"
            }`}
          >
            <span>Character</span>
            <span className="text-xs">▼</span>
          </span>
          <span
            className={`flex-shrink-0 whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm flex items-center gap-1 ${
              filtersDisabled
                ? "border-[var(--color-text-disabled)] text-[var(--color-secondary)]"
                : "border-[color:var(--rc-color-text-secondary)/35%] text-[var(--color-text-main)]"
            }`}
          >
            <span>Place</span>
            <span className="text-xs">▼</span>
          </span>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">
            Start taking notes to see them here.
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((n) => {
              const preview = notePreview(n);
              const href = `/books/${bookId}/chapters/${n.chapter_number}/notes/${n.id}`;
              return (
                <Link
                  key={n.id}
                  href={href}
                  className="block rounded-2xl bg-[var(--color-surface)] p-4"
                >
                  <div className="text-lg font-medium">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                  <div className="caption">Chapter {n.chapter_number}</div>
                  <div className="mt-2 text-sm text-[var(--color-text-main)]">
                    {preview || (
                      <span className="text-[var(--color-secondary)]">
                        Open to view full note
                      </span>
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
        <BookChapterStartSheet
          bookId={bookId}
          bookTitle={book?.title || ""}
          totalChapters={book?.total_chapters ?? null}
        />
      </div>
    </div>
  );
}
