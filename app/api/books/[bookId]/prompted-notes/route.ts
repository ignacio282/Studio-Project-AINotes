import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PromptPayload = {
  title?: unknown;
  context?: unknown;
  questions?: unknown;
  topic?: unknown;
};

type RequestBody = {
  chapterNumber?: unknown;
  content?: unknown;
  prompt?: PromptPayload;
};

function parseChapterNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  const parsed = typeof raw === "string" ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeQuestions(raw: unknown): string[] {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  return Array.isArray(raw)
    ? raw.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  try {
    const { bookId } = await context.params;
    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }

    const body = (await req.json()) as RequestBody;
    const chapterNumber = parseChapterNumber(body.chapterNumber);
    const content = normalizeString(body.content);
    const prompt = body.prompt ?? {};

    if (!chapterNumber) {
      return new Response(JSON.stringify({ error: "chapterNumber is required" }), { status: 400 });
    }
    if (!content) {
      return new Response(JSON.stringify({ error: "content is required" }), { status: 400 });
    }

    const title = normalizeString(prompt.title) || "Prompted note";
    const contextText = normalizeString(prompt.context);
    const questions = normalizeQuestions(prompt.questions);
    const topic = normalizeString(prompt.topic);

    const supabase = getServiceSupabase();
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        book_id: bookId,
        chapter_number: chapterNumber,
        content,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (noteError) throw noteError;

    const noteId = note?.id;
    if (!noteId) {
      throw new Error("Unable to create note.");
    }

    const { error: promptError } = await supabase
      .from("note_prompts")
      .insert({
        note_id: noteId,
        book_id: bookId,
        chapter_number: chapterNumber,
        title,
        context: contextText || null,
        questions: questions.length > 0 ? questions : null,
        topic: topic || null,
        created_at: new Date().toISOString(),
      });
    if (promptError) throw promptError;

    return Response.json({ noteId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create prompted note.";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
