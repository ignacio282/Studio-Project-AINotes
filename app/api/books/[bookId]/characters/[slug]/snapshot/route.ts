import OpenAI from "openai";
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getAiConfig } from "@/lib/ai/client";
import { formatProgressLabel, normalizeTrackingMode } from "@/lib/books/progress";
import { getCharacterReadiness } from "@/lib/characters/readiness";
import { fetchCharacterKnowledge } from "@/lib/knowledge/read";

export const runtime = "nodejs";

type MemoryRow = {
  chapter_number: number;
  summary: unknown;
};

type NoteRow = {
  id: string;
  chapter_number: number;
  content: string | null;
  ai_summary: unknown;
  created_at: string | null;
};

type CharacterRow = {
  name: string;
  role: string | null;
  short_bio: string | null;
  full_bio: string | null;
  first_chapter: number | null;
  last_chapter: number | null;
  relationships: unknown;
  timeline: unknown;
  updated_at: string | null;
};

type CharacterSnapshot = {
  characterSheetVersion: number;
  roleLabel: string;
  summary: string;
  quickMemory: string;
  roleInStory: string;
  developmentArc: string;
  traits: Array<{ label: string; evidence: string }>;
  motivations: Array<{ label: string; evidence: string }>;
  distinctives: string[];
  relationships: Array<{ name: string; label: string; summary: string; beats: string[] }>;
  timeline: { chapterNumber: number; event: string }[];
  evidence: string[];
  openQuestions: string[];
};

const CHARACTER_SHEET_VERSION = 5;

function toStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function normalizeSummary(summary: unknown) {
  if (!summary || typeof summary !== "object") {
    return {
      summary: [],
      characters: [],
      setting: [],
      relationships: [],
      reflections: [],
      extras: [],
    };
  }
  const rec = summary as {
    summary?: unknown;
    characters?: unknown;
    setting?: unknown;
    relationships?: unknown;
    reflections?: unknown;
    extras?: unknown;
    extraSections?: unknown;
  };
  const extrasSource = rec.extraSections ?? rec.extras ?? [];
  const extras = Array.isArray(extrasSource)
    ? extrasSource
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const item = entry as { title?: unknown; items?: unknown };
          const title = typeof item.title === "string" ? item.title.trim() : "";
          if (!title) return null;
          return { title, items: toStringList(item.items) };
        })
        .filter(Boolean)
    : [];
  return {
    summary: toStringList(rec.summary),
    characters: toStringList(rec.characters),
    setting: toStringList(rec.setting),
    relationships: toStringList(rec.relationships),
    reflections: toStringList(rec.reflections),
    extras,
  };
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
      } catch {
        // ignore
      }
    }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // ignore
      }
    }
  }
  return null;
}

function normalizeTimeline(value: unknown): { chapterNumber: number; event: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as { chapterNumber?: unknown; chapter?: unknown; event?: unknown; snippet?: unknown };
      const chapterNumber = Number(rec.chapterNumber ?? rec.chapter);
      const event = typeof rec.event === "string" ? rec.event.trim() : typeof rec.snippet === "string" ? rec.snippet.trim() : "";
      if (!Number.isFinite(chapterNumber) || chapterNumber <= 0 || !event) return null;
      return { chapterNumber: Math.floor(chapterNumber), event };
    })
    .filter((item): item is { chapterNumber: number; event: string } => Boolean(item))
    .slice(0, 8);
}

function normalizeLabeledItems(value: unknown): Array<{ label: string; evidence: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { label: text, evidence: "" } : null;
      }
      if (!item || typeof item !== "object") return null;
      const rec = item as { label?: unknown; evidence?: unknown; text?: unknown };
      const label = typeof rec.label === "string" ? rec.label.trim() : typeof rec.text === "string" ? rec.text.trim() : "";
      const evidence = typeof rec.evidence === "string" ? rec.evidence.trim() : "";
      if (!label) return null;
      return { label, evidence };
    })
    .filter((item): item is { label: string; evidence: string } => Boolean(item))
    .slice(0, 8);
}

