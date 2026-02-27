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

function buildBookStats(books, notes, characters) {
  const notesByBook = new Map();
  const charRowsByBook = new Map();
  const normalizedCharacterLookup = new Map();

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

  return toArray(books).map((book) => {
    const list = toArray(notesByBook.get(book.id)).sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || "")),
    );
    const noteCount = list.length;
    const latestNote = list[0] ?? null;
    const latestNoteAt = latestNote?.created_at ?? null;
    const earliestNote = list.length > 0 ? list[list.length - 1] : null;
    const firstNoteAt = earliestNote?.created_at ?? null;
    const lastChapter =
      latestNote && Number.isFinite(Number(latestNote.chapter_number))
        ? Number(latestNote.chapter_number)
        : null;
    const storySoFar = summarizeFromAi(latestNote?.ai_summary);

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

    const topCharacters = Array.from(mentionCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 4)
      .map(([normalizedName, mentions]) => {
        const key = `${book.id}::${normalizedName}`;
        const row = normalizedCharacterLookup.get(key);
        return {
          name: row?.name || mentionLabels.get(normalizedName) || normalizedName,
          slug: row?.slug || "",
          subtitle: row?.role || row?.short_bio || "Mentioned in your notes.",
          mentions,
        };
      });

    return {
      ...book,
      noteCount,
      firstNoteAt,
      latestNoteAt,
      lastChapter,
      storySoFar,
      daysAgoLabel: getDaysAgoLabel(latestNoteAt),
      topCharacters,
      totalChapters:
        Number.isFinite(Number(book.total_chapters)) && Number(book.total_chapters) > 0
          ? Number(book.total_chapters)
          : null,
      progressPercent:
        Number.isFinite(Number(lastChapter)) &&
        Number.isFinite(Number(book.total_chapters)) &&
        Number(book.total_chapters) > 0
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round((Number(lastChapter) * 100) / Number(book.total_chapters)),
              ),
            )
          : 0,
    };
  });
}

export async function fetchBooksDashboardData(supabase, userId) {
  const booksQuery = await supabase
    .from("books")
    .select("id,title,author,cover_url,status,total_chapters,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (booksQuery.error) throw booksQuery.error;

  const books = toArray(booksQuery.data);
  if (books.length === 0) {
    return { books: [], currentBook: null, toReadBooks: [], finishedBooks: [] };
  }

  const ids = books.map((book) => book.id);
  const [notesQuery, charactersQuery] = await Promise.all([
    supabase
      .from("notes")
      .select("id,book_id,chapter_number,ai_summary,created_at")
      .eq("user_id", userId)
      .in("book_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("characters")
      .select("book_id,name,slug,role,short_bio")
      .eq("user_id", userId)
      .in("book_id", ids),
  ]);
  if (notesQuery.error) throw notesQuery.error;
  if (charactersQuery.error) throw charactersQuery.error;

  const booksWithStats = buildBookStats(books, notesQuery.data, charactersQuery.data);

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
