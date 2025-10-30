import OpenAI from "openai";
import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getAiConfig } from "@/lib/ai/client";
import { characterBioSystemPromptV1 } from "@/lib/ai/prompts";

export const runtime = "nodejs";

type NoteRow = {
  id: string;
  chapter_number: number;
  content: string;
  ai_summary: unknown;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function firstSentence(text: string, maxChars = 220): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const match = t.match(/^[^.!?]{5,}([.!?]|$)/);
  const sentence = match ? match[0] : t.slice(0, maxChars);
  return sentence.length > maxChars ? sentence.slice(0, maxChars - 1) + "…" : sentence;
}

function extractFields(ai: unknown): { characters: string[]; relationships: string[]; summary: string[] } {
  const base = { characters: [] as string[], relationships: [] as string[], summary: [] as string[] };
  if (!ai || typeof ai !== "object") return base;
  const rec = ai as { characters?: unknown; relationships?: unknown; summary?: unknown };
  const toList = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").map((s) => (s as string).trim()) : []);
  return {
    characters: toList(rec.characters),
    relationships: toList(rec.relationships),
    summary: toList(rec.summary),
  };
}

function collectCharacters(notes: NoteRow[]): string[] {
  const set = new Set<string>();
  for (const n of notes) {
    const arr = extractFields(n.ai_summary).characters;
    for (const name of arr) {
      if (typeof name === "string" && name.trim()) set.add(name.trim());
    }
  }
  return Array.from(set);
}

function appearsInNote(name: string, note: NoteRow): boolean {
  const fields = extractFields(note.ai_summary);
  const chars: string[] = fields.characters;
  const rels: string[] = fields.relationships;
  const norm = name.toLowerCase();
  if (chars.some((c) => typeof c === "string" && c.toLowerCase() === norm)) return true;
  if (rels.some((r) => typeof r === "string" && r.toLowerCase().includes(norm))) return true;
  return false;
}

