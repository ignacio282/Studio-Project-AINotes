import { NextRequest } from "next/server";
import { normalizeEntityName } from "@/lib/entities/name-match";
import { fetchPlaceKnowledge, slugifyPlaceName } from "@/lib/knowledge/read";
import { requireUser } from "@/lib/supabase/require-user";

export const runtime = "nodejs";

function removePlaceFromSummary(summary: unknown, placeName: string, placeSlug: string): unknown {
  if (!summary || typeof summary !== "object") return summary;
  const targetName = normalizeEntityName(placeName);
  const targetSlug = slugifyPlaceName(placeSlug || placeName);
  if (!targetName && !targetSlug) return summary;

  const cloned = structuredClone(summary) as Record<string, unknown>;
  const list = Array.isArray(cloned.setting) ? cloned.setting : [];
  const next = list.filter((entry) => {
    if (typeof entry !== "string") return true;
    return normalizeEntityName(entry) !== targetName && slugifyPlaceName(entry) !== targetSlug;
  });

  if (next.length === list.length) return summary;
  cloned.setting = next;
  return cloned;
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ bookId: string; slug: string }> },
) {
  try {
    const { bookId, slug } = await context.params;
    if (!bookId || !slug) {
      return Response.json({ error: "bookId and slug are required" }, { status: 400 });
    }

    const { supabase, user } = await requireUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bookError) throw bookError;
    if (!book) {
      return Response.json({ error: "Place not found" }, { status: 404 });
    }

    const knowledge = await fetchPlaceKnowledge(supabase, user.id, bookId, slug);
    const placeName = knowledge?.name || slug.replace(/-/g, " ");
    const placeSlug = knowledge?.slug || slugifyPlaceName(slug);

    if (knowledge?.entity?.id) {
      await supabase
        .from("book_entity_mentions")
        .delete()
        .eq("book_id", bookId)
        .eq("entity_id", knowledge.entity.id)
        .eq("user_id", user.id);
      await supabase
        .from("book_timeline_events")
        .delete()
        .eq("book_id", bookId)
        .eq("entity_id", knowledge.entity.id)
        .eq("user_id", user.id);
      const { error: entityDeleteError } = await supabase
        .from("book_entities")
        .delete()
        .eq("id", knowledge.entity.id)
        .eq("user_id", user.id);
      if (entityDeleteError) throw entityDeleteError;
    }

    const { data: notesData, error: notesError } = await supabase
      .from("notes")
      .select("id,ai_summary")
      .eq("book_id", bookId)
      .eq("user_id", user.id);
    if (notesError) throw notesError;

    for (const row of Array.isArray(notesData) ? notesData : []) {
      const nextSummary = removePlaceFromSummary(row.ai_summary, placeName, placeSlug);
      if (nextSummary === row.ai_summary) continue;
      const { error: noteUpdateError } = await supabase
        .from("notes")
        .update({ ai_summary: nextSummary })
        .eq("id", row.id)
        .eq("user_id", user.id);
      if (noteUpdateError) throw noteUpdateError;
    }

    const { data: memoryData, error: memoryError } = await supabase
      .from("book_chapter_memory")
      .select("id,summary")
      .eq("book_id", bookId)
      .eq("user_id", user.id);
    if (memoryError) throw memoryError;

    for (const row of Array.isArray(memoryData) ? memoryData : []) {
      const nextSummary = removePlaceFromSummary(row.summary, placeName, placeSlug);
      if (nextSummary === row.summary) continue;
      const { error: memoryUpdateError } = await supabase
        .from("book_chapter_memory")
        .update({ summary: nextSummary })
        .eq("id", row.id)
        .eq("user_id", user.id);
      if (memoryUpdateError) throw memoryUpdateError;
    }

    return Response.json({ ok: true, deletedName: placeName });
  } catch (err) {
    console.error("Failed to delete place:", err);
    const message = err instanceof Error ? err.message : "Unable to delete place";
    return Response.json({ error: message }, { status: 500 });
  }
}
