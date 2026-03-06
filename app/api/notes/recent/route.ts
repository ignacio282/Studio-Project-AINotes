import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";

export const runtime = "nodejs";

type NoteRow = {
  id: string;
  book_id: string;
  chapter_number: number;
  content: string;
  ai_summary: unknown;
  created_at: string;
};

type BookRow = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(20, limitRaw ? parseInt(limitRaw, 10) : 1));

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: notesRaw, error } = await supabase
      .from("notes")
      .select("id,book_id,chapter_number,content,ai_summary,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const notes = (notesRaw ?? []) as NoteRow[];

    const ids = Array.from(new Set(notes.map((n) => n.book_id).filter(Boolean)));
    const booksById: Record<string, BookRow> = {};
    if (ids.length) {
      const { data: booksRaw } = await supabase
        .from("books")
        .select("id,title,author,cover_url")
        .in("id", ids);
      const books = (booksRaw ?? []) as BookRow[];
      books.forEach((b) => {
        booksById[b.id] = b;
      });
    }

    const payload = notes.map((n) => ({
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