function aggregateRelationships(name: string, notes: NoteRow[]): { other: string; label: string }[] {
  const results: { other: string; label: string }[] = [];
  const seen = new Set<string>();
  const norm = name.toLowerCase();
  const pattern = /([A-Za-z][A-Za-z'\-]+)(?:\s*&\s*|\s*->\s*|\s*<->\s*|\s*\u2192\s*)([A-Za-z][A-Za-z'\-]+)\s*-\s*(.+)$/;
  for (const n of notes) {
    const rels: string[] = extractFields(n.ai_summary).relationships;
    for (const r of rels) {
      if (typeof r !== "string") continue;
      if (!r.toLowerCase().includes(norm)) continue;
      const m = r.match(pattern);
      if (!m) continue;
      const a = m[1];
      const b = m[2];
      const label = (m[3] || "").trim();
      const other = a.toLowerCase() === norm ? b : b.toLowerCase() === norm ? a : "";
      if (!other) continue;
      const key = `${other.toLowerCase()}|${label.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ other, label });
    }
  }
  return results.slice(0, 12);
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mock = url.searchParams.get("mock") === "1" || process.env.MOCK_AI === "1" || process.env.NEXT_PUBLIC_MOCK_AI === "1";
    const body = (await req.json()) as { bookId?: unknown; names?: unknown };
    const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";
    const names = Array.isArray(body.names)
      ? (body.names as unknown[]).map((n) => (typeof n === "string" ? n.trim() : "")).filter(Boolean)
      : [];
    if (!bookId) {
      return new Response(JSON.stringify({ error: "bookId is required" }), { status: 400 });
    }

    if (mock) {
      return Response.json({ updated: names });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
    }

    const supabase = getServiceSupabase();
    const { data: notes, error: notesErr } = await supabase
      .from("notes")
      .select("id,chapter_number,content,ai_summary")
      .eq("book_id", bookId)
      .order("chapter_number", { ascending: true });
    if (notesErr) throw notesErr;
    const allNotes = (notes ?? []) as NoteRow[];
    if (allNotes.length === 0) {
      return Response.json({ updated: [] });
    }

    // Determine target characters
    const allCharacters = collectCharacters(allNotes);
    const targetNames = names.length > 0 ? names : allCharacters;
    if (targetNames.length === 0) {
      return Response.json({ updated: [] });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const ai = getAiConfig("characters");

    const updated: string[] = [];
    for (const name of targetNames) {
      const relevant = allNotes.filter((n) => appearsInNote(name, n));
      if (relevant.length === 0) {
        // Create placeholder if nothing yet
        const { error: upErr } = await supabase
          .from("characters")
          .upsert(
            {
              book_id: bookId,
              slug: slugify(name),
              name,
              short_bio: null,
              full_bio: null,
              role: null,
              first_chapter: null,
              last_chapter: null,
              relationships: [],
              timeline: [],
              updated_at: new Date().toISOString(),
            },
            { onConflict: "book_id,slug" },
          );
        if (upErr) throw upErr;
        updated.push(name);
        continue;
      }

      // Compute first/last chapters and naive timeline snippets
      const chapters = Array.from(new Set(relevant.map((r) => r.chapter_number))).sort((a, b) => a - b);
      const timeline = chapters.slice(0, 30).map((chapter) => {
        const inChapter = relevant.filter((r) => r.chapter_number === chapter);
        const textPool: string[] = [];
        for (const r of inChapter) {
          if (typeof r.content === "string" && r.content.trim()) textPool.push(r.content.trim());
          const fields = extractFields(r.ai_summary);
          const sum = Array.isArray(fields.summary) ? fields.summary.join(" ") : "";
          if (sum) textPool.push(sum);
        }
        const combined = textPool.join(" \n").slice(0, 1200);
        const snippet = firstSentence(combined, 220);
        return { chapterNumber: chapter, snippet };
      });

      const relationships = aggregateRelationships(name, relevant);

      // Ask AI for role + bios based on the condensed timeline and relationships
      const aiUser = `
Character: ${name}
Timeline (chapter -> snippet):
${timeline.map((t) => `- Chapter ${t.chapterNumber}: ${t.snippet}`).join("\n")}

Relationships:
${relationships.map((r) => `- ${name} & ${r.other} - ${r.label}`).join("\n") || "- None"}

Task: Return JSON with fields {"role": string, "shortBio": string (<=60 words), "fullBio": string (<=250 words)}. Do not include any other text.`.trim();

      const resp = await client.responses.create({
        model: process.env.AI_MODEL_CHARACTERS || ai.model,
        reasoning: { effort: "low" },
        input: [
          { role: "system", content: characterBioSystemPromptV1 },
          { role: "user", content: aiUser },
        ],
        max_output_tokens: (process.env.AI_MAX_TOKENS_CHARACTERS ? parseInt(process.env.AI_MAX_TOKENS_CHARACTERS, 10) : ai.maxOutputTokens),
      });

      let role: string | null = null;
      let shortBio: string | null = null;
      let fullBio: string | null = null;
      try {
        const raw = (resp.output_text ?? "").trim();
        const json = (() => {
          try {
            return JSON.parse(raw);
          } catch {
            const fenced = raw.match(/```json\s*([\s\S]*?)```/i) ?? raw.match(/```\s*([\s\S]*?)```/);
            if (fenced) {
              try {
                return JSON.parse(fenced[1]);
              } catch {
                return {};
              }
            }
            const start = raw.indexOf("{");
            const end = raw.lastIndexOf("}");
            if (start !== -1 && end > start) {
              try {
                return JSON.parse(raw.slice(start, end + 1));
              } catch {
                return {};
              }
            }
            return {};
          }
        })();
        role = typeof json.role === "string" ? json.role.trim() : null;
        shortBio = typeof json.shortBio === "string" ? json.shortBio.trim() : null;
        fullBio = typeof json.fullBio === "string" ? json.fullBio.trim() : null;
      } catch {
        // swallow
      }

      const { error: upsertErr } = await supabase
        .from("characters")
        .upsert(
          {
            book_id: bookId,
            slug: slugify(name),
            name,
            role,
            short_bio: shortBio,
            full_bio: fullBio,
            first_chapter: chapters[0] ?? null,
            last_chapter: chapters[chapters.length - 1] ?? null,
            relationships: relationships.map((r) => ({ name: r.other, label: r.label })),
            timeline,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "book_id,slug" },
        );
      if (upsertErr) throw upsertErr;
      updated.push(name);
    }

    return Response.json({ updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to generate characters";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
