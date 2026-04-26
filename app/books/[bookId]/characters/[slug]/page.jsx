import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackArrowIcon from "@/components/BackArrowIcon";
import CharacterProfileMenu from "@/components/CharacterProfileMenu";
import CharacterProfileSheet from "@/components/CharacterProfileSheet";
import QaLoadingPage from "@/components/qa/QaLoadingPage";
import { resolveQaState } from "@/lib/qa/state";
import { normalizeTrackingMode } from "@/lib/books/progress";
import { buildCharacterSnapshotFromKnowledge, fetchCharacterKnowledge } from "@/lib/knowledge/read";

export const dynamic = "force-dynamic";

function getTimelineChapters(timeline) {
  if (!Array.isArray(timeline)) return [];
  return timeline
    .map((entry) => Number(entry?.chapterNumber ?? entry?.chapter))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function getSnapshotChapters(snapshot) {
  const sourceChapters = Array.isArray(snapshot?.sources) ? snapshot.sources : [];
  const timelineChapters = Array.isArray(snapshot?.structured?.timeline)
    ? snapshot.structured.timeline.map((entry) => Number(entry?.chapterNumber ?? entry?.chapter))
    : [];
  return [...sourceChapters, ...timelineChapters]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function getSnapshotVersion(snapshot) {
  return Number(snapshot?.structured?.characterSheetVersion) || 0;
}

function isSnapshotFreshForCharacter(snapshot, character) {
  if (!snapshot?.created_at) return false;
  const snapshotTime = new Date(snapshot.created_at).getTime();
  const characterTime = new Date(character?.updated_at || "").getTime();
  if (!Number.isFinite(snapshotTime)) return false;
  if (!Number.isFinite(characterTime)) return true;
  return snapshotTime >= characterTime;
}

function buildNoteLinks(notes, bookId) {
  const links = {};
  const sorted = Array.isArray(notes) ? notes : [];
  sorted.forEach((note) => {
    const chapter = Number(note?.chapter_number);
    if (!Number.isFinite(chapter) || !note?.id || links[String(chapter)]) return;
    links[String(chapter)] = `/books/${bookId}/chapters/${chapter}/notes/${note.id}`;
  });
  return links;
}

function buildNoteLinksFromKnowledge(mentions, bookId) {
  const links = {};
  const sorted = Array.isArray(mentions) ? mentions : [];
  sorted.forEach((mention) => {
    const chapter = Number(mention?.chapter_number);
    if (!Number.isFinite(chapter) || !mention?.note_id || links[String(chapter)]) return;
    links[String(chapter)] = `/books/${bookId}/chapters/${chapter}/notes/${mention.note_id}`;
  });
  return links;
}

function noteMentionsCharacter(note, characterName) {
  const target = typeof characterName === "string" ? characterName.toLowerCase() : "";
  if (!target) return false;
  const content = typeof note?.content === "string" ? note.content.toLowerCase() : "";
  const summary = JSON.stringify(note?.ai_summary ?? {}).toLowerCase();
  return content.includes(target) || summary.includes(target);
}

export default async function CharacterProfilePage({ params, searchParams }) {
  const { bookId, slug } = await params;
  const query = (await searchParams) || {};
  const qaState = resolveQaState(query);
  if (qaState === "loading") return <QaLoadingPage title="Loading character profile preview..." />;
  if (qaState === "error") {
    throw new Error("QA forced error state on Character page.");
  }

  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) {
    redirect("/login");
  }

  const [{ data: book }, characterResponse, snapshotResponse, knowledgeResult] = await Promise.all([
    supabase
      .from("books")
      .select("tracking_mode")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("characters")
      .select("name,role,short_bio,full_bio,first_chapter,last_chapter,relationships,timeline,updated_at")
      .eq("book_id", bookId)
      .eq("slug", slug)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("character_assistant_snapshots")
      .select("id,user_id,book_id,character_slug,question,answer,structured,sources,max_chapter,created_at")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .eq("character_slug", slug)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchCharacterKnowledge(supabase, user.id, bookId, slug).catch((error) => {
      console.error("Failed to read character knowledge:", error);
      return null;
    }),
  ]);

  const character = qaState === "empty" ? null : characterResponse.data ?? null;
  const snapshot = qaState === "empty" ? null : snapshotResponse.data ?? null;
  const knowledge = qaState === "empty" ? null : knowledgeResult;
  const knowledgeSnapshot = buildCharacterSnapshotFromKnowledge(knowledge);
  const trackingMode = normalizeTrackingMode(book?.tracking_mode);

  const knowledgeCharacter = knowledge
    ? {
        name: knowledge.entity.name,
        role: character?.role || knowledge.entity.profile?.role || null,
        short_bio: knowledge.entity.profile?.summary || character?.short_bio || null,
        full_bio: character?.full_bio || null,
        first_chapter: knowledge.entity.first_chapter ?? character?.first_chapter ?? null,
        last_chapter: knowledge.entity.last_chapter ?? character?.last_chapter ?? null,
        relationships: knowledge.relationships
          .map((row) => {
            const other = row.otherName ? `${row.otherName}: ` : "";
            return `${other}${row.description || row.label || row.evidence || ""}`.trim();
          })
          .filter(Boolean),
        timeline: knowledge.timeline
          .map((row) => ({
            chapterNumber: row.chapter_number,
            event: row.event_text,
            noteId: row.note_id,
          }))
          .filter((row) => row.event),
        updated_at: knowledge.entity.updated_at,
      }
    : null;

  const chapterCandidates = [
    knowledgeCharacter?.first_chapter,
    knowledgeCharacter?.last_chapter,
    character?.first_chapter,
    character?.last_chapter,
    ...getTimelineChapters(knowledgeCharacter?.timeline),
    ...getTimelineChapters(character?.timeline),
    ...getSnapshotChapters(knowledgeSnapshot),
    ...getSnapshotChapters(snapshot),
  ]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const chapters = Array.from(new Set(chapterCandidates));

  let notes = [];
  let noteLinks = knowledge ? buildNoteLinksFromKnowledge(knowledge.mentions, bookId) : {};
  if (Object.keys(noteLinks).length > 0) {
    notes = [];
  } else if (character?.name || knowledgeCharacter?.name) {
    const { data: notesData } = await supabase
      .from("notes")
      .select("id,chapter_number,created_at,content,ai_summary")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const name = character?.name || knowledgeCharacter?.name;
    notes = (Array.isArray(notesData) ? notesData : []).filter((note) =>
      noteMentionsCharacter(note, name),
    );
  } else if (chapters.length > 0) {
    const { data: notesData } = await supabase
      .from("notes")
      .select("id,chapter_number,created_at")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .in("chapter_number", chapters)
      .order("created_at", { ascending: false });
    notes = Array.isArray(notesData) ? notesData : [];
  }

  if (Object.keys(noteLinks).length === 0) {
    noteLinks = buildNoteLinks(notes, bookId);
  }
  const snapshotVersion = getSnapshotVersion(snapshot);
  const displaySnapshot =
    snapshotVersion >= 5 && isSnapshotFreshForCharacter(snapshot, knowledgeCharacter || character)
      ? snapshot
      : knowledgeSnapshot || snapshot;
  const safeCharacter =
    knowledgeCharacter ||
    character || {
      name: "Unknown",
      role: null,
      short_bio: null,
      full_bio: null,
      first_chapter: null,
      last_chapter: null,
      relationships: [],
      timeline: [],
      updated_at: null,
    };

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-surface)] bg-[var(--color-page)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href={`/books/${bookId}`} className="text-[var(--color-text-main)]" aria-label="Back to book">
            <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
          </Link>
          {character || knowledgeCharacter ? (
            <CharacterProfileMenu
              bookId={bookId}
              slug={slug}
              name={safeCharacter?.name || "Character"}
            />
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-6">
        <CharacterProfileSheet
          bookId={bookId}
          slug={slug}
          character={safeCharacter}
          initialSnapshot={displaySnapshot}
          trackingMode={trackingMode}
          noteLinks={noteLinks}
        />
      </main>
    </div>
  );
}
