import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";

export const runtime = "nodejs";

type Note = {
  id: string;
  book_id: string;
  chapter_number: number;
  content: string;
  ai_summary: unknown;
  created_at: string;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId") || "";
    const chapterNumberRaw = searchParams.get("chapterNumber");
    const chapterNumber = chapterNumberRaw ? Number(chapterNumberRaw) : undefined;

    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    let query = supabase
      .from("notes")
      .select("id,book_id,chapter_number,content,ai_summary,created_at")
      .eq("book_id", bookId)
      .order("created_at", { ascending: true });

    if (typeof chapterNumber === "number" && !Number.isNaN(chapterNumber)) {
      query = query.eq("chapter_number", chapterNumber);
    }

    const { data, error } = await query;
    if (error) throw error;
    const notes = (data ?? []) as Note[];
    return Response.json({ notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch notes";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      bookId?: unknown;
      chapterNumber?: unknown;
      content?: unknown;
      createdAt?: unknown;
    };
    const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";
    const chapterNumber = typeof body.chapterNumber === "number" ? body.chapterNumber : Number(body.chapterNumber);
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const createdAt = typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString();

    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }
    if (!Number.isInteger(chapterNumber) || (chapterNumber as number) < 0) {
      return new Response(JSON.stringify({ error: "chapterNumber must be a non-negative integer" }), { status: 400 });
    }
    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), { status: 400 });
    }

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { data, error } = await supabase
      .from("notes")
      .insert({
        book_id: bookId,
        chapter_number: chapterNumber as number,
        content,
        created_at: createdAt,
        user_id: user.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    return Response.json({ id: data?.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create note";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
