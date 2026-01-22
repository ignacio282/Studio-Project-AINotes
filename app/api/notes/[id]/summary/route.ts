import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing note id" }), { status: 400 });
    }
    const body = (await req.json()) as { aiSummary?: unknown };
    const aiSummary = body?.aiSummary ?? {};

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("notes")
      .update({ ai_summary: aiSummary })
      .eq("id", id)
      .select("id,book_id,chapter_number,ai_summary")
      .single();
    if (error) throw error;

    try {
      if (data?.book_id && Number.isFinite(data?.chapter_number)) {
        await supabase
          .from("book_chapter_memory")
          .upsert(
            {
              book_id: data.book_id,
              chapter_number: data.chapter_number,
              summary: data.ai_summary ?? {},
              updated_at: new Date().toISOString(),
            },
            { onConflict: "book_id,chapter_number" },
          );
      }
    } catch (memoryError) {
      console.error("Failed to update chapter memory:", memoryError);
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update note summary";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
