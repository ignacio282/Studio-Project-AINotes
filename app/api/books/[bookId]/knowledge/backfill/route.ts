import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";
import { backfillBookKnowledge } from "@/lib/knowledge/sync";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId } = await context.params;
    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }

    if (process.env.NODE_ENV === "production" && process.env.ALLOW_KNOWLEDGE_BACKFILL !== "1") {
      return new Response(JSON.stringify({ error: "Backfill is disabled in production" }), { status: 403 });
    }

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bookError) throw bookError;
    if (!book) {
      return new Response(JSON.stringify({ error: "Book not found" }), { status: 404 });
    }

    const result = await backfillBookKnowledge({ supabase, userId: user.id, bookId });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to backfill book knowledge";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
