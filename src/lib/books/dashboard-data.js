import {
  formatProgressLabel,
  getProgressTotalValue,
  normalizeTrackingMode,
} from "@/lib/books/progress";
import { fetchKnowledgeEntitiesForBooks } from "@/lib/knowledge/read";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toStringList(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return toArray(value)
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeName(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function summarizeFromAi(aiSummary) {
  if (!aiSummary) return "";
  if (typeof aiSummary === "string") return aiSummary.trim();
  if (typeof aiSummary !== "object") return "";

  const summary = toStringList(aiSummary.summary);
  if (summary.length > 0) return summary.join(" ").trim();

  const bullets = toStringList(aiSummary.bullets);
  if (bullets.length > 0) return bullets.join(" ").trim();

  const reflections = toStringList(aiSummary.reflections);
  if (reflections.length > 0) return reflections.join(" ").trim();

  return "";
}

function getSummaryLists(aiSummary) {
  if (!aiSummary || typeof aiSummary !== "object") {
    return {
      summary: [],
      characters: [],
      setting: [],
      relationships: [],
      reflections: [],
    };
  }
  return {
    summary: toStringList(aiSummary.summary),
    characters: toStringList(aiSummary.characters),
    setting: toStringList(aiSummary.setting),
    relationships: toStringList(aiSummary.relationships),
    reflections: toStringList(aiSummary.reflections),
  };
}

function buildStoryContext(summaryLists, topCharacters, trackingMode, lastProgressValue) {
  const setting = summaryLists.setting[0] || "";
  const characters = summaryLists.characters.length > 0
    ? summaryLists.characters.slice(0, 3)
    : toArray(topCharacters).map((character) => character.name).filter(Boolean).slice(0, 3);
  const progressLabel = formatProgressLabel(trackingMode, lastProgressValue);

  return {
    progressLabel,
    setting,
    characters,
  };
}

function getDaysAgoLabel(fromIso) {
  if (!fromIso) return "";
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return "";
  const diffMs = Date.now() - from.getTime();
  const days = Math.max(0, Math.floor(diffMs / 86400000));
  if (days === 0) return "Last reading session today.";
  if (days === 1) return "Last reading session 1 day ago.";
  return `Last reading session ${days} days ago.`;
}

function getProgressValue(note) {
  const value = Number(note?.chapter_number);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function compareCreatedAtDesc(a, b) {
  return String(b?.created_at || "").localeCompare(String(a?.created_at || ""));
}

function getFurthestProgressNote(notes) {
  return toArray(notes).reduce((best, note) => {
    const currentValue = getProgressValue(note);
    if (!Number.isFinite(currentValue)) {
      return best;
    }

    if (!best) {
      return note;
    }

    const bestValue = getProgressValue(best);
    if (!Number.isFinite(bestValue) || currentValue > bestValue) {
      return note;
    }

    if (currentValue === bestValue && compareCreatedAtDesc(note, best) < 0) {
      return note;
    }

    return best;
  }, null);
}

function buildMemoryLookup(rows) {
  const lookup = new Map();
  toArray(rows).forEach((row) => {
    if (!row?.book_id) return;
    const progressValue = Number(row?.chapter_number);
    if (!Number.isFinite(progressValue) || progressValue <= 0) return;
    lookup.set(`${row.book_id}::${progressValue}`, row);
  });
  return lookup;
}

function getSnapshotCardFields(snapshot) {
  const structured = snapshot?.structured && typeof snapshot.structured === "object" ? snapshot.structured : {};
  const role = typeof structured.roleLabel === "string" ? structured.roleLabel.trim() : "";
  const summaryCandidates = [
    structured.quickMemory,
    structured.summary,
    structured.roleInStory,
    snapshot?.answer,
  ];
  const summary = summaryCandidates
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean) || "";
  return { role, summary };
}

function buildSnapshotLookup(rows) {
  const lookup = new Map();
  toArray(rows).forEach((row) => {
    if (!row?.book_id || !row?.character_slug) return;
    const key = `${row.book_id}::${row.character_slug}`;
    const existing = lookup.get(key);
    if (!existing || String(row.created_at || "").localeCompare(String(existing.created_at || "")) > 0) {
      lookup.set(key, row);
    }
  });
  return lookup;
}

function buildBookStats(books, notes, memoryRows, characters, knowledgeEntities = [], characterSnapshots = []) {
  const notesByBook = new Map();
  const charRowsByBook = new Map();
  const knowledgeCharsByBook = new Map();
  const normalizedCharacterLookup = new Map();
  const memoryLookup = buildMemoryLookup(memoryRows);
  const snapshotLookup = buildSnapshotLookup(characterSnapshots);

  toArray(characters).forEach((row) => {
    if (!row?.book_id) return;
    const bucket = charRowsByBook.get(row.book_id) ?? [];
    bucket.push(row);
    charRowsByBook.set(row.book_id, bucket);

    const normalized = normalizeName(row.name);
    if (!normalized) return;
    const key = `${row.book_id}::${normalized}`;
    normalizedCharacterLookup.set(key, row);
  });

  toArray(notes).forEach((note) => {
    if (!note?.book_id) return;
    const bucket = notesByBook.get(note.book_id) ?? [];
    bucket.push(note);
    notesByBook.set(note.book_id, bucket);
  });

  toArray(knowledgeEntities).forEach((entity) => {
    if (!entity?.book_id || entity.type !== "character") return;
    const bucket = knowledgeCharsByBook.get(entity.book_id) ?? [];
    bucket.push(entity);
    knowledgeCharsByBook.set(entity.book_id, bucket);
  });

  return toArray(books).map((book) => {
    const list = toArray(notesByBook.get(book.id)).sort(compareCreatedAtDesc);
    const noteCount = list.length;
    const latestNote = list[0] ?? null;
    const furthestProgressNote = getFurthestProgressNote(list);
    const latestNoteAt = latestNote?.created_at ?? null;
    const earliestNote = list.length > 0 ? list[list.length - 1] : null;
    const firstNoteAt = earliestNote?.created_at ?? null;
    const trackingMode = normalizeTrackingMode(book.tracking_mode);
    const lastProgressValue = getProgressValue(furthestProgressNote);
    const totalProgressValue = getProgressTotalValue(trackingMode, book);
    const memoryKey = lastProgressValue ? `${book.id}::${lastProgressValue}` : "";
    const furthestMemory = memoryKey ? memoryLookup.get(memoryKey) : null;
    const summarySource = furthestMemory?.summary ?? furthestProgressNote?.ai_summary;
    const storySoFar = summarizeFromAi(summarySource);
    const summaryLists = getSummaryLists(summarySource);

    const mentionCounts = new Map();
    const mentionLabels = new Map();
    list.forEach((note) => {
      const ai = note?.ai_summary;
      if (!ai || typeof ai !== "object") return;
      const names = toStringList(ai.characters);
      names.forEach((name) => {
        const normalized = normalizeName(name);
        if (!normalized) return;
        if (!mentionLabels.has(normalized) && typeof name === "string" && name.trim()) {
          mentionLabels.set(normalized, name.trim());
        }
        const next = (mentionCounts.get(normalized) ?? 0) + 1;
        mentionCounts.set(normalized, next);
      });
    });

    const knowledgeCharacters = toArray(knowledgeCharsByBook.get(book.id));
    const topCharacters =
      knowledgeCharacters.length > 0
        ? knowledgeCharacters
            .sort((a, b) => Number(b.mention_count || 0) - Number(a.mention_count || 0) || a.name.localeCompare(b.name))
            .slice(0, 4)
            .map((row) => {
              const snapshotFields = getSnapshotCardFields(snapshotLookup.get(`${book.id}::${row.slug}`));
              const summary = snapshotFields.summary || row.profile?.summary || "";
              const role = snapshotFields.role || row.profile?.role || "";
              return {
                name: row.name,
                slug: row.slug || "",
                subtitle: summary || role || "Mentioned in your notes.",
                role,
                summary,
                firstChapter: row.first_chapter ?? null,
                lastChapter: row.last_chapter ?? null,
                mentions: Number(row.mention_count || 0),
              };
            })
        : Array.from(mentionCounts.entries())
            .sort((a, b) => {
              if (b[1] !== a[1]) return b[1] - a[1];
              return a[0].localeCompare(b[0]);
            })
            .slice(0, 4)
            .map(([normalizedName, mentions]) => {
              const key = `${book.id}::${normalizedName}`;
              const row = normalizedCharacterLookup.get(key);
              const snapshotFields = row?.slug ? getSnapshotCardFields(snapshotLookup.get(`${book.id}::${row.slug}`)) : {};
              const summary = snapshotFields.summary || row?.short_bio || "";
              const role = snapshotFields.role || row?.role || "";
              return {
                name: row?.name || mentionLabels.get(normalizedName) || normalizedName,
                slug: row?.slug || "",
                subtitle: role || summary || "Mentioned in your notes.",
                role,
                summary,
                firstChapter: null,
                lastChapter: null,
                mentions,
              };
            });
    const storyContext = buildStoryContext(summaryLists, topCharacters, trackingMode, lastProgressValue);

    return {
      ...book,
      noteCount,
      firstNoteAt,
      latestNoteAt,
      trackingMode,
      lastChapter: lastProgressValue,
      lastProgressValue,
      lastProgressLabel: formatProgressLabel(trackingMode, lastProgressValue),
      totalProgressValue,
      storySoFar,
      storyContext,
      daysAgoLabel: getDaysAgoLabel(latestNoteAt),
      topCharacters,
      totalChapters:
        Number.isFinite(Number(book.total_chapters)) && Number(book.total_chapters) > 0
          ? Number(book.total_chapters)
          : null,
      totalPages:
        Number.isFinite(Number(book.total_pages)) && Number(book.total_pages) > 0
          ? Number(book.total_pages)
          : null,
      progressPercent:
        Number.isFinite(Number(lastProgressValue)) &&
        (
          trackingMode === "percent" ||
          (Number.isFinite(Number(totalProgressValue)) && Number(totalProgressValue) > 0)
        )
          ? Math.max(
              0,
              Math.min(
                100,
                trackingMode === "percent"
                  ? Math.round(Number(lastProgressValue))
                  : Math.round((Number(lastProgressValue) * 100) / Number(totalProgressValue)),
              ),
            )
          : 0,
    };
  });
}

export async function fetchBooksDashboardData(supabase, userId) {
  const booksQuery = await supabase
    .from("books")
    .select("id,title,author,cover_url,status,total_chapters,total_pages,tracking_mode,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (booksQuery.error) throw booksQuery.error;

  const books = toArray(booksQuery.data);
  if (books.length === 0) {
    return { books: [], currentBook: null, toReadBooks: [], finishedBooks: [] };
  }

  const ids = books.map((book) => book.id);
  const [notesQuery, memoryQuery, charactersQuery, snapshotsQuery] = await Promise.all([
    supabase
      .from("notes")
      .select("id,book_id,chapter_number,ai_summary,created_at")
      .eq("user_id", userId)
      .in("book_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("book_chapter_memory")
      .select("book_id,chapter_number,summary")
      .in("book_id", ids),
    supabase
      .from("characters")
      .select("book_id,name,slug,role,short_bio")
      .eq("user_id", userId)
      .in("book_id", ids),
    supabase
      .from("character_assistant_snapshots")
      .select("book_id,character_slug,answer,structured,created_at")
      .eq("user_id", userId)
      .in("book_id", ids)
      .order("created_at", { ascending: false }),
  ]);
  if (notesQuery.error) throw notesQuery.error;
  const memoryRows = memoryQuery.data ?? [];
  if (memoryQuery.error) throw memoryQuery.error;
  if (charactersQuery.error) throw charactersQuery.error;
  if (snapshotsQuery.error) throw snapshotsQuery.error;

  let knowledgeEntities = [];
  try {
    knowledgeEntities = await fetchKnowledgeEntitiesForBooks(supabase, userId, ids);
  } catch (error) {
    console.error("Failed to read dashboard knowledge entities:", error);
  }

  const booksWithStats = buildBookStats(
    books,
    notesQuery.data,
    memoryRows,
    charactersQuery.data,
    knowledgeEntities,
    snapshotsQuery.data,
  );

  const reading = booksWithStats
    .filter((book) => book.status === "reading")
    .sort((a, b) => String(b.latestNoteAt || b.updated_at || "").localeCompare(String(a.latestNoteAt || a.updated_at || "")));

  const currentBook = reading[0] ?? booksWithStats[0] ?? null;

  const toReadBooks = booksWithStats.filter(
    (book) =>
      book.id !== currentBook?.id &&
      (book.status === "paused" || (book.status === "reading" && book.id !== currentBook?.id)),
  );
  const finishedBooks = booksWithStats.filter((book) => book.status === "completed");

  return {
    books: booksWithStats,
    currentBook,
    toReadBooks,
    finishedBooks,
  };
}
