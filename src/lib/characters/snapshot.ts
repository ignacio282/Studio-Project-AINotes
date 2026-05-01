import OpenAI from "openai";
import { getAiConfig } from "@/lib/ai/client";
import { formatProgressLabel, normalizeTrackingMode } from "@/lib/books/progress";
import { getCharacterReadiness } from "@/lib/characters/readiness";
import { fetchCharacterKnowledge } from "@/lib/knowledge/read";

export const CHARACTER_SHEET_VERSION = 6;

type SupabaseClientLike = {
  from: (table: string) => unknown;
};

type QueryResultLike = {
  data: unknown;
  error: Error | null;
};

type SupabaseTableLike = {
  select: (columns: string) => QueryBuilderLike;
  insert: (values: unknown) => QueryBuilderLike;
};

type QueryBuilderLike = PromiseLike<QueryResultLike> & {
  select: (columns: string) => QueryBuilderLike;
  eq: (column: string, value: unknown) => QueryBuilderLike;
  order: (column: string, options?: unknown) => QueryBuilderLike;
  limit: (count: number) => QueryBuilderLike;
  maybeSingle: () => Promise<QueryResultLike>;
  single: () => Promise<QueryResultLike>;
};

function table(supabase: SupabaseClientLike, name: string): SupabaseTableLike {
  return supabase.from(name) as SupabaseTableLike;
}

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
      if (typeof item === "string") {
        const text = item.trim();
        if (!text) return null;
        return { chapterNumber: Number.NaN, event: text };
      }
      if (!item || typeof item !== "object") return null;
      const rec = item as {
        chapterNumber?: unknown;
        chapter?: unknown;
        chapter_number?: unknown;
        sourceChapter?: unknown;
        source_chapter?: unknown;
        event?: unknown;
        summary?: unknown;
        detail?: unknown;
        text?: unknown;
        snippet?: unknown;
        description?: unknown;
      };
      const chapterNumber = Number(
        rec.chapterNumber ?? rec.chapter ?? rec.chapter_number ?? rec.sourceChapter ?? rec.source_chapter,
      );
      const eventValue = [rec.event, rec.summary, rec.detail, rec.text, rec.snippet, rec.description].find(
        (value) => typeof value === "string" && value.trim(),
      );
      const event = typeof eventValue === "string" ? eventValue.trim() : "";
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

function normalizeRoleLabel(value: unknown, characterName: string, fallback = "Role not clear yet"): string {
  const label = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  const safeFallback = typeof fallback === "string" ? fallback.trim() : "Role not clear yet";
  if (!label) return safeFallback;

  const normalizedLabel = label.toLowerCase();
  const normalizedName = characterName.replace(/\s+/g, " ").trim().toLowerCase();
  if (
    normalizedLabel === normalizedName ||
    normalizedLabel === "character" ||
    normalizedLabel === "connected character" ||
    normalizedLabel === "story role"
  ) {
    return safeFallback;
  }

  const withoutParenthetical = label.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const firstPhrase = withoutParenthetical.split(/[.;:!?]/)[0]?.trim() || withoutParenthetical;
  const phraseLower = firstPhrase.toLowerCase();
  const words = firstPhrase.split(/\s+/).filter(Boolean);
  const sentenceLike =
    words.length > 5 ||
    firstPhrase.length > 48 ||
    /\b(is|are|was|were|becomes|become|helps|must|has|have|does|will|with)\b/i.test(firstPhrase);
  const latestActivityLike =
    phraseLower.includes("monster-hunting") ||
    phraseLower.includes("quest") ||
    phraseLower.includes("in training");

  if (words.length < 2 || sentenceLike || latestActivityLike) {
    return safeFallback;
  }

  return firstPhrase;
}

