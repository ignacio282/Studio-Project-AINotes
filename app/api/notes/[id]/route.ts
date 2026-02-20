import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: "id is required" }), { status: 400 });
    }

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data, error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: "Note not found" }), { status: 404 });
    }

    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete note";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
