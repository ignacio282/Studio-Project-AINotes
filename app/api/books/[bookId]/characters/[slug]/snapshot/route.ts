import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";
import {
  fetchLatestCharacterSnapshot,
  prepareCharacterSnapshot,
} from "@/lib/characters/snapshot";

export const runtime = "nodejs";

function getStatusForError(message: string) {
  if (/required/i.test(message)) return 400;
  if (/not found/i.test(message)) return 404;
  return 500;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ bookId: string; slug: string }> },
) {
  try {
    const { bookId, slug } = await context.params;
    if (!bookId || !slug) {
      return new Response(JSON.stringify({ error: "bookId and slug are required" }), { status: 400 });
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

    const snapshot = await fetchLatestCharacterSnapshot(supabase, user.id, bookId, slug);
    return Response.json({ snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch character snapshot";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookId: string; slug: string }> },
) {
  try {
    const { bookId, slug } = await context.params;
    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const payload = await prepareCharacterSnapshot({
      supabase,
      userId: user.id,
      bookId,
      slug,
      force: body?.force === true,
    });
    return Response.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to generate character snapshot";
    return new Response(JSON.stringify({ error: message }), { status: getStatusForError(message) });
  }
}
