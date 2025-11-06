import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/server";
import CollapsibleRow from "@/components/ui/CollapsibleRow";
import NoteSnippetCard from "@/components/NoteSnippetCard";

export const dynamic = "force-dynamic";

function Placeholder({ label }) {
  return <span className="text-[var(--color-text-disabled)]">{label}</span>;
}

export default async function CharacterProfilePage({ params }) {
  const { bookId, slug } = await params;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("characters")
    .select("name,role,short_bio,full_bio,first_chapter,last_chapter,timeline")
    .eq("book_id", bookId)
    .eq("slug", slug)
    .single();

  const character = error ? null : data;

  // Only show the populating badge until a short bio exists.
  const isPopulating = !(
    character && typeof character.short_bio === "string" && character.short_bio.trim().length > 0
  );

  // Fetch first/last appearance notes if chapters are known
  let firstNote = null;
  let lastNote = null;
  const chapters = [character?.first_chapter, character?.last_chapter]
    .filter((n) => Number.isFinite(n))
    .map((n) => Number(n));
  if (chapters.length) {
    const { data: notesData } = await supabase
      .from("notes")
      .select("id,content,ai_summary,created_at,chapter_number")
      .eq("book_id", bookId)
      .in("chapter_number", chapters)
      .order("created_at", { ascending: true });
    const all = Array.isArray(notesData) ? notesData : [];
    if (Number.isFinite(character?.first_chapter)) {
      const list = all.filter((n) => n.chapter_number === character.first_chapter);
      firstNote = list[0] ?? null;
    }
    if (Number.isFinite(character?.last_chapter)) {
      const list = all.filter((n) => n.chapter_number === character.last_chapter);
      lastNote = list[list.length - 1] ?? null;
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      {/* Top bar / back */}
      <div className="pt-2">
        <Link
          href={`/books/${bookId}`}
          className="inline-flex items-center gap-2 text-[var(--color-text-main)]"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sr-only">Back to book</span>
        </Link>
      </div>

      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-h1)" }}>
          {character?.name || "Unknown"}
        </h1>
        <div className="text-base text-[var(--color-secondary)]">{character?.role || "Protagonist"}</div>
        {isPopulating && (
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)] px-3 py-1">
            <svg viewBox="0 0 24 24" className="h-3 w-3 animate-spin text-[var(--color-secondary)]" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" fill="none" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>
            <span className="caption">Populating profile from your notes...</span>
          </div>
        )}
      </header>

      {/* Bio */}
      <section className="text-base leading-7 text-[var(--color-text-main)]">
        {character?.short_bio ? (
          character.short_bio
        ) : character?.full_bio ? (
          character.full_bio.length > 240 ? character.full_bio.slice(0, 240) + "..." : character.full_bio
        ) : (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-5/6 rounded bg-[color:var(--rc-color-text-secondary)/20%]" />
            <div className="h-4 w-4/6 rounded bg-[color:var(--rc-color-text-secondary)/20%]" />
            <div className="h-4 w-3/6 rounded bg-[color:var(--rc-color-text-secondary)/20%]" />
            <div className="caption text-[var(--color-secondary)]">Populating short bio...</div>
          </div>
        )}
      </section>

      {/* First/Last appearance card (both collapsed by default) */}
      <section className="rounded-2xl bg-[var(--color-surface)] p-4">
        <CollapsibleRow
          label="First Appearance"
          value={
            Number.isFinite(character?.first_chapter)
              ? `Chapter ${character.first_chapter}`
              : "-"
          }
          defaultOpen={true}
        >
          <div className="pt-1">
            <NoteSnippetCard
              bookId={bookId}
              chapter={character?.first_chapter}
              note={firstNote}
              showLink={false}
            />
          </div>
        </CollapsibleRow>

        <div className="my-3 h-px bg-[var(--color-secondary)] opacity-20" aria-hidden />

        <CollapsibleRow
          label="Last seen"
          value={
            Number.isFinite(character?.last_chapter)
              ? `Chapter ${character.last_chapter}`
              : "-"
          }
          defaultOpen={false}
        >
          <div className="pt-1">
            <NoteSnippetCard
              bookId={bookId}
              chapter={character?.last_chapter}
              note={lastNote}
              showLink={false}
            />
          </div>
        </CollapsibleRow>
      </section>

      {/* Journey timeline */}
      <section className="rounded-2xl bg-[var(--color-surface)] p-4">
        <div
          className="text-xl font-semibold text-[var(--color-text-main)]"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Journey
        </div>
        <div className="mt-4 space-y-6">
          {Array.isArray(character?.timeline) && character.timeline.length > 0 ? (
            character.timeline.map((t, idx) => (
              <div key={`${t.chapterNumber}-${idx}`} className="relative pl-7">
                {/* vertical line */}
                <span
                  className="absolute left-2 top-0 h-full w-px bg-[color:var(--rc-color-text-secondary)/30%]"
                  aria-hidden
                />
                {/* dot */}
                <span
                  className="absolute left-1.5 top-1 h-3 w-3 rounded-full border border-[color:var(--rc-color-text-secondary)] bg-transparent"
                  aria-hidden
                />
                <div className="caption">Chapter {t.chapterNumber}</div>
                <div className="mt-1 text-[var(--color-text-main)] italic line-clamp-1">
                  “{t?.snippet?.replace(/^["“”]+|["“”]+$/g, "").trim()}”
                </div>
              </div>
            ))
          ) : (
            <Placeholder label="No appearances yet" />
          )}
        </div>
      </section>
    </div>
  );
}