function normalizeRelationshipCards(value: unknown): Array<{ name: string; label: string; summary: string; beats: string[] }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const match = item.trim().match(/^([^:]{1,60}):\s*(.+)$/);
        if (!match) return null;
        return { name: match[1].trim(), label: "", summary: match[2].trim(), beats: [] };
      }
      if (!item || typeof item !== "object") return null;
      const rec = item as { name?: unknown; label?: unknown; summary?: unknown; beats?: unknown; detail?: unknown };
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      const label = typeof rec.label === "string" ? rec.label.trim() : "";
      const summary =
        typeof rec.summary === "string" ? rec.summary.trim() : typeof rec.detail === "string" ? rec.detail.trim() : "";
      const beats = toStringList(rec.beats).slice(0, 5);
      if (!name || (!summary && beats.length === 0)) return null;
      return { name, label, summary, beats };
    })
    .filter((item): item is { name: string; label: string; summary: string; beats: string[] } => Boolean(item))
    .slice(0, 8);
}

function normalizeSnapshot(raw: unknown, fallbackSummary: string): CharacterSnapshot {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const summary =
    typeof rec.summary === "string" && rec.summary.trim() && !isLowValueProfileText(rec.summary)
      ? rec.summary.trim()
      : fallbackSummary;
  return {
    characterSheetVersion: CHARACTER_SHEET_VERSION,
    roleLabel:
      typeof rec.roleLabel === "string" && rec.roleLabel.trim()
        ? rec.roleLabel.trim()
        : "Role not clear yet",
    summary,
    quickMemory:
      typeof rec.quickMemory === "string" && rec.quickMemory.trim()
        ? rec.quickMemory.trim()
        : summary,
    roleInStory:
      typeof rec.roleInStory === "string" && rec.roleInStory.trim()
        ? rec.roleInStory.trim()
        : "",
    developmentArc:
      typeof rec.developmentArc === "string" && rec.developmentArc.trim()
        ? rec.developmentArc.trim()
        : "",
    traits: normalizeLabeledItems(rec.traits),
    motivations: normalizeLabeledItems(rec.motivations),
    distinctives: toStringList(rec.distinctives).slice(0, 8),
    relationships: normalizeRelationshipCards(rec.relationships),
    timeline: normalizeTimeline(rec.timeline),
    evidence: toStringList(rec.evidence).slice(0, 8),
    openQuestions: toStringList(rec.openQuestions).slice(0, 5),
  };
}

function isLowValueProfileText(value: unknown): boolean {
  const text = typeof value === "string" ? value.toLowerCase() : "";
  if (!text.trim()) return true;
  return [
    "highlighted in chapter",
    "driving the narrative forward",
    "central figure in chapter",
    "provided notes",
    "primary lens for the narrative",
    "character dynamics are described",
  ].some((needle) => text.includes(needle));
}

function formatMemoryBlock(row: MemoryRow, trackingMode: string): string {
  const summary = normalizeSummary(row.summary);
  const lines: string[] = [];
  if (summary.summary.length > 0) lines.push(`Summary: ${summary.summary.join(" ")}`);
  if (summary.characters.length > 0) lines.push(`Characters: ${summary.characters.join(", ")}`);
  if (summary.setting.length > 0) lines.push(`Setting: ${summary.setting.join(", ")}`);
  if (summary.relationships.length > 0) lines.push(`Relationships: ${summary.relationships.join("; ")}`);
  if (summary.reflections.length > 0) lines.push(`Reflections: ${summary.reflections.join("; ")}`);
  summary.extras.forEach((section) => {
    if (section && section.title && Array.isArray(section.items) && section.items.length > 0) {
      lines.push(`${section.title}: ${section.items.join("; ")}`);
    }
  });
  const detail = lines.join("\n").trim();
  return `${formatProgressLabel(trackingMode, row.chapter_number)}:\n${detail || "(no structured details yet)"}`;
}

function textPreview(value: unknown, maxChars = 700): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const sliced = text.slice(0, maxChars);
  return sliced.replace(/\s+\S*$/, "").trim() || sliced.trim();
}

function formatNoteBlock(note: NoteRow, trackingMode: string): string {
  const summary = normalizeSummary(note.ai_summary);
  const lines: string[] = [];
  const content = textPreview(note.content);
  if (content) lines.push(`Raw note: ${content}`);
  if (summary.summary.length > 0) lines.push(`Summary: ${summary.summary.join(" ")}`);
  if (summary.characters.length > 0) lines.push(`Characters: ${summary.characters.join(", ")}`);
  if (summary.relationships.length > 0) lines.push(`Relationships: ${summary.relationships.join("; ")}`);
  if (summary.reflections.length > 0) lines.push(`Reflections: ${summary.reflections.join("; ")}`);
  return `${formatProgressLabel(trackingMode, note.chapter_number)}:\n${lines.join("\n").trim() || "(no note detail yet)"}`;
}

