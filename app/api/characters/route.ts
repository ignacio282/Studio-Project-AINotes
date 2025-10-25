import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId") || "";
    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("characters")
      .select("id,book_id,slug,name,role,short_bio,updated_at")
      .eq("book_id", bookId)
      .order("name", { ascending: true });
    if (error) throw error;
    return Response.json({ characters: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch characters";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

