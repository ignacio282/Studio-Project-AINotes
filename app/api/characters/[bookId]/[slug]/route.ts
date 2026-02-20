import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";
import { normalizeEntityName } from "@/lib/entities/name-match";

export const runtime = "nodejs";

function removeCharacterFromSummary(summary: unknown, nameToRemove: string): unknown {
  if (!summary || typeof summary !== "object") return summary;
  const target = normalizeEntityName(nameToRemove);
  if (!target) return summary;

  const cloned = structuredClone(summary) as Record<string, unknown>;
  const list = Array.isArray(cloned.characters) ? cloned.characters : [];
  const next = list.filter((entry) => {
    if (typeof entry !== "string") return true;
    return normalizeEntityName(entry) !== target;
  });

  if (next.length === list.length) return summary;
  cloned.characters = next;
  return cloned;
}

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
      const catalog: Record<string, Record<string, unknown>> = {
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
    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
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

export async function DELETE(
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

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id,name")
      .eq("book_id", bookId)
      .eq("slug", slug)
      .eq("user_id", user.id)
      .maybeSingle();
    if (characterError) throw characterError;
    if (!character) {
      return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("characters")
      .delete()
      .eq("id", character.id)
      .eq("user_id", user.id);
    if (deleteError) throw deleteError;

    const targetName = typeof character.name === "string" ? character.name : "";
    if (targetName) {
      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("id,ai_summary")
        .eq("book_id", bookId)
        .eq("user_id", user.id);
      if (notesError) throw notesError;

      const noteUpdates = (Array.isArray(notesData) ? notesData : [])
        .map((row) => {
          const nextSummary = removeCharacterFromSummary(row.ai_summary, targetName);
          if (nextSummary === row.ai_summary) return null;
          return supabase
            .from("notes")
            .update({ ai_summary: nextSummary })
            .eq("id", row.id)
            .eq("user_id", user.id);
        })
        .filter(Boolean);

      if (noteUpdates.length > 0) {
        const results = await Promise.all(noteUpdates);
        const firstError = results.find((result) => result.error)?.error;
        if (firstError) throw firstError;
      }

      const { data: memoryData, error: memoryError } = await supabase
        .from("book_chapter_memory")
        .select("id,summary")
        .eq("book_id", bookId)
        .eq("user_id", user.id);
      if (memoryError) throw memoryError;

      const memoryUpdates = (Array.isArray(memoryData) ? memoryData : [])
        .map((row) => {
          const nextSummary = removeCharacterFromSummary(row.summary, targetName);
          if (nextSummary === row.summary) return null;
          return supabase
            .from("book_chapter_memory")
            .update({ summary: nextSummary })
            .eq("id", row.id)
            .eq("user_id", user.id);
        })
        .filter(Boolean);

      if (memoryUpdates.length > 0) {
        const results = await Promise.all(memoryUpdates);
        const firstError = results.find((result) => result.error)?.error;
        if (firstError) throw firstError;
      }
    }

    return Response.json({ ok: true, deletedId: character.id, deletedName: targetName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete character";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