function extractCharacterMemory(rows: MemoryRow[], characterName: string): MemoryRow[] {
  const target = characterName.toLowerCase();
  const matching = rows.filter((row) => JSON.stringify(row.summary ?? {}).toLowerCase().includes(target));
  return matching.slice(-8);
}

function extractCharacterNotes(notes: NoteRow[], characterName: string): NoteRow[] {
  const target = characterName.toLowerCase();
  const matching = notes.filter((note) => {
    const content = typeof note.content === "string" ? note.content.toLowerCase() : "";
    const summary = JSON.stringify(note.ai_summary ?? {}).toLowerCase();
    return content.includes(target) || summary.includes(target);
  });
  return matching.slice(-12);
}

function extractCharacterRelationshipsFromNotes(notes: NoteRow[], characterName: string): string[] {
  const target = characterName.toLowerCase();
  const values = notes.flatMap((note) => {
    const summary = normalizeSummary(note.ai_summary);
    return summary.relationships.filter((entry) => entry.toLowerCase().includes(target));
  });
  return Array.from(new Set(values)).slice(0, 12);
}

function extractCharacterRelationshipsFromMemory(rows: MemoryRow[], characterName: string): string[] {
  const target = characterName.toLowerCase();
  const values = rows.flatMap((row) => {
    const summary = normalizeSummary(row.summary);
    return summary.relationships.filter((entry) => entry.toLowerCase().includes(target));
  });
  return Array.from(new Set(values)).slice(0, 12);
}

function mergeSources(memoryRows: MemoryRow[], notes: NoteRow[]): number[] {
  return Array.from(
    new Set(
      [
        ...memoryRows.map((row) => Number(row.chapter_number)),
        ...notes.map((note) => Number(note.chapter_number)),
      ].filter((value) => Number.isFinite(value) && value > 0),
    ),
  ).sort((a, b) => a - b);
}

function fallbackEvidence(notes: NoteRow[], memoryRows: MemoryRow[], trackingMode: string): string[] {
  const fromNotes = notes
    .map((note) => {
      const preview = textPreview(note.content, 180);
      return preview ? `${formatProgressLabel(trackingMode, note.chapter_number)}: ${preview}` : "";
    })
    .filter(Boolean);
  if (fromNotes.length > 0) return fromNotes.slice(0, 6);
  return memoryRows
    .map((row) => `${formatProgressLabel(trackingMode, row.chapter_number)}: Mentioned in saved memory.`)
    .slice(0, 6);
}

function fallbackDistinctives(character: CharacterRow): string[] {
  return [character.short_bio, character.full_bio]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .slice(0, 2);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const text = value.replace(/\s+/g, " ").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result;
}

function uniqueNotes(notes: NoteRow[]): NoteRow[] {
  return Array.from(new Map(notes.map((note) => [note.id, note])).values()).sort(
    (a, b) => Number(a.chapter_number) - Number(b.chapter_number),
  );
}

type CharacterKnowledge = Awaited<ReturnType<typeof fetchCharacterKnowledge>>;

function getKnowledgeSources(knowledge: CharacterKnowledge): number[] {
  if (!knowledge) return [];
  return Array.from(
    new Set(
      [
        ...knowledge.mentions.map((mention) => Number(mention.chapter_number)),
        ...knowledge.timeline.map((event) => Number(event.chapter_number)),
        knowledge.entity.first_chapter,
        knowledge.entity.last_chapter,
      ].filter((value) => Number.isFinite(Number(value)) && Number(value) > 0).map(Number),
    ),
  ).sort((a, b) => a - b);
}

function compactCitation(label: string, value: unknown, maxChars = 140): string {
  const preview = textPreview(value, maxChars);
  return preview ? `${label}: ${preview}` : "";
}

function getExtractedKnowledgeRelationships(knowledge: CharacterKnowledge): string[] {
  if (!knowledge) return [];
  return uniqueStrings(
    knowledge.mentions.flatMap((mention) => {
      const relationships = mention.extracted?.relationships;
      return Array.isArray(relationships)
        ? relationships.map((entry) => (typeof entry === "string" ? entry : "")).filter(Boolean)
        : [];
    }),
  );
}

