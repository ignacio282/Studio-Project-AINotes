type ReadinessInput = {
  mentionCount?: unknown;
  sourceCount?: unknown;
  sources?: unknown;
  relevantNotes?: unknown;
  relevantMemory?: unknown;
  profile?: Record<string, unknown> | null;
  relationships?: unknown;
  timeline?: unknown;
  role?: unknown;
  summary?: unknown;
  shortBio?: unknown;
  fullBio?: unknown;
  distinctives?: unknown;
  traits?: unknown;
  motivations?: unknown;
  evidence?: unknown;
};

type BookContextInput = {
  noteCount?: unknown;
  summary?: unknown;
  characters?: unknown;
  setting?: unknown;
  relationships?: unknown;
  reflections?: unknown;
};

export type ReadinessResult = {
  ready: boolean;
  score: number;
  mentionCount: number;
  sourceCount: number;
  detailCount: number;
  reason: "ready" | "needs_more_mentions" | "needs_more_detail";
};

const LOW_VALUE_TEXT = [
  "mentioned in your notes",
  "role still forming",
  "role not clear yet",
  "not enough detail yet",
  "highlighted in chapter",
  "driving the narrative forward",
  "central figure in chapter",
  "provided notes",
  "primary lens for the narrative",
  "character dynamics are described",
  "appears in your notes",
  "tracked in your notes",
];

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function isUsefulText(value: unknown, minLength = 24): boolean {
  const text = normalizeText(value);
  if (text.length < minLength) return false;
  const lower = text.toLowerCase();
  return !LOW_VALUE_TEXT.some((needle) => lower.includes(needle));
}

function toList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return normalizeText(value) ? [value] : [];
}

function countUsefulList(value: unknown, minLength = 12): number {
  return toList(value).filter((item) => {
    if (typeof item === "string") return isUsefulText(item, minLength);
    if (!item || typeof item !== "object") return false;
    const rec = item as Record<string, unknown>;
    return [
      rec.summary,
      rec.description,
      rec.evidence,
      rec.event,
      rec.event_text,
      rec.text,
      rec.label,
      rec.name,
    ].some((field) => isUsefulText(field, minLength));
  }).length;
}

function countUniqueSources(input: ReadinessInput): number {
  const values = new Set<number>();
  toList(input.sources).forEach((source) => {
    const parsed = toNumber(source);
    if (parsed > 0) values.add(parsed);
  });
  toList(input.relevantNotes).forEach((note) => {
    const parsed = toNumber((note as Record<string, unknown> | null)?.chapter_number);
    if (parsed > 0) values.add(parsed);
  });
  toList(input.relevantMemory).forEach((row) => {
    const parsed = toNumber((row as Record<string, unknown> | null)?.chapter_number);
    if (parsed > 0) values.add(parsed);
  });
  return Math.max(values.size, toNumber(input.sourceCount));
}

function countNoteDetails(notes: unknown): number {
  return toList(notes).filter((note) => {
    if (!note || typeof note !== "object") return false;
    const rec = note as Record<string, unknown>;
    const content = normalizeText(rec.content);
    const summaryText = normalizeText(JSON.stringify(rec.ai_summary ?? ""));
    return content.length >= 80 || summaryText.length >= 140;
  }).length;
}

function countMemoryDetails(rows: unknown): number {
  return toList(rows).filter((row) => {
    if (!row || typeof row !== "object") return false;
    const rec = row as Record<string, unknown>;
    return normalizeText(JSON.stringify(rec.summary ?? "")).length >= 140;
  }).length;
}

export function getCharacterReadiness(input: ReadinessInput = {}): ReadinessResult {
  const profile = input.profile && typeof input.profile === "object" ? input.profile : {};
  const sourceCount = countUniqueSources(input);
  const relevantNoteCount = toList(input.relevantNotes).length;
  const mentionCount = Math.max(toNumber(input.mentionCount), relevantNoteCount, sourceCount);
  const relationshipCount = countUsefulList(input.relationships) + countUsefulList(profile.relationships);
  const timelineCount = countUsefulList(input.timeline) + countUsefulList(profile.timeline);
  const profileDetailCount = [
    input.role,
    input.summary,
    input.shortBio,
    input.fullBio,
    profile.role,
    profile.summary,
  ].filter((value) => isUsefulText(value)).length;
  const structuredDetailCount =
    countUsefulList(input.distinctives) +
    countUsefulList(input.traits) +
    countUsefulList(input.motivations) +
    countUsefulList(input.evidence) +
    countUsefulList(profile.actions) +
    countUsefulList(profile.descriptions) +
    countUsefulList(profile.affiliations) +
    countUsefulList(profile.evidence) +
    countUsefulList(profile.traits) +
    countUsefulList(profile.motivations);
  const detailCount =
    relationshipCount +
    timelineCount +
    profileDetailCount +
    structuredDetailCount +
    countNoteDetails(input.relevantNotes) +
    countMemoryDetails(input.relevantMemory);
  const strongSingleNote = mentionCount >= 1 && detailCount >= 4;
  const ready =
    strongSingleNote ||
    (sourceCount >= 2 && detailCount >= 2) ||
    (mentionCount >= 2 && detailCount >= 3);

  return {
    ready,
    score: mentionCount + sourceCount + detailCount,
    mentionCount,
    sourceCount,
    detailCount,
    reason: ready ? "ready" : mentionCount < 2 && sourceCount < 2 ? "needs_more_mentions" : "needs_more_detail",
  };
}

export function getBookContextReadiness(input: BookContextInput = {}) {
  const noteCount = toNumber(input.noteCount);
  const detailCount =
    countUsefulList(input.summary, 24) +
    countUsefulList(input.characters, 2) +
    countUsefulList(input.setting, 3) +
    countUsefulList(input.relationships, 12) +
    countUsefulList(input.reflections, 18);
  return {
    ready: noteCount >= 2 || (noteCount >= 1 && detailCount >= 5),
    noteCount,
    detailCount,
  };
}

