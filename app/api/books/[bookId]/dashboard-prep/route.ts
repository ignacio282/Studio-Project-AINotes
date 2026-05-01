import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";
import { prepareCharacterSnapshot } from "@/lib/characters/snapshot";

export const runtime = "nodejs";

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

type PrepCharacter = {
  name?: string | null;
  slug?: string | null;
  mention_count?: number | null;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId } = await context.params;
    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (bookError) throw bookError;
    if (!book) {
      return new Response(JSON.stringify({ error: "Book not found" }), { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedSlugs: string[] = Array.isArray(body?.slugs)
      ? body.slugs.map((slug: unknown) => String(slug || "").trim()).filter(Boolean).slice(0, 4)
      : [];

    let characters: PrepCharacter[] = [];
    if (requestedSlugs.length > 0) {
      const [knowledgeResponse, characterResponse] = await Promise.all([
        supabase
          .from("book_entities")
          .select("name,slug,mention_count")
          .eq("user_id", user.id)
          .eq("book_id", bookId)
          .eq("type", "character")
          .in("slug", requestedSlugs),
        supabase
          .from("characters")
          .select("name,slug")
          .eq("user_id", user.id)
          .eq("book_id", bookId)
          .in("slug", requestedSlugs),
      ]);
      if (knowledgeResponse.error) throw knowledgeResponse.error;
      if (characterResponse.error) throw characterResponse.error;
      const bySlug = new Map<string, PrepCharacter>();
      [...toArray<PrepCharacter>(characterResponse.data), ...toArray<PrepCharacter>(knowledgeResponse.data)].forEach((row) => {
        if (row.slug) bySlug.set(row.slug, row);
      });
      characters = requestedSlugs.map((slug) => bySlug.get(slug) || { slug, name: slug });
    } else {
      const { data: knowledgeRows, error: knowledgeError } = await supabase
        .from("book_entities")
        .select("name,slug,mention_count")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .eq("type", "character")
        .order("mention_count", { ascending: false })
        .limit(4);
      if (knowledgeError) throw knowledgeError;

      characters = toArray<PrepCharacter>(knowledgeRows).filter((row) => row.slug);
    }

    if (characters.length === 0) {
      const { data: characterRows, error: characterError } = await supabase
        .from("characters")
        .select("name,slug")
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .limit(4);
      if (characterError) throw characterError;
      characters = toArray<PrepCharacter>(characterRows).filter((row) => row.slug);
    }

    const prepared: Array<{ slug: string; name: string }> = [];
    const skipped: Array<{ slug: string; name: string; reason?: string }> = [];
    const errors: Array<{ slug: string; name: string; error: string }> = [];

    for (const character of characters.slice(0, 4)) {
      const slug = String(character.slug || "");
      const name = String(character.name || slug);
      if (!slug) continue;
      try {
        const result = await prepareCharacterSnapshot({
          supabase,
          userId: user.id,
          bookId,
          slug,
        });
        if (result.generated) {
          prepared.push({ slug, name });
        } else {
          skipped.push({ slug, name, reason: result.skipped || (result.ready === false ? "not_ready" : "unchanged") });
        }
      } catch (error) {
        errors.push({
          slug,
          name,
          error: error instanceof Error ? error.message : "Unable to prepare character",
        });
      }
    }

    return Response.json({ prepared, skipped, errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to prepare dashboard";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
