import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";

export const runtime = "nodejs";

type RequestBody = {
  bookId?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";
    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: targetBook, error: targetError } = await supabase
      .from("books")
      .select("id,status")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!targetBook) {
      return new Response(JSON.stringify({ error: "Book not found" }), { status: 404 });
    }

    const { data: activeBooks, error: activeError } = await supabase
      .from("books")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "reading");
    if (activeError) throw activeError;

    const activeIds = (Array.isArray(activeBooks) ? activeBooks : [])
      .map((entry) => entry.id)
      .filter(Boolean);
    const idsToPause = activeIds.filter((id) => id !== bookId);

    if (idsToPause.length > 0) {
      const { error: pauseError } = await supabase
        .from("books")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("id", idsToPause)
        .eq("status", "reading");
      if (pauseError) throw pauseError;
    }

    const { error: setCurrentError } = await supabase
      .from("books")
      .update({ status: "reading", updated_at: new Date().toISOString() })
      .eq("id", bookId)
      .eq("user_id", user.id);
    if (setCurrentError) throw setCurrentError;

    return Response.json({ ok: true, bookId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to switch current book";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
