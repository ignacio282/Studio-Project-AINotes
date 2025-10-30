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
    const { error } = await supabase
      .from("notes")
      .update({ ai_summary: aiSummary })
      .eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update note summary";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
