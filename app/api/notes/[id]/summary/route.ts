import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

function slugifyName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractCharacterNames(summary: unknown): string[] {
  if (!summary || typeof summary !== "object") return [];
  const rec = summary as { characters?: unknown };
  if (!Array.isArray(rec.characters)) return [];
  const cleaned = rec.characters
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

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

    try {
      const bookId = data?.book_id;
      const chapterNumber = Number(data?.chapter_number);
      const names = extractCharacterNames(aiSummary);
      if (bookId && Number.isFinite(chapterNumber) && names.length > 0) {
        const slugEntries = names
          .map((name) => ({ name, slug: slugifyName(name) }))
          .filter((entry) => entry.slug);
        if (slugEntries.length > 0) {
          const slugs = slugEntries.map((entry) => entry.slug);
          const { data: existingRows } = await supabase
            .from("characters")
            .select("slug,name,short_bio,first_chapter,last_chapter")
            .eq("book_id", bookId)
            .in("slug", slugs);
          const existing = Array.isArray(existingRows) ? existingRows : [];
          const existingMap = new Map(existing.map((row) => [row.slug, row]));

          const toUpsert: Array<Record<string, unknown>> = [];
          const toGenerate: string[] = [];
          const now = new Date().toISOString();

          slugEntries.forEach(({ name, slug }) => {
            const row = existingMap.get(slug);
            if (!row) {
              toUpsert.push({
                book_id: bookId,
                slug,
                name,
                role: null,
                short_bio: null,
                full_bio: null,
                first_chapter: chapterNumber,
                last_chapter: chapterNumber,
                relationships: [],
                timeline: [],
                updated_at: now,
              });
              toGenerate.push(name);
              return;
            }
            let nextFirst = row.first_chapter;
            let nextLast = row.last_chapter;
            if (!Number.isFinite(nextFirst) || chapterNumber < nextFirst) {
              nextFirst = chapterNumber;
            }
            if (!Number.isFinite(nextLast) || chapterNumber > nextLast) {
              nextLast = chapterNumber;
            }
            if (nextFirst !== row.first_chapter || nextLast !== row.last_chapter) {
              toUpsert.push({
                book_id: bookId,
                slug,
                name: row.name || name,
                first_chapter: nextFirst,
                last_chapter: nextLast,
                updated_at: now,
              });
            }
            if (!row.short_bio) {
              toGenerate.push(row.name || name);
            }
          });

          if (toUpsert.length > 0) {
            await supabase.from("characters").upsert(toUpsert, { onConflict: "book_id,slug" });
          }

          const uniqueGenerate = Array.from(new Set(toGenerate));
          if (uniqueGenerate.length > 0) {
            const origin = req.nextUrl.origin;
            await fetch(`${origin}/api/characters/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookId, names: uniqueGenerate }),
            });
          }
        }
      }
    } catch (characterError) {
      console.error("Failed to sync characters from note summary:", characterError);
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update note summary";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
