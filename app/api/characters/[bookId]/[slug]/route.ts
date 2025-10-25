import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ bookId: string; slug: string }> },
) {
  try {
    const { bookId, slug } = await context.params;
    if (!bookId || !slug) {
      return new Response(JSON.stringify({ error: "bookId and slug are required" }), { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("characters")
      .select("id,book_id,slug,name,role,short_bio,full_bio,first_chapter,last_chapter,relationships,timeline,updated_at")
      .eq("book_id", bookId)
      .eq("slug", slug)
      .single();
    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
    }
    return Response.json({ character: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch character";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

