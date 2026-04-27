import OpenAI from "openai";
import { requireUser } from "@/lib/supabase/require-user";
import { getAiConfig } from "@/lib/ai/client";
import { buildPlaceSnapshotFromKnowledge, fetchPlaceKnowledge } from "@/lib/knowledge/read";

export const runtime = "nodejs";

function toStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function tryParseJson(raw: string): unknown {
  const text = raw.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {}
    }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {}
    }
  }
  return null;
}

function responseText(response: unknown): string {
  const rec = response as { output_text?: unknown; output?: unknown };
  if (typeof rec?.output_text === "string") return rec.output_text;
  if (!Array.isArray(rec?.output)) return "";
  return rec.output
    .flatMap((item) => {
      const content = (item as { content?: unknown })?.content;
      return Array.isArray(content) ? content : [];
    })
    .map((item) => {
      const entry = item as { text?: unknown };
      return typeof entry.text === "string" ? entry.text : "";
    })
    .join("\n");
}

function normalizeEventList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as { chapterNumber?: unknown; chapter?: unknown; text?: unknown; event?: unknown };
      const chapterNumber = Number(rec.chapterNumber ?? rec.chapter);
      const text = typeof rec.text === "string" ? rec.text.trim() : typeof rec.event === "string" ? rec.event.trim() : "";
      if (!Number.isFinite(chapterNumber) || chapterNumber <= 0 || !text) return null;
      return { chapterNumber: Math.floor(chapterNumber), text };
    })
    .filter((item): item is { chapterNumber: number; text: string } => Boolean(item))
    .slice(0, 4);
}

function normalizeCharacters(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, chapters: [], noteCount: 0 } : null;
      }
      if (!item || typeof item !== "object") return null;
      const rec = item as { name?: unknown; chapters?: unknown; noteCount?: unknown };
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      const chapters = Array.isArray(rec.chapters)
        ? rec.chapters.map((chapter) => Number(chapter)).filter((chapter) => Number.isFinite(chapter) && chapter > 0)
        : [];
      if (!name) return null;
      return { name, chapters, noteCount: Number(rec.noteCount) || 0 };
    })
    .filter((item): item is { name: string; chapters: number[]; noteCount: number } => Boolean(item))
    .slice(0, 8);
}

function normalizeActivity(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as { name?: unknown; summary?: unknown; chapters?: unknown };
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      const summary = typeof rec.summary === "string" ? rec.summary.trim() : "";
      const chapters = Array.isArray(rec.chapters)
        ? rec.chapters.map((chapter) => Number(chapter)).filter((chapter) => Number.isFinite(chapter) && chapter > 0)
        : [];
      if (!name || !summary) return null;
      return { name, summary, chapters };
    })
    .filter((item): item is { name: string; summary: string; chapters: number[] } => Boolean(item))
    .slice(0, 3);
}

function normalizeMovement(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as { chapterNumber?: unknown; chapter?: unknown; before?: unknown; here?: unknown; after?: unknown };
      const chapterNumber = Number(rec.chapterNumber ?? rec.chapter);
      const before = typeof rec.before === "string" ? rec.before.trim() : "";
      const here = typeof rec.here === "string" ? rec.here.trim() : "";
      const after = typeof rec.after === "string" ? rec.after.trim() : "";
      if (!Number.isFinite(chapterNumber) || chapterNumber <= 0 || (!before && !here && !after)) return null;
      return { chapterNumber: Math.floor(chapterNumber), before, here, after };
    })
    .filter((item): item is { chapterNumber: number; before: string; here: string; after: string } => Boolean(item))
    .slice(0, 6);
}

