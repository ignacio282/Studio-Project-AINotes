import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RequestBody = {
  chapterNumber?: unknown;
  summary?: unknown;
};

function parseChapterNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  const parsed = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId } = await context.params;
    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }

    const body = (await req.json()) as RequestBody;
    const chapterNumber = parseChapterNumber(body.chapterNumber);
    if (!chapterNumber) {
      return new Response(JSON.stringify({ error: "chapterNumber is required" }), { status: 400 });
    }

    const summary = body.summary ?? {};

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("book_chapter_memory")
      .upsert(
        {
          book_id: bookId,
          chapter_number: chapterNumber,
          summary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "book_id,chapter_number" },
      );
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update chapter memory.";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
