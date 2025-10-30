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
    const mock = searchParams.get("mock") === "1" || process.env.MOCK_AI === "1" || process.env.NEXT_PUBLIC_MOCK_AI === "1";
    if (mock) {
      const now = new Date().toISOString();
      return Response.json({
        characters: [
          { id: "1", book_id: bookId, slug: "darrow", name: "Darrow", role: "Rebel miner", short_bio: "A driven leader shaped by hardship.", updated_at: now },
          { id: "2", book_id: bookId, slug: "mustang", name: "Mustang", role: "Strategist", short_bio: "Brilliant and composed with her own agenda.", updated_at: now },
        ],
      });
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
