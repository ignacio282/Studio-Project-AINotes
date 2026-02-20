import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";
import { findClosestNameMatch, normalizeEntityName } from "@/lib/entities/name-match";

export const runtime = "nodejs";

type CharacterRow = {
  slug: string | null;
  name: string | null;
  short_bio: string | null;
  first_chapter: number | null;
  last_chapter: number | null;
};

type TypoSuggestion = {
  noteId: string;
  candidateName: string;
  candidateSlug: string;
  matchedName: string;
  matchedSlug: string;
  score: number;
};

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

const NAME_STOPWORDS = new Set([
  "the",
  "this",
  "that",
  "with",
  "from",
  "very",
  "into",
  "over",
  "under",
  "about",
  "there",
  "their",
  "where",
  "while",
  "would",
  "could",
  "should",
  "brave",
]);

function extractNameCandidatesFromContent(content: string): string[] {
  if (!content || typeof content !== "string") return [];
  const rawTokens = content
    .replace(/[\r\n]+/g, " ")
    .replace(/[^a-zA-Z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const unique = new Map<string, string>();
  rawTokens.forEach((token) => {
    const cleaned = token.replace(/^['-]+|['-]+$/g, "");
    if (cleaned.length < 4) return;
    const normalized = normalizeEntityName(cleaned);
    if (!normalized || NAME_STOPWORDS.has(normalized)) return;
    if (!unique.has(normalized)) {
      unique.set(normalized, cleaned);
    }
  });

  return Array.from(unique.values());
}

function getChapterBounds(current: CharacterRow, chapterNumber: number): { first: number; last: number } {
  const existingFirst = Number(current.first_chapter);
  const existingLast = Number(current.last_chapter);
  const first = Number.isFinite(existingFirst) ? Math.min(existingFirst, chapterNumber) : chapterNumber;
  const last = Number.isFinite(existingLast) ? Math.max(existingLast, chapterNumber) : chapterNumber;
  return { first, last };
}

function toCharacterArray(summary: unknown): string[] {
  if (!summary || typeof summary !== "object") return [];
  const record = summary as { characters?: unknown };
  if (!Array.isArray(record.characters)) return [];
  return record.characters
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function replaceCharacterInSummary(summary: unknown, fromName: string, toName: string): unknown {
  if (!summary || typeof summary !== "object") return summary;
  const fromNormalized = normalizeEntityName(fromName);
  if (!fromNormalized) return summary;
  const replacement = (toName || "").trim() || fromName;
  const cloned = { ...(summary as Record<string, unknown>) };
  const seen = new Set<string>();
  const nextCharacters: string[] = [];

  toCharacterArray(summary).forEach((name) => {
    const nextName = normalizeEntityName(name) === fromNormalized ? replacement : name;
    const key = normalizeEntityName(nextName);
    if (!key || seen.has(key)) return;
    seen.add(key);
    nextCharacters.push(nextName);
  });

  cloned.characters = nextCharacters;
  return cloned;
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

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const userId = user.id;

    const { data, error } = await supabase
      .from("notes")
      .update({ ai_summary: aiSummary })
      .eq("id", id)
      .select("id,book_id,chapter_number,content,ai_summary")
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
              user_id: userId,
            },
            { onConflict: "book_id,chapter_number" },
          );
      }
    } catch (memoryError) {
      console.error("Failed to update chapter memory:", memoryError);
    }

    const typoSuggestions: TypoSuggestion[] = [];

    try {
      const bookId = data?.book_id;
      const chapterNumber = Number(data?.chapter_number);
      const summaryNames = extractCharacterNames(aiSummary);
      const contentCandidates = extractNameCandidatesFromContent(
        typeof (data as { content?: unknown })?.content === "string"
          ? String((data as { content?: unknown }).content)
          : "",
      );
      const hasCandidates = summaryNames.length > 0 || contentCandidates.length > 0;
      if (bookId && Number.isFinite(chapterNumber) && hasCandidates) {
        const { data: existingRows } = await supabase
          .from("characters")
          .select("slug,name,short_bio,first_chapter,last_chapter")
          .eq("book_id", bookId);

        const existing = (Array.isArray(existingRows) ? existingRows : []) as CharacterRow[];
        const bySlug = new Map(
          existing
            .filter((row) => typeof row?.slug === "string" && row.slug.trim())
            .map((row) => [String(row.slug), row]),
        );
        const byNormalizedName = new Map(
          existing
            .filter((row) => typeof row?.name === "string" && row.name.trim())
            .map((row) => [normalizeEntityName(String(row.name)), row]),
        );
        const nameCorpus = existing
          .map((row) => (typeof row?.name === "string" ? row.name.trim() : ""))
          .filter(Boolean);

        const toUpsert: Array<Record<string, unknown>> = [];
        const toGenerate: string[] = [];
        const now = new Date().toISOString();
        const pendingSuggestionKeys = new Set<string>();

        summaryNames.forEach((name) => {
          const candidateName = name.trim();
          if (!candidateName) return;
          const candidateSlug = slugifyName(candidateName);
          const candidateNormalized = normalizeEntityName(candidateName);
          if (!candidateSlug || !candidateNormalized) return;

          const exactMatch =
            bySlug.get(candidateSlug) ||
            byNormalizedName.get(candidateNormalized) ||
            null;

          if (exactMatch) {
            const { first, last } = getChapterBounds(exactMatch, chapterNumber);
            const hasRangeUpdate = first !== exactMatch.first_chapter || last !== exactMatch.last_chapter;
            if (hasRangeUpdate) {
              toUpsert.push({
                book_id: bookId,
                user_id: userId,
                slug: exactMatch.slug || candidateSlug,
                name: exactMatch.name || candidateName,
                first_chapter: first,
                last_chapter: last,
                updated_at: now,
              });
            }
            if (!exactMatch.short_bio) {
              toGenerate.push(exactMatch.name || candidateName);
            }
            return;
          }

          const closest = findClosestNameMatch(candidateName, nameCorpus);
          if (closest) {
            const closestNormalized = normalizeEntityName(closest.name);
            const matchedRow = byNormalizedName.get(closestNormalized);
            const matchedName = matchedRow?.name || closest.name;
            const matchedSlug = matchedRow?.slug || slugifyName(matchedName);
            if (matchedName && matchedSlug) {
              const key = `${candidateNormalized}|${matchedSlug}`;
              if (!pendingSuggestionKeys.has(key)) {
                pendingSuggestionKeys.add(key);
                typoSuggestions.push({
                  noteId: id,
                  candidateName,
                  candidateSlug,
                  matchedName,
                  matchedSlug,
                  score: Number(closest.score.toFixed(2)),
                });
              }
              return;
            }
          }

          toUpsert.push({
            book_id: bookId,
            user_id: userId,
            slug: candidateSlug,
            name: candidateName,
            role: null,
            short_bio: null,
            full_bio: null,
            first_chapter: chapterNumber,
            last_chapter: chapterNumber,
            relationships: [],
            timeline: [],
            updated_at: now,
          });
          toGenerate.push(candidateName);
        });

        // Detect probable typos from raw note text even if AI summary misses them.
        contentCandidates.forEach((candidateName) => {
          const candidateSlug = slugifyName(candidateName);
          const candidateNormalized = normalizeEntityName(candidateName);
          if (!candidateSlug || !candidateNormalized) return;

          const exactMatch =
            bySlug.get(candidateSlug) ||
            byNormalizedName.get(candidateNormalized) ||
            null;
          if (exactMatch) return;

          const closest = findClosestNameMatch(candidateName, nameCorpus);
          if (!closest) return;
          const closestNormalized = normalizeEntityName(closest.name);
          const matchedRow = byNormalizedName.get(closestNormalized);
          const matchedName = matchedRow?.name || closest.name;
          const matchedSlug = matchedRow?.slug || slugifyName(matchedName);
          if (!matchedName || !matchedSlug) return;
          const key = `${candidateNormalized}|${matchedSlug}`;
          if (pendingSuggestionKeys.has(key)) return;
          pendingSuggestionKeys.add(key);
          typoSuggestions.push({
            noteId: id,
            candidateName,
            candidateSlug,
            matchedName,
            matchedSlug,
            score: Number(closest.score.toFixed(2)),
          });
        });

        if (toUpsert.length > 0) {
          await supabase.from("characters").upsert(toUpsert, { onConflict: "book_id,slug" });
        }

        const uniqueGenerate = Array.from(new Set(toGenerate));
        if (uniqueGenerate.length > 0) {
          const origin = req.nextUrl.origin;
          const cookie = req.headers.get("cookie");
          await fetch(`${origin}/api/characters/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(cookie ? { cookie } : {}),
            },
            body: JSON.stringify({ bookId, names: uniqueGenerate }),
          });
        }
      }
    } catch (characterError) {
      console.error("Failed to sync characters from note summary:", characterError);
    }

    return Response.json({ ok: true, typoSuggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update note summary";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as {
      noteId?: unknown;
      candidateName?: unknown;
      matchedName?: unknown;
      matchedSlug?: unknown;
      decision?: unknown;
    };
    const noteIdFromBody = typeof body.noteId === "string" ? body.noteId.trim() : "";
    const noteId = noteIdFromBody || id;
    const candidateName = typeof body.candidateName === "string" ? body.candidateName.trim() : "";
    const matchedName = typeof body.matchedName === "string" ? body.matchedName.trim() : "";
    const matchedSlug = typeof body.matchedSlug === "string" ? body.matchedSlug.trim() : "";
    const decision = typeof body.decision === "string" ? body.decision.trim().toLowerCase() : "";

    if (!noteId || !candidateName || !decision) {
      return new Response(JSON.stringify({ error: "noteId, candidateName, and decision are required" }), { status: 400 });
    }
    if (decision !== "same" && decision !== "different") {
      return new Response(JSON.stringify({ error: "decision must be 'same' or 'different'" }), { status: 400 });
    }

    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const userId = user.id;

    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id,book_id,chapter_number,ai_summary")
      .eq("id", noteId)
      .single();
    if (noteError) throw noteError;
    if (!note?.book_id) {
      return new Response(JSON.stringify({ error: "Note not found" }), { status: 404 });
    }

    const chapterNumber = Number(note.chapter_number);
    if (!Number.isFinite(chapterNumber)) {
      return new Response(JSON.stringify({ error: "Invalid chapter number on note" }), { status: 400 });
    }

    const now = new Date().toISOString();
    if (decision === "same") {
      if (!matchedSlug) {
        return new Response(JSON.stringify({ error: "matchedSlug is required when decision is 'same'" }), { status: 400 });
      }
      const { data: existingCharacter } = await supabase
        .from("characters")
        .select("slug,name,first_chapter,last_chapter")
        .eq("book_id", note.book_id)
        .eq("slug", matchedSlug)
        .single();

      const firstChapter = Number(existingCharacter?.first_chapter);
      const lastChapter = Number(existingCharacter?.last_chapter);
      const nextFirst = Number.isFinite(firstChapter) ? Math.min(firstChapter, chapterNumber) : chapterNumber;
      const nextLast = Number.isFinite(lastChapter) ? Math.max(lastChapter, chapterNumber) : chapterNumber;
      const resolvedName =
        (typeof existingCharacter?.name === "string" && existingCharacter.name.trim()) ||
        matchedName ||
        candidateName;

      await supabase
        .from("characters")
        .upsert(
          {
            book_id: note.book_id,
            user_id: userId,
            slug: matchedSlug,
            name: resolvedName,
            first_chapter: nextFirst,
            last_chapter: nextLast,
            updated_at: now,
          },
          { onConflict: "book_id,slug" },
        );

      const updatedSummary = replaceCharacterInSummary(note.ai_summary, candidateName, resolvedName);
      await supabase
        .from("notes")
        .update({ ai_summary: updatedSummary })
        .eq("id", noteId);

      await supabase
        .from("book_chapter_memory")
        .upsert(
          {
            book_id: note.book_id,
            chapter_number: chapterNumber,
            summary: updatedSummary ?? {},
            updated_at: now,
            user_id: userId,
          },
          { onConflict: "book_id,chapter_number" },
        );

      return Response.json({
        ok: true,
        decision,
        resolvedName,
        summary: updatedSummary,
      });
    }

    const candidateSlug = slugifyName(candidateName);
    if (!candidateSlug) {
      return new Response(JSON.stringify({ error: "Invalid candidate character name" }), { status: 400 });
    }
    await supabase
      .from("characters")
      .upsert(
        {
          book_id: note.book_id,
          user_id: userId,
          slug: candidateSlug,
          name: candidateName,
          role: null,
          short_bio: null,
          full_bio: null,
          first_chapter: chapterNumber,
          last_chapter: chapterNumber,
          relationships: [],
          timeline: [],
          updated_at: now,
        },
        { onConflict: "book_id,slug" },
      );

    try {
      const origin = req.nextUrl.origin;
      const cookie = req.headers.get("cookie");
      await fetch(`${origin}/api/characters/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ bookId: note.book_id, names: [candidateName] }),
      });
    } catch (generateError) {
      console.error("Failed to generate character after typo resolution:", generateError);
    }

    return Response.json({ ok: true, decision, createdName: candidateName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to resolve typo";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