function normalizeAiSnapshot(raw: unknown, fallback: NonNullable<ReturnType<typeof buildPlaceSnapshotFromKnowledge>>) {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const fallbackStructured = fallback.structured;
  const overview =
    typeof rec.overview === "string" && rec.overview.trim()
      ? rec.overview.trim()
      : fallbackStructured.overview;
  const storyRole =
    typeof rec.storyRole === "string" && rec.storyRole.trim()
      ? rec.storyRole.trim()
      : typeof fallbackStructured.storyRole === "string"
        ? fallbackStructured.storyRole
        : "";
  return {
    ...fallback,
    id: `place-ai:${fallback.place_slug}:${Date.now()}`,
    answer: overview,
    structured: {
      ...fallbackStructured,
      overview,
      storyRole,
      events: normalizeEventList(rec.events).length ? normalizeEventList(rec.events) : fallbackStructured.events,
      charactersPresent: normalizeCharacters(rec.charactersPresent).length
        ? normalizeCharacters(rec.charactersPresent)
        : fallbackStructured.charactersPresent,
      characterActivity: normalizeActivity(rec.characterActivity).length
        ? normalizeActivity(rec.characterActivity)
        : fallbackStructured.characterActivity,
      dynamics: toStringList(rec.dynamics).length ? toStringList(rec.dynamics).slice(0, 3) : fallbackStructured.dynamics,
      movement: normalizeMovement(rec.movement).length ? normalizeMovement(rec.movement) : [],
      evidence: toStringList(rec.evidence).length ? toStringList(rec.evidence).slice(0, 10) : fallbackStructured.evidence,
      openQuestions: toStringList(rec.openQuestions).slice(0, 6),
      sources: fallback.sources,
    },
    created_at: new Date().toISOString(),
  };
}

function buildPrompt(snapshot: NonNullable<ReturnType<typeof buildPlaceSnapshotFromKnowledge>>) {
  return [
    {
      role: "system" as const,
      content:
        "You refine a reader's place sheet using only provided saved-note evidence. Make it short, polished, complete, and user-facing. Do not truncate sentences. Do not expose raw note text. Do not add facts, spoilers, or external knowledge. Return only valid JSON.",
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        placeName: snapshot.place_name,
        sourceChapters: snapshot.sources,
        deterministic: snapshot.structured,
        requiredShape: {
          overview: "1-2 short sentences describing what this place is used for in the saved notes",
          storyRole: "1 short sentence explaining why this place matters to the current story context",
          events: [{ chapterNumber: 1, text: "short synthesized event, not a quote" }],
          charactersPresent: [{ name: "string", chapters: [1], noteCount: 1 }],
          characterActivity: [{ name: "string", summary: "short synthesized action only if distinct", chapters: [1] }],
          dynamics: ["short synthesized relationship or tension visible in this place"],
          evidence: ["internal support snippets, short"],
          openQuestions: ["only if important"],
        },
      }),
    },
  ];
}

export async function POST(_request: Request, context: { params: Promise<{ bookId: string; slug: string }> }) {
  const { bookId, slug } = await context.params;
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
  if (bookError) {
    console.error("Place snapshot book lookup failed:", bookError);
    return Response.json({ error: "Unable to load this book." }, { status: 500 });
  }
  if (!book) {
    return Response.json({ error: "Place not found." }, { status: 404 });
  }

  const knowledge = await fetchPlaceKnowledge(supabase, user.id, bookId, slug);
  const fallback = buildPlaceSnapshotFromKnowledge(knowledge);
  if (!fallback) {
    return Response.json({ error: "Place not found." }, { status: 404 });
  }

  if (process.env.MOCK_AI === "1" || !process.env.OPENAI_API_KEY) {
    return Response.json({ snapshot: fallback, generated: false });
  }

  try {
    const config = getAiConfig("assistant");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: config.model,
      max_output_tokens: Math.min(config.maxOutputTokens, 1200),
      input: buildPrompt(fallback),
    });
    const parsed = tryParseJson(responseText(response));
    const snapshot = normalizeAiSnapshot(parsed, fallback);
    return Response.json({ snapshot, generated: true });
  } catch (error) {
    console.error("Place snapshot refinement failed:", error);
    return Response.json({ snapshot: fallback, generated: false });
  }
}
