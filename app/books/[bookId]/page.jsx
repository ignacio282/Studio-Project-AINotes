import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BookChapterStartSheet from "@/components/BookChapterStartSheet";
import BackArrowIcon from "@/components/BackArrowIcon";
import BookHubTabs from "@/components/BookHubTabs";

function CalendarIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M6 2.5a.75.75 0 0 1 .75.75v.5h6.5v-.5a.75.75 0 0 1 1.5 0v.5h.75A1.5 1.5 0 0 1 17 5.25v10.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.75V5.25A1.5 1.5 0 0 1 4.5 3.75h.75v-.5A.75.75 0 0 1 6 2.5Zm9.5 6.25h-11v6.75h11V8.75Z"
      />
    </svg>
  );
}

function NotesIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M4.5 3.5A1.5 1.5 0 0 0 3 5v10a1.5 1.5 0 0 0 1.5 1.5h8a.75.75 0 0 0 .53-.22l3-3a.75.75 0 0 0 .22-.53V5a1.5 1.5 0 0 0-1.5-1.5h-9.5Zm0 1.5h9.5v7.44H12.5A1.5 1.5 0 0 0 11 13.94v1.56H4.5V5Z"
      />
    </svg>
  );
}

function EntityIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M10 2.75a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 7.5c3.28 0 5.75 1.67 5.75 3.75v1.25a.75.75 0 0 1-.75.75h-10a.75.75 0 0 1-.75-.75V14c0-2.08 2.47-3.75 5.75-3.75Z"
      />
    </svg>
  );
}

function slugifyName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

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

function extractEntities(notes) {
  const characterMap = new Map();
  const placeSet = new Set();

  for (const n of notes) {
    const ai = n?.ai_summary;
    if (!ai || typeof ai !== "object") continue;
    const chars = Array.isArray(ai?.characters) ? ai.characters : [];
    const places = Array.isArray(ai?.setting) ? ai.setting : [];
    const chapter = Number.isFinite(n?.chapter_number) ? Number(n.chapter_number) : null;

    chars.forEach((c) => {
      if (typeof c !== "string") return;
      const name = c.trim();
      if (!name) return;
      const slug = slugifyName(name);
      if (!slug) return;
      const existing = characterMap.get(slug);
      if (!existing) {
        characterMap.set(slug, {
          name,
          slug,
          firstChapter: chapter,
          lastChapter: chapter,
        });
        return;
      }
      if (Number.isFinite(chapter)) {
        if (!Number.isFinite(existing.firstChapter) || chapter < existing.firstChapter) {
          existing.firstChapter = chapter;
        }
        if (!Number.isFinite(existing.lastChapter) || chapter > existing.lastChapter) {
          existing.lastChapter = chapter;
        }
      }
    });
    places.forEach((p) => {
      if (typeof p === "string" && p.trim()) placeSet.add(p.trim());
    });
  }

  return {
    characters: Array.from(characterMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    places: Array.from(placeSet).sort((a, b) => a.localeCompare(b)),
  };
}

export const dynamic = "force-dynamic";

export default async function BookHubPage({ params }) {
  const { bookId } = (await params) || {};
  const supabase = getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect("/login");
  }
  const userId = authData.user.id;

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

  const { data: charactersData } = await supabase
    .from("characters")
    .select("id,slug,name")
    .eq("book_id", bookId)
    .order("name", { ascending: true });

  const notes = Array.isArray(notesData) ? notesData : [];
  const characters = Array.isArray(charactersData) ? charactersData : [];
  const noteCount = notes.length;
  const firstNoteAt = noteCount > 0 ? notes[notes.length - 1].created_at : null;
  const { characters: noteCharacters, places } = extractEntities(notes);
  const charCount = noteCharacters.length;
  const placeCount = places.length;

  const startedOn = firstNoteAt ?? book?.created_at ?? null;
  const filtersDisabled = noteCount === 0;
  const notesForTabs = notes.map((n) => ({
    id: n.id,
    chapter_number: n.chapter_number,
    created_at: n.created_at,
    preview: notePreview(n),
  }));
  const characterLookup = new Map(
    characters
      .filter((entry) => typeof entry?.slug === "string" && entry.slug.trim())
      .map((entry) => [entry.slug, entry]),
  );
  const missingCharacters = noteCharacters
    .filter((entry) => !characterLookup.has(entry.slug))
    .map((entry) => ({
      book_id: bookId,
      user_id: userId,
      slug: entry.slug,
      name: entry.name,
      role: null,
      short_bio: null,
      full_bio: null,
      first_chapter: Number.isFinite(entry.firstChapter) ? entry.firstChapter : null,
      last_chapter: Number.isFinite(entry.lastChapter) ? entry.lastChapter : null,
      relationships: [],
      timeline: [],
      updated_at: new Date().toISOString(),
    }));
  if (missingCharacters.length > 0) {
    await supabase.from("characters").upsert(missingCharacters, { onConflict: "book_id,slug" });
    missingCharacters.forEach((entry) => {
      characterLookup.set(entry.slug, entry);
    });
  }
  const charactersForTabs = noteCharacters.map((entry) => {
    const match = characterLookup.get(entry.slug);
    return { name: match?.name || entry.name, slug: entry.slug };
  });

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-surface)] bg-[var(--color-page)]">
        <div className="mx-auto flex max-w-2xl items-center px-6 py-4">
          <Link href="/home" className="text-[var(--color-text-main)]">
            <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-6 pb-44">
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
                <CalendarIcon className="h-4 w-4 text-[var(--color-text-accent)]" />
                <span>Started on {startedOn ? formatDate(startedOn) : "-"}</span>
              </div>
              <div className="flex items-center gap-2">
                <NotesIcon className="h-4 w-4 text-[var(--color-text-accent)]" />
                <span>
                  {noteCount} {noteCount === 1 ? "note" : "notes"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <EntityIcon className="h-4 w-4 text-[var(--color-text-accent)]" />
                <span>{charCount + placeCount} Entities</span>
              </div>
            </div>
          </div>
        </section>

        <BookHubTabs
          bookId={bookId}
          noteCount={noteCount}
          notes={notesForTabs}
          filtersDisabled={filtersDisabled}
          characters={charactersForTabs}
          places={places}
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-[var(--color-bg-subtle)] shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-2xl space-y-3 px-6 py-4">
          <BookChapterStartSheet
            bookId={bookId}
            bookTitle={book?.title || ""}
            totalChapters={book?.total_chapters ?? null}
          />
          <Link
            href={`/books/${bookId}/assistant`}
            className="block text-center text-sm font-medium text-[var(--color-text-accent)]"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Open assistant
          </Link>
        </div>
      </div>
    </div>
  );
}
