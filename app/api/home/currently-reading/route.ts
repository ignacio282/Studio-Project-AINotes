import { requireUser } from "@/lib/supabase/require-user";

export const runtime = "nodejs";

type ReadingBookRow = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url?: string | null;
  status?: string | null;
  created_at: string | null;
  updated_at?: string | null;
};

type NoteActivityRow = {
  book_id: string | null;
  created_at: string | null;
};

type CharacterRow = {
  book_id: string | null;
};

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 1) Fetch books that are currently being read.
    // Prefer the extended schema (with status/cover/updated_at) but fall back
    // gracefully for older databases that don't have these columns yet.
    let books: ReadingBookRow[] | null = null;
    {
      const resp = await supabase
        .from("books")
        .select("id,title,author,cover_url,status,created_at,updated_at")
        .eq("status", "reading")
        .order("updated_at", { ascending: false });
      if (resp.error) {
        const fallback = await supabase
          .from("books")
          .select("id,title,author,created_at")
          .order("created_at", { ascending: false });
        if (fallback.error) throw fallback.error;
        books = (fallback.data ?? []) as ReadingBookRow[];
      } else {
        books = (resp.data ?? []) as ReadingBookRow[];
      }
    }

    if (!books?.length) {
      return Response.json({ books: [] });
    }

    const bookIds = books.map((b) => b.id).filter(Boolean);

    // 2) Pull the latest 500 notes for these books and aggregate on the server.
    const { data: notesRaw, error: notesErr } = await supabase
      .from("notes")
      .select("book_id,created_at")
      .in("book_id", bookIds)
      .order("created_at", { ascending: false })
      .limit(500);
    if (notesErr) throw notesErr;
    const notes = (notesRaw ?? []) as NoteActivityRow[];

    const agg = new Map<string, { first: string | null; last: string | null; count: number }>();
    for (const n of notes) {
      const id = typeof n.book_id === "string" ? n.book_id : "";
      if (!id) continue;
      const created = typeof n.created_at === "string" ? n.created_at : "";
      if (!created) continue;
      const entry = agg.get(id);
      if (!entry) {
        agg.set(id, { first: created, last: created, count: 1 });
      } else {
        entry.count += 1;
        if (created < (entry.first ?? created)) entry.first = created;
        if (created > (entry.last ?? created)) entry.last = created;
      }
    }

    // 3) Character counts per book (optional best-effort)
    const { data: charsRaw } = await supabase
      .from("characters")
      .select("book_id")
      .in("book_id", bookIds);
    const chars = (charsRaw ?? []) as CharacterRow[];
    const charCounts = new Map<string, number>();
    chars.forEach((c) => {
      if (!c.book_id) return;
      charCounts.set(c.book_id, (charCounts.get(c.book_id) ?? 0) + 1);
    });

    // 4) Build response, ensuring books with 0 notes still appear.
    const list = (books ?? [])
      .map((b) => {
        const stats = agg.get(b.id);
        const firstNoteAt = stats?.first ?? b.created_at ?? null;
        const lastActivity =
          stats?.last ?? b.updated_at ?? b.created_at ?? null;
        return {
          id: b.id,
          title: b.title,
          author: b.author,
          coverUrl: b.cover_url ?? null,
          firstNoteAt,
          lastNoteAt: lastActivity,
          noteCount: stats?.count ?? 0,
          characterCount: charCounts.get(b.id) ?? 0,
          placeCount: 0,
        };
      })
      // Sort by last activity (last note, updated_at, or created_at) desc
      .sort((a, b) => (b.lastNoteAt || "").localeCompare(a.lastNoteAt || ""));

    return Response.json({ books: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load currently reading";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
