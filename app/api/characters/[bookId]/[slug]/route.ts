import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ bookId: string; slug: string }> },
) {
  try {
    const { bookId, slug } = await context.params;
    const mock = process.env.MOCK_AI === "1" || process.env.NEXT_PUBLIC_MOCK_AI === "1";
    if (!bookId || !slug) {
      return new Response(JSON.stringify({ error: "bookId and slug are required" }), { status: 400 });
    }
    if (mock) {
      const lower = slug.toLowerCase();
      const now = new Date().toISOString();
      const catalog: Record<string, any> = {
        darrow: {
          id: "1",
          book_id: bookId,
          slug: "darrow",
          name: "Darrow",
          role: "Rebel miner",
          short_bio: "A driven leader shaped by hardship and loss.",
          full_bio: "Darrow rises from the mines with a fierce, unshakable resolve to upend an unjust order.",
          first_chapter: 1,
          last_chapter: 5,
          relationships: [{ name: "Mustang", label: "Trusted ally" }],
          timeline: [
            { chapterNumber: 1, snippet: "Life in the mines sets his resolve." },
            { chapterNumber: 5, snippet: "A turning point steels his purpose." },
          ],
          updated_at: now,
        },
        mustang: {
          id: "2",
          book_id: bookId,
          slug: "mustang",
          name: "Mustang",
          role: "Strategist",
          short_bio: "Calm, incisive, and committed to her own path.",
          full_bio: "Mustang pairs tactical clarity with a steady moral compass, shaping pivotal choices.",
          first_chapter: 2,
          last_chapter: 5,
          relationships: [{ name: "Darrow", label: "Trusted ally" }],
          timeline: [
            { chapterNumber: 2, snippet: "First hints of strategy and restraint." },
            { chapterNumber: 5, snippet: "Common purpose begins to crystallize." },
          ],
          updated_at: now,
        },
      };
      const record = catalog[lower];
      if (!record) {
        return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
      }
      return Response.json({ character: record });
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