function normalizeRelationshipPersonName(value: string): string {
  return value
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function relationshipKey(value: string): string {
  return normalizeRelationshipPersonName(value).toLowerCase();
}

function stripRelationshipPrefix(raw: string, characterName: string, otherName: string): string {
  let text = raw.replace(/\s+/g, " ").trim();
  const names = [characterName, otherName, normalizeRelationshipPersonName(otherName)]
    .filter(Boolean)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  names.forEach((name) => {
    text = text
      .replace(new RegExp(`^${name}\\s*[:\\-—–]\\s*`, "i"), "")
      .replace(new RegExp(`^${name}\\s*(?:&|and|->|→|↔|—|–)\\s*`, "i"), "")
      .replace(new RegExp(`\\s*(?:&|and|->|→|↔|—|–)\\s*${name}\\s*[:\\-—–]?\\s*`, "i"), " ");
  });
  return text.replace(/\s+/g, " ").trim();
}

function buildGroupedRelationshipSummaries(
  knowledge: CharacterKnowledge,
  characterName: string,
): string[] {
  if (!knowledge) return [];
  const groups = new Map<string, { name: string; details: string[] }>();
  const addDetail = (otherName: string, rawDetail: string) => {
    const cleanName = normalizeRelationshipPersonName(otherName);
    const key = relationshipKey(cleanName);
    const detail = stripRelationshipPrefix(rawDetail, characterName, cleanName);
    if (!key || !detail) return;
    const group = groups.get(key) ?? { name: cleanName, details: [] };
    const detailKey = detail.toLowerCase();
    if (!group.details.some((existing) => existing.toLowerCase() === detailKey || existing.toLowerCase().includes(detailKey) || detailKey.includes(existing.toLowerCase()))) {
      group.details.push(detail);
    }
    groups.set(key, group);
  };

  knowledge.relationships.forEach((row) => {
    const detail = textPreview(row.description || row.label || row.evidence, 360);
    if (row.otherName && detail) addDetail(row.otherName, detail);
  });

  if (groups.size === 0) {
    getExtractedKnowledgeRelationships(knowledge).forEach((entry) => {
      const match = entry.match(/^(.+?)(?:\s*(?:&|and|->|→|↔|—|–)\s*|:\s*)(.+?)(?:\s*[-:—–]\s*|\s+are\s+|\s+is\s+)(.+)$/i);
      if (!match) return;
      const left = match[1]?.trim() ?? "";
      const right = match[2]?.trim() ?? "";
      const detail = match[3]?.trim() ?? entry;
      const other = relationshipKey(left) === relationshipKey(characterName) ? right : left;
      addDetail(other, detail);
    });
  }

  return Array.from(groups.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => `${group.name}: ${group.details.slice(0, 3).join("; ")}`)
    .slice(0, 8);
}

function inferRoleLabel(character: CharacterRow, knowledge: CharacterKnowledge, relationshipText: string[]): string {
  const explicit = String(character.role ?? "").trim();
  if (explicit && explicit.toLowerCase() !== character.name.toLowerCase() && explicit.toLowerCase() !== "character") {
    return explicit;
  }
  const haystack = [
    character.short_bio,
    character.full_bio,
    ...(knowledge?.mentions ?? []).map((mention) => mention.source_text),
    ...relationshipText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("main character") || haystack.includes("central character")) return "Main character";
  if (Number(knowledge?.entity.mention_count ?? 0) >= 3) return "Recurring character";
  if (haystack.includes("guide") || haystack.includes("teacher")) return "Guide";
  return "Role not clear yet";
}

function buildDeterministicSummary(character: CharacterRow, knowledge: CharacterKnowledge, sources: number[], roleLabel = ""): string {
  if (character.short_bio && !isLowValueProfileText(character.short_bio)) return character.short_bio;
  if (character.full_bio && !isLowValueProfileText(character.full_bio)) return character.full_bio;
  const first = sources[0] ?? character.first_chapter;
  const last = sources[sources.length - 1] ?? character.last_chapter;
  const range =
    Number.isFinite(Number(first)) && Number.isFinite(Number(last)) && first !== last
      ? `from ${formatProgressLabel("chapter", Number(first))} through ${formatProgressLabel("chapter", Number(last))}`
      : Number.isFinite(Number(first))
        ? `in ${formatProgressLabel("chapter", Number(first))}`
        : "in your notes";
  const related = knowledge
    ? uniqueStrings(knowledge.relationships.map((row) => row.otherName).filter(Boolean)).slice(0, 3)
    : [];
  const role = roleLabel === "Main character"
    ? `${character.name} is the main character in your notes so far.`
    : roleLabel && roleLabel !== "Role not clear yet"
      ? `${character.name} is a ${roleLabel.toLowerCase()} in your notes so far.`
      : `${character.name} is a character you have tracked ${range}.`;
  const relationText = related.length > 0 ? ` Your notes connect ${character.name} with ${related.join(", ")}.` : "";
  return `${role}${relationText}`.trim();
}

function buildDeterministicSnapshot({
  character,
  knowledge,
  relevantNotes,
  relevantMemory,
  relationships,
  sources,
  trackingMode,
}: {
  character: CharacterRow;
  knowledge: CharacterKnowledge;
  relevantNotes: NoteRow[];
  relevantMemory: MemoryRow[];
  relationships: string[];
  sources: number[];
  trackingMode: string;
}): CharacterSnapshot {
  const roleLabel = inferRoleLabel(character, knowledge, relationships);
  const timeline = knowledge?.timeline.length
    ? knowledge.timeline.map((event) => ({
        chapterNumber: Number(event.chapter_number),
        event: textPreview(event.event_text, 360),
      }))
    : normalizeTimeline(character.timeline);
  const evidenceFromKnowledge =
    knowledge?.mentions
      .map((mention) =>
        compactCitation(formatProgressLabel(trackingMode, Number(mention.chapter_number)), mention.source_text, 140),
      )
      .filter(Boolean)
      .slice(0, 8) ?? [];

  return {
    characterSheetVersion: CHARACTER_SHEET_VERSION - 1,
    roleLabel,
    summary: buildDeterministicSummary(character, knowledge, sources, roleLabel),
    quickMemory: buildDeterministicSummary(character, knowledge, sources, roleLabel),
    roleInStory: "",
    developmentArc: "",
    traits: [],
    motivations: [],
    distinctives: fallbackDistinctives(character).filter((value) => !isLowValueProfileText(value)),
    relationships: relationships.slice(0, 8).map((entry) => {
      const [name, ...rest] = entry.split(":");
      return {
        name: rest.length ? name.trim() : "Relationship",
        label: "",
        summary: rest.length ? rest.join(":").trim() : entry,
        beats: [],
      };
    }),
    timeline: timeline.filter((event) => event.event).slice(0, 10),
    evidence: evidenceFromKnowledge.length > 0 ? evidenceFromKnowledge : fallbackEvidence(relevantNotes, relevantMemory, trackingMode),
    openQuestions: [],
  };
}

function buildSparseSnapshot(character: CharacterRow): CharacterSnapshot {
  return {
    characterSheetVersion: CHARACTER_SHEET_VERSION,
    roleLabel: "Still gathering context",
    summary: `Scriba has noticed ${character.name}, but needs more story context before it can build a trustworthy profile.`,
    quickMemory: "",
    roleInStory: "",
    developmentArc: "",
    traits: [],
    motivations: [],
    distinctives: [],
    relationships: [],
    timeline: [],
    evidence: [],
    openQuestions: [],
  };
}

function createFallbackSnapshot({
  bookId,
  slug,
  userId,
  character,
  structured,
  sources,
  maxChapter,
}: {
  bookId: string;
  slug: string;
  userId: string;
  character: CharacterRow;
  structured: CharacterSnapshot;
  sources: number[];
  maxChapter: number;
}) {
  return {
    id: `fallback-${Date.now()}`,
    user_id: userId,
    book_id: bookId,
    character_slug: slug,
    question: `Build a character sheet for ${character.name}`,
    answer: structured.summary,
    structured,
    sources,
    max_chapter: maxChapter || null,
    created_at: new Date().toISOString(),
    unsaved: true,
  };
}

async function fetchLatestSnapshot(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  bookId: string,
  slug: string,
) {
  const { data, error } = await supabase
    .from("character_assistant_snapshots")
    .select("id,user_id,book_id,character_slug,question,answer,structured,sources,max_chapter,created_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("character_slug", slug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function GET(
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
    const snapshot = await fetchLatestSnapshot(supabase, user.id, bookId, slug);
    return Response.json({ snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch character snapshot";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ bookId: string; slug: string }> },
) {
  try {
    const { bookId, slug } = await context.params;
    if (!bookId || !slug) {
      return new Response(JSON.stringify({ error: "bookId and slug are required" }), { status: 400 });
    }

    const mock = process.env.MOCK_AI === "1" || process.env.NEXT_PUBLIC_MOCK_AI === "1";
    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id,title,tracking_mode")
      .eq("id", bookId)
      .eq("user_id", user.id)
      .single();
    if (bookError) throw bookError;

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("name,role,short_bio,full_bio,first_chapter,last_chapter,relationships,timeline,updated_at")
      .eq("book_id", bookId)
      .eq("slug", slug)
      .eq("user_id", user.id)
      .maybeSingle();
    if (characterError) throw characterError;
    const knowledge = await fetchCharacterKnowledge(supabase, user.id, bookId, slug).catch((error) => {
      console.error("Failed to read knowledge for character snapshot:", error);
      return null;
    });
    if (!character && !knowledge) {
      return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
    }
    const characterRow = {
      name: knowledge?.entity.name || character?.name || slug,
      role: character?.role || String(knowledge?.entity.profile?.role ?? "") || null,
      short_bio: character?.short_bio || String(knowledge?.entity.profile?.summary ?? "") || null,
      full_bio: character?.full_bio || null,
      first_chapter: knowledge?.entity.first_chapter ?? character?.first_chapter ?? null,
      last_chapter: knowledge?.entity.last_chapter ?? character?.last_chapter ?? null,
      relationships: character?.relationships ?? [],
      timeline: character?.timeline ?? [],
      updated_at: knowledge?.entity.updated_at ?? character?.updated_at ?? null,
    } as CharacterRow;
    const trackingMode = normalizeTrackingMode(book?.tracking_mode);

    const { data: memoryData } = await supabase
      .from("book_chapter_memory")
      .select("chapter_number,summary")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .order("chapter_number", { ascending: true });

    let memoryRows = (Array.isArray(memoryData) ? memoryData : []) as MemoryRow[];
    const { data: notesData } = await supabase
      .from("notes")
      .select("id,chapter_number,ai_summary,content,created_at")
      .eq("book_id", bookId)
      .eq("user_id", user.id)
      .order("chapter_number", { ascending: true });
    const allNotes = (Array.isArray(notesData) ? notesData : []) as NoteRow[];

    if (memoryRows.length === 0) {
      memoryRows = (notesData ?? []).map((note) => ({
        chapter_number: Number(note.chapter_number),
        summary: note.ai_summary || (note.content ? { summary: [note.content] } : {}),
      }));
    }

    const relevantMemory = extractCharacterMemory(memoryRows, characterRow.name);
    const knowledgeNoteIds = new Set((knowledge?.mentions ?? []).map((mention) => mention.note_id).filter(Boolean));
    const relevantNotes = uniqueNotes([
      ...allNotes.filter((note) => knowledgeNoteIds.has(note.id)),
      ...extractCharacterNotes(allNotes, characterRow.name),
    ]);
    const knowledgeSources = getKnowledgeSources(knowledge);
    const sources = Array.from(new Set([...knowledgeSources, ...mergeSources(relevantMemory, relevantNotes)])).sort((a, b) => a - b);
    const maxChapter = sources.reduce((max, chapter) => Math.max(max, chapter), 0);
    const groupedKnowledgeRelationships = buildGroupedRelationshipSummaries(knowledge, characterRow.name);
    const canonicalRelationships = groupedKnowledgeRelationships.length > 0
      ? groupedKnowledgeRelationships
      : uniqueStrings([
          ...getExtractedKnowledgeRelationships(knowledge),
          ...extractCharacterRelationshipsFromNotes(relevantNotes, characterRow.name),
          ...extractCharacterRelationshipsFromMemory(relevantMemory, characterRow.name),
          ...toStringList(characterRow.relationships),
        ]).filter(Boolean).slice(0, 8);
    const fallbackSummary =
      buildDeterministicSummary(characterRow, knowledge, sources) ||
      `${characterRow.name} appears in your notes, but Scriba needs more detail before it can summarize them confidently.`;
    const readiness = getCharacterReadiness({
      mentionCount: knowledge?.entity.mention_count,
      sources,
      relevantNotes,
      relevantMemory,
      profile: knowledge?.entity.profile,
      relationships: canonicalRelationships.length > 0 ? canonicalRelationships : characterRow.relationships,
      timeline: knowledge?.timeline.length ? knowledge.timeline : characterRow.timeline,
      role: characterRow.role,
      summary: knowledge?.entity.profile?.summary,
      shortBio: characterRow.short_bio,
      fullBio: characterRow.full_bio,
    });

    if (!readiness.ready) {
      const structured = buildSparseSnapshot(characterRow);
      return Response.json({
        snapshot: createFallbackSnapshot({
          bookId,
          slug,
          userId: user.id,
          character: characterRow,
          structured,
          sources,
          maxChapter,
        }),
        ready: false,
        generated: false,
        readiness,
      });
    }

    let structured: CharacterSnapshot;
    if (mock) {
      structured = buildDeterministicSnapshot({
        character: characterRow,
        knowledge,
        relevantNotes,
        relevantMemory,
        relationships: canonicalRelationships,
        sources,
        trackingMode,
      });
      structured.characterSheetVersion = CHARACTER_SHEET_VERSION;
    } else if (process.env.OPENAI_API_KEY) {
      try {
        const ai = getAiConfig("assistant");
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const deterministic = buildDeterministicSnapshot({
        character: characterRow,
        knowledge,
        relevantNotes,
        relevantMemory,
        relationships: canonicalRelationships,
        sources,
        trackingMode,
      });
      const knowledgeMentionBlock =
        knowledge?.mentions
          .map((mention) => {
            const label = formatProgressLabel(trackingMode, Number(mention.chapter_number));
            return `- ${label}: ${textPreview(mention.source_text, 260)}`;
          })
          .join("\n") || "- None";
      const knowledgeRelationshipBlock =
        canonicalRelationships.map((entry) => `- ${entry}`).join("\n") || "- None captured";
      const knowledgeTimelineBlock =
        knowledge?.timeline
          .map((event) => `- ${formatProgressLabel(trackingMode, Number(event.chapter_number))}: ${textPreview(event.event_text, 220)}`)
          .join("\n") || "- None";
      const prompt = `
Book: ${book?.title || "Current book"}
Character: ${characterRow.name}
Existing role: ${characterRow.role || "Unknown"}
Existing bio: ${characterRow.short_bio || characterRow.full_bio || "None"}
Existing relationships: ${JSON.stringify(characterRow.relationships ?? [])}
Existing timeline: ${JSON.stringify(characterRow.timeline ?? [])}
Canonical appearance chapters: ${sources.join(", ") || "None"}
Canonical relationship entries involving ${characterRow.name}:
${knowledgeRelationshipBlock}

Canonical timeline rows involving ${characterRow.name}:
${knowledgeTimelineBlock}

Canonical mention evidence involving ${characterRow.name}:
${knowledgeMentionBlock}

Structured chapter memory involving ${characterRow.name}:
${relevantMemory.map((row) => formatMemoryBlock(row, trackingMode)).join("\n\n") || "No memory available."}

Raw notes that mention ${characterRow.name}:
${relevantNotes.map((note) => formatNoteBlock(note, trackingMode)).join("\n\n") || "No direct note matches found."}

Create a structured character sheet from everything above.
Rules:
- This is not a database report. Write polished reader-facing interface copy for someone trying to remember and understand the character.
- Translate the reader's notes into casual, familiar, complete prose. Do not dump raw snippets or truncated text.
- Use only the evidence above. Do not use outside book knowledge.
- The summary must explain who the character is and what role they play so far in 1-2 concrete, stable sentences.
- The summary should prioritize enduring role, motivation, identity, and recurring relationship patterns over one-off scene details.
- quickMemory should be the "what should I remember about this character?" paragraph.
- roleInStory should explain the character's narrative function up to the current chapter in generalized, reader-facing prose.
- Put specific scene beats, locations, reveals, and actions in timeline, evidence, or relationship sections unless they define the character's core role.
- developmentArc should explain how the character has changed or what pattern has become clearer over time.
- Traits are stable personality/behavior qualities inferred from evidence; include a short evidence phrase.
- Motivations are goals, desires, fears, or reasons behind actions; include a short evidence phrase.
- Distinctives are memorable facts, role details, repeated patterns, symbols, skills, or narrative function.
- Relationships must use the AI-extracted relationship entries when available, name the other character, and explain the dynamic in coherent prose.
- Relationships must be consolidated: return at most one item per related character or group.
- Timeline should cover every source chapter where there is enough detail, with complete rewritten chapter beats.
- Evidence should be short paraphrased support bullets with the chapter label.
- openQuestions should list only useful uncertainty from the notes; use an empty array if nothing important is missing.
- Never write generic meta-analysis such as "highlighted in Chapter 2", "driving the narrative forward", or "the provided notes say".
- Never describe app state, such as "tracked in your notes", unless the sentence also teaches the reader something about the character.
- If a section has no support, return an empty array or an empty string.
Return JSON only:
{
  "characterSheetVersion": ${CHARACTER_SHEET_VERSION},
  "roleLabel": string,
  "summary": string,
  "quickMemory": string,
  "roleInStory": string,
  "developmentArc": string,
  "traits": [{"label": string, "evidence": string}],
  "motivations": [{"label": string, "evidence": string}],
  "distinctives": string[],
  "relationships": [{"name": string, "label": string, "summary": string, "beats": string[]}],
  "timeline": [{"chapterNumber": number, "event": string}],
  "evidence": string[],
  "openQuestions": string[]
}
`.trim();

      const response = await client.responses.create({
        model: process.env.AI_MODEL_ASSISTANT || ai.model,
        reasoning: { effort: "low" },
        input: [
          {
            role: "system",
            content:
              "You create spoiler-safe character memory pages for Scriba. Use only provided reader memory. Write warm, casual, concrete interface copy that helps a reader remember the character without spoilers beyond the provided chapters.",
          },
          { role: "user", content: prompt },
        ],
        max_output_tokens: process.env.AI_MAX_TOKENS_ASSISTANT
          ? Math.max(parseInt(process.env.AI_MAX_TOKENS_ASSISTANT, 10), 2200)
          : Math.max(ai.maxOutputTokens, 2200),
      });
      structured = normalizeSnapshot(tryParseJson(response.output_text ?? ""), fallbackSummary);
      structured.characterSheetVersion = CHARACTER_SHEET_VERSION;
      if (!structured.roleLabel || structured.roleLabel === "Role not clear yet") {
        structured.roleLabel = deterministic.roleLabel;
      }
      if (isLowValueProfileText(structured.summary)) {
        structured.summary = deterministic.summary;
      }
      if (structured.distinctives.length === 0) {
        structured.distinctives = deterministic.distinctives;
      }
      if (structured.evidence.length === 0) {
        structured.evidence = deterministic.evidence;
      }
      if (structured.timeline.length === 0) {
        structured.timeline = deterministic.timeline;
      }
      if (structured.relationships.length === 0) {
        structured.relationships = deterministic.relationships;
      }
      } catch (generationError) {
        console.error("Failed to generate character sheet snapshot:", generationError);
        structured = buildDeterministicSnapshot({
          character: characterRow,
          knowledge,
          relevantNotes,
          relevantMemory,
          relationships: canonicalRelationships,
          sources,
          trackingMode,
        });
      }
    } else {
      structured = buildDeterministicSnapshot({
        character: characterRow,
        knowledge,
        relevantNotes,
        relevantMemory,
        relationships: canonicalRelationships,
        sources,
        trackingMode,
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("character_assistant_snapshots")
      .insert({
        user_id: user.id,
        book_id: bookId,
        character_slug: slug,
        question: `Build a character sheet for ${characterRow.name}`,
        answer: structured.summary,
        structured,
        sources,
        max_chapter: maxChapter || null,
      })
      .select("id,user_id,book_id,character_slug,question,answer,structured,sources,max_chapter,created_at")
      .single();
    if (insertError) {
      console.error("Failed to store character sheet snapshot:", insertError);
      return Response.json({
        snapshot: createFallbackSnapshot({
          bookId,
          slug,
          userId: user.id,
          character: characterRow,
          structured,
          sources,
          maxChapter,
        }),
      });
    }

    return Response.json({ snapshot: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to generate character snapshot";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
