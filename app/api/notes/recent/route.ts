import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(20, limitRaw ? parseInt(limitRaw, 10) : 1));

    const supabase = getServiceSupabase();

    const { data: notes, error } = await supabase
      .from("notes")
      .select("id,book_id,chapter_number,content,ai_summary,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const ids = Array.from(new Set((notes ?? []).map((n) => n.book_id).filter(Boolean)));
    let booksById: Record<string, any> = {};
    if (ids.length) {
      const { data: books } = await supabase
        .from("books")
        .select("id,title,author,cover_url")
        .in("id", ids);
      (books ?? []).forEach((b: any) => {
        booksById[b.id] = b;
      });
    }

    const payload = (notes ?? []).map((n) => ({
      id: n.id,
      bookId: n.book_id,
      bookTitle: booksById[n.book_id]?.title ?? "",
      chapterNumber: n.chapter_number,
      createdAt: n.created_at,
      content: n.content,
      aiSummary: n.ai_summary,
    }));
    return Response.json({ notes: payload });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch recent notes";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

