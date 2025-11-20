import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

function extractCharacters(ai: unknown): string[] {
  if (!ai || typeof ai !== "object") return [];
  const rec = ai as any;
  const list = Array.isArray(rec.characters) ? (rec.characters as unknown[]) : [];
  return list
    .filter((x: unknown): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // Total notes
    const totalRes = await supabase.from("notes").select("id", { count: "exact", head: true });
    const totalNotes = totalRes.count ?? 0;

    // Last 500 notes for simple aggregations
    const { data: recent } = await supabase
      .from("notes")
      .select("book_id,ai_summary,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    // Most-read book by count
    const byBook = new Map<string, number>();
    let last7Count = 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const n of recent ?? []) {
      const id = n.book_id as string;
      if (id) byBook.set(id, (byBook.get(id) ?? 0) + 1);
      if (n.created_at && new Date(n.created_at) >= weekAgo) {
        last7Count += 1;
      }
    }

    let mostReadBookId: string | null = null;
    let mostReadCount = -1;
    for (const [k, v] of byBook) {
      if (v > mostReadCount) {
        mostReadCount = v;
        mostReadBookId = k;
      }
    }

    let mostReadBookTitle = "";
    if (mostReadBookId) {
      const { data: book } = await supabase
        .from("books")
        .select("title")
        .eq("id", mostReadBookId)
        .single();
      mostReadBookTitle = book?.title ?? "";
    }

    // Favorite character (naive): most frequently mentioned in ai_summary.characters
    const charCounts = new Map<string, number>();
    for (const n of recent ?? []) {
      const names = extractCharacters(n.ai_summary);
      names.forEach((name) => charCounts.set(name, (charCounts.get(name) ?? 0) + 1));
    }
    let favoriteCharacter = "";
    let favCount = -1;
    for (const [name, count] of charCounts) {
      if (count > favCount) {
        favCount = count;
        favoriteCharacter = name;
      }
    }

    // Minimal estimate for reading time this week
    const readingThisWeekMinutes = last7Count * 5; // naive placeholder

    return Response.json({
      totalNotes,
      mostReadBookTitle,
      favoriteCharacter,
      readingThisWeekMinutes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to compute stats";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