function removeRecentActivityFromSummary(rawSummary: string, fallbackSummary: string) {
  const summary = rawSummary.trim();
  if (!summary) return fallbackSummary;
  const sentences = summary.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [summary];
  const activityVerb = /\b(accepts?|accepted|takes?\s+on|took\s+on|meets?|met|encounters?|encountered|explores?|explored|enters?|entered|arrives?|arrived|reports?|reported|teleports?|teleported|fights?|fought|hunts?|hunted|chooses?|chose|picks?|picked|receives?|received)\b/i;
  const recentContext = /\b(quest|mission|chapter|scene|event|level|city|town|area|warning|monster|enemy|new figure|new figures|new character|latest|recent)\b/i;
  const cleaned = sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => !(activityVerb.test(sentence) && recentContext.test(sentence)))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length >= 80) return cleaned;
  return fallbackSummary || cleaned || summary;
}

function compactQuickMemory(value: string, fallback = "") {
  const text = value.replace(/\s+/g, " ").trim();
  const source = text || fallback.replace(/\s+/g, " ").trim();
  if (!source) return "";
  const explicitItems = source
    .split(/\s*(?:\n+|•|-{1,2}\s+)\s*/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const chunks = explicitItems.length > 1 ? explicitItems : source.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [source];
  const seen = new Set<string>();
  return chunks
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter((chunk) => {
      const key = chunk.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3)
    .map((chunk) => (chunk.length > 150 ? `${chunk.slice(0, 147).trim()}...` : chunk))
    .join(" ");
}

function normalizeSnapshot(
  raw: unknown,
  fallbackSummary: string,
  fallbackRoleLabel: string,
  characterName: string,
): CharacterSnapshot {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawSummary =
    typeof rec.summary === "string" && rec.summary.trim() && !isLowValueProfileText(rec.summary)
      ? rec.summary.trim()
      : fallbackSummary;
  const summary = removeRecentActivityFromSummary(rawSummary, fallbackSummary);
  return {
    characterSheetVersion: CHARACTER_SHEET_VERSION,
    roleLabel: normalizeRoleLabel(rec.roleLabel, characterName, fallbackRoleLabel),
    summary,
    quickMemory: compactQuickMemory(typeof rec.quickMemory === "string" ? rec.quickMemory : "", summary),
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

function inferRoleLabel(
  character: CharacterRow,
  knowledge: CharacterKnowledge,
  relationshipText: string[],
  totalNoteCount = 0,
): string {
  const explicit = String(character.role ?? "").trim();
  const normalizedExplicit = normalizeRoleLabel(explicit, character.name, "");
  if (normalizedExplicit) return normalizedExplicit;

  const mentionCount = Number(knowledge?.entity.mention_count ?? 0);
  const mainCharacterThreshold = Math.max(3, Math.ceil(Number(totalNoteCount || 0) * 0.6));
  if (mentionCount >= mainCharacterThreshold) return "Main character";

  const haystack = [
    character.short_bio,
    character.full_bio,
    ...(knowledge?.mentions ?? []).map((mention) => mention.source_text),
    ...relationshipText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("rebel") || haystack.includes("tactician")) return "Rebel tactician";
  if (haystack.includes("enemy") || haystack.includes("antagonist")) return "Rival catalyst";
  if (haystack.includes("ally") || haystack.includes("alliance")) return "Political ally";
  if (haystack.includes("leader") || haystack.includes("commands")) return "Strategic leader";
  if (haystack.includes("main character") || haystack.includes("central character")) return "Main character";
  if (haystack.includes("guide") || haystack.includes("teacher") || haystack.includes("mentor")) return "Trusted guide";
  if (mentionCount >= 3) return "Central character";
  return "Role not clear yet";
}

function buildDeterministicSummary(character: CharacterRow, knowledge: CharacterKnowledge, sources: number[], roleLabel = ""): string {
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
  const stableBio = [character.short_bio, character.full_bio]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()) && !isLowValueProfileText(value))
    .map((value) => textPreview(value, 180))[0];
  const role = roleLabel === "Main character" || roleLabel === "Central character" || roleLabel === "Primary protagonist"
    ? `${character.name} is the main character.`
    : roleLabel && roleLabel !== "Role not clear yet"
      ? `${character.name} is a ${roleLabel.toLowerCase()}.`
      : `${character.name} is a character you have tracked ${range}.`;
  const relationText = related.length > 0 ? ` ${character.name} works with or is connected to ${related.join(", ")}.` : "";
  const detailText = stableBio ? ` ${stableBio}` : "";
  return `${role}${detailText}${relationText}`.trim();
}

function buildDeterministicQuickMemory(character: CharacterRow, sources: number[], relevantNotes: NoteRow[], trackingMode: string): string {
  const noteSummaries = relevantNotes
    .flatMap((note) => normalizeSummary(note.ai_summary).summary)
    .map((entry) => textPreview(entry, 180))
    .filter(Boolean)
    .slice(0, 3);
  if (noteSummaries.length > 0) return noteSummaries.join(" ");
  const sourceText = sources.length > 0
    ? `across ${sources.map((source) => formatProgressLabel(trackingMode, source)).join(", ")}`
    : "in your notes";
  return `Remember what ${character.name} has been doing ${sourceText}.`;
}

function buildDeterministicSnapshot({
  character,
  knowledge,
  relevantNotes,
  relevantMemory,
  relationships,
  sources,
  trackingMode,
  totalNoteCount = 0,
}: {
  character: CharacterRow;
  knowledge: CharacterKnowledge;
  relevantNotes: NoteRow[];
  relevantMemory: MemoryRow[];
  relationships: string[];
  sources: number[];
  trackingMode: string;
  totalNoteCount?: number;
}): CharacterSnapshot {
  const roleLabel = inferRoleLabel(character, knowledge, relationships, totalNoteCount);
  const summary = buildDeterministicSummary(character, knowledge, sources, roleLabel);
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
    summary,
    quickMemory: buildDeterministicQuickMemory(character, sources, relevantNotes, trackingMode),
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

export async function fetchLatestCharacterSnapshot(
  supabase: SupabaseClientLike,
  userId: string,
  bookId: string,
  slug: string,
) {
  const { data, error } = await table(supabase, "character_assistant_snapshots")
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

export function isCharacterSnapshotFresh(snapshot: unknown, characterUpdatedAt?: unknown, _characterName = ""): boolean {
  void _characterName;
  const rec = snapshot && typeof snapshot === "object" ? (snapshot as Record<string, unknown>) : {};
  const structured = rec.structured && typeof rec.structured === "object" ? (rec.structured as Record<string, unknown>) : {};
  const version = Number(structured.characterSheetVersion) || 0;
  if (version < CHARACTER_SHEET_VERSION || !rec.created_at) return false;
  const snapshotTime = new Date(String(rec.created_at)).getTime();
  const characterTime = new Date(String(characterUpdatedAt || "")).getTime();
  if (!Number.isFinite(snapshotTime)) return false;
  if (!Number.isFinite(characterTime)) return true;
  return snapshotTime >= characterTime;
}

export async function prepareCharacterSnapshot({
  supabase,
  userId,
  bookId,
  slug,
  mock = process.env.MOCK_AI === "1" || process.env.NEXT_PUBLIC_MOCK_AI === "1",
  force = false,
}: {
  supabase: SupabaseClientLike;
  userId: string;
  bookId: string;
  slug: string;
  mock?: boolean;
  force?: boolean;
}) {
    if (!bookId || !slug) {
      throw new Error("bookId and slug are required");
    }

    const { data: bookData, error: bookError } = await table(supabase, "books")
      .select("id,title,tracking_mode")
      .eq("id", bookId)
      .eq("user_id", userId)
      .maybeSingle();
    if (bookError) throw bookError;
    if (!bookData) throw new Error("Book not found");
    const book = bookData as { title?: string | null; tracking_mode?: string | null };

    const { data: characterData, error: characterError } = await table(supabase, "characters")
      .select("name,role,short_bio,full_bio,first_chapter,last_chapter,relationships,timeline,updated_at")
      .eq("book_id", bookId)
      .eq("slug", slug)
      .eq("user_id", userId)
      .maybeSingle();
    if (characterError) throw characterError;
    const character =
      characterData && typeof characterData === "object"
        ? (characterData as Partial<CharacterRow>)
        : null;
    const knowledge = await fetchCharacterKnowledge(supabase, userId, bookId, slug).catch((error) => {
      console.error("Failed to read knowledge for character snapshot:", error);
      return null;
    });
    if (!character && !knowledge) {
      throw new Error("Character not found");
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
    const existingSnapshot = await fetchLatestCharacterSnapshot(supabase, userId, bookId, slug);
    if (!force && existingSnapshot && isCharacterSnapshotFresh(existingSnapshot, characterRow.updated_at, characterRow.name)) {
      return { snapshot: existingSnapshot, ready: true, generated: false, skipped: "fresh" };
    }
    const trackingMode = normalizeTrackingMode(book?.tracking_mode);

    const { data: memoryData } = await table(supabase, "book_chapter_memory")
      .select("chapter_number,summary")
      .eq("book_id", bookId)
      .eq("user_id", userId)
      .order("chapter_number", { ascending: true });

    let memoryRows = (Array.isArray(memoryData) ? memoryData : []) as MemoryRow[];
    const { data: notesData } = await table(supabase, "notes")
      .select("id,chapter_number,ai_summary,content,created_at")
      .eq("book_id", bookId)
      .eq("user_id", userId)
      .order("chapter_number", { ascending: true });
    const allNotes = (Array.isArray(notesData) ? notesData : []) as NoteRow[];

    if (memoryRows.length === 0) {
      memoryRows = allNotes.map((note) => ({
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
      return {
        snapshot: createFallbackSnapshot({
          bookId,
          slug,
          userId,
          character: characterRow,
          structured,
          sources,
          maxChapter,
        }),
        ready: false,
        generated: false,
        readiness,
      };
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
        totalNoteCount: allNotes.length,
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
        totalNoteCount: allNotes.length,
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
- Write useful reference notes, not polished prose. The goal is clarity.
- Use ordinary words a reader would use when explaining the character to a friend.
- Prefer concrete facts from the notes. Do not invent archetypes, titles, or elegant labels.
- Do not use literary-analysis language anywhere.
- Avoid phrases like "functions as", "serves as", "anchors", "sets the tone", "shapes their path", "questing partner", "novice adventurer", "steadfast ally", "larger threat", "progression", or "narrative function".
- Do not dump raw snippets or truncated text.
- Use only the evidence above. Do not use outside book knowledge.
- Every section should be practical and useful, not beautiful.
- summary = a character description. It should explain who they are, what they want or are trying to do, who they work with, what motivates them, and any stable behavior pattern supported by the notes.
- summary must stay about identity, goals, relationships, motives, and repeated behavior. Do not use it to recap recent actions.
- summary must not mention one-off locations, quest givers, quest names, chapter events, or action chains such as "explores...", "fights...", "meets...", or "accepts a quest..." unless the notes repeatedly show that fact defines the character.
- Before returning JSON, re-read the summary. If a sentence mostly says what happened recently, move that sentence to quickMemory or timeline.
- quickMemory = what the character has been doing across the notes.
- quickMemory must be brief: 2-3 short points or sentences, maximum 55 words total.
- quickMemory is not a full recap. Choose only the few facts the reader most needs before opening the timeline.
- Put recent actions, new locations, new characters they met, and latest quests in quickMemory, timeline, relationships, or evidence.
- roleInStory = a short practical explanation of why this character matters right now. Do not write literary analysis.
- developmentArc = what has changed about the character, only if the notes clearly show change.
- traits = simple behavior patterns with evidence. Do not make personality claims unless the notes support them.
- motivations = goals, fears, needs, or reasons behind actions. If the motive is unclear, leave it empty.
- relationships = practical descriptions of who they work with, follow, oppose, warn, help, or depend on.
- relationship items should feel alive: include a short label, a useful summary, and 1-3 beats with concrete examples from notes when available.
- do not drop relationship tags or examples just because the top summary is stable; put that detail in relationships.beats.
- timeline = chapter-specific events.
- timeline items must use this exact shape: {"chapterNumber": number, "event": string}. Do not use title-only timeline items.
- evidence = short factual support bullets.
- Recent interactions, quest givers, locations, and one-off scenes should go in quickMemory, relationships, timeline, or evidence. They should not redefine summary or roleLabel unless repeated notes make them central.
- The summary must be 2-3 practical sentences. It must not be a recap of only the latest chapter.
- roleLabel must be a short label of 2-5 words, not a sentence.
- roleLabel must never be only the character name.
- If the notes mostly follow this character, prefer a stable label such as "Main character", "Central character", or "Primary protagonist".
- Do not create roleLabel from a single recent event or side-character interaction.
- Avoid overly specific activity labels such as "Monster-hunting companion" when the character is clearly the main focus.
- Other good roleLabel examples: "Rebel tactician", "Political ally", "Rival catalyst".
- Put longer explanations in summary or roleInStory, not roleLabel.
- Distinctives are memorable facts, role details, repeated patterns, symbols, or skills.
- Relationships must use the AI-extracted relationship entries when available, name the other character, and explain the connection in ordinary words.
- Relationships must be consolidated: return at most one item per related character or group.
- Timeline should cover every source chapter where there is enough detail.
- Evidence should be short paraphrased support bullets with the chapter label.
- openQuestions should list only useful uncertainty from the notes; use an empty array if nothing important is missing.
- If a section has no support, return an empty array or an empty string.
Example style for a main character:
{
  "roleLabel": "Main character",
  "summary": "Carl is the main character. He is trying to survive the dungeon, understand its rules, and make choices that keep him and Donut alive. He works closely with Donut and gets guidance from Mordecai, but he often pushes forward even when warned to be careful.",
  "quickMemory": "Carl and Donut reach the third level, choose class and race options, and start learning Over City. They ignore Mordecai's warning to gain experience at night. They meet Signet and accept her haunted-circus quest.",
  "relationships": [{"name": "Donut", "label": "Main companion", "summary": "Carl and Donut explore together, make decisions together, and get pulled into the same quests.", "beats": ["They choose class and race options during the tutorial.", "They ignore Mordecai's warning and leave town at night."]}],
  "timeline": [{"chapterNumber": 6, "event": "Carl and Donut ignore Mordecai's warning, leave town at night to gain experience, meet Signet, and accept her quest."}]
}
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
              "You create spoiler-safe character reference notes for Scriba. Use only provided reader memory. Write ordinary, practical notes that help a reader remember who a character is, what they want, who they work with, and what they have done. Do not write polished prose or literary analysis.",
          },
          { role: "user", content: prompt },
        ],
        max_output_tokens: process.env.AI_MAX_TOKENS_ASSISTANT
          ? Math.max(parseInt(process.env.AI_MAX_TOKENS_ASSISTANT, 10), 2200)
          : Math.max(ai.maxOutputTokens, 2200),
      });
      structured = normalizeSnapshot(
        tryParseJson(response.output_text ?? ""),
        fallbackSummary,
        deterministic.roleLabel,
        characterRow.name,
      );
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
          totalNoteCount: allNotes.length,
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
        totalNoteCount: allNotes.length,
      });
    }

    const { data: inserted, error: insertError } = await table(supabase, "character_assistant_snapshots")
      .insert({
        user_id: userId,
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
      return {
        snapshot: createFallbackSnapshot({
          bookId,
          slug,
          userId,
          character: characterRow,
          structured,
          sources,
          maxChapter,
        }),
        generated: false,
      };
    }

    return { snapshot: inserted, ready: true, generated: true, readiness };
  }
