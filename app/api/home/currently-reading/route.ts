import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // Pull the latest 500 notes and aggregate on the server
    const { data: notes, error: notesErr } = await supabase
      .from("notes")
      .select("book_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (notesErr) throw notesErr;

    const agg = new Map<string, { first: string; last: string; count: number }>();
    for (const n of notes ?? []) {
      const id = n.book_id as string;
      if (!id) continue;
      const entry = agg.get(id);
      if (!entry) {
        agg.set(id, { first: n.created_at as string, last: n.created_at as string, count: 1 });
      } else {
        entry.count += 1;
        if (n.created_at < entry.first) entry.first = n.created_at as string;
        if (n.created_at > entry.last) entry.last = n.created_at as string;
      }
    }

    const bookIds = Array.from(agg.keys());
    if (bookIds.length === 0) return Response.json({ books: [] });

    const { data: books, error: booksErr } = await supabase
      .from("books")
      .select("id,title,author,cover_url")
      .in("id", bookIds);
    if (booksErr) throw booksErr;

    // Character counts per book (optional best-effort)
    const { data: chars } = await supabase
      .from("characters")
      .select("book_id")
      .in("book_id", bookIds);
    const charCounts = new Map<string, number>();
    (chars ?? []).forEach((c: any) => {
      charCounts.set(c.book_id, (charCounts.get(c.book_id) ?? 0) + 1);
    });

    // Sort by last note time desc
    const list = (books ?? [])
      .map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        coverUrl: b.cover_url ?? null,
        firstNoteAt: agg.get(b.id)?.first ?? null,
        lastNoteAt: agg.get(b.id)?.last ?? null,
        noteCount: agg.get(b.id)?.count ?? 0,
        characterCount: charCounts.get(b.id) ?? 0,
        placeCount: 0,
      }))
      .sort((a, b) => (b.lastNoteAt || "").localeCompare(a.lastNoteAt || ""));

    return Response.json({ books: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to load currently reading";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

