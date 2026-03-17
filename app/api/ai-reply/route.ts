import OpenAI from "openai";

import { getAiConfig } from "@/lib/ai/client";

export const runtime = "nodejs";

type StructuredNote = {
  summary: string[];
  characters: string[];
  setting: string[];
  relationships: string[];
  reflections: string[];
  extras?: { title: string; items: string[] }[];
  extraSections?: { title: string; items: string[] }[];
};

type CharacterBio = {
  name: string;
  traits: string[];
  actions: string[];
  affiliations: string[];
  motives: string[];
  relationships: string[];
};

type PlaceBio = {
  name: string;
  descriptions: string[];
  notableEvents: string[];
  affiliations: string[];
};

type ExtractedMetadata = {
  characters: CharacterBio[];
  places: PlaceBio[];
};

type AssistantMessage = {
  content: string;
};

type InsightEntry = {
  section?: string;
  value?: string;
  preview?: string;
};

type RequestBody = {
  content: string;
  summary?: StructuredNote;
  notes?: { id: string; content: string; createdAt: string }[];
  insights?: InsightEntry[];
};

const FALLBACK_SUMMARY: StructuredNote = {
  summary: [],
  characters: [],
  setting: [],
  relationships: [],
  reflections: [],
  extras: [],
  extraSections: [],
};

const FALLBACK_METADATA: ExtractedMetadata = {
  characters: [],
  places: [],
};

const JOURNAL_CONFIG = getAiConfig("journal");

const TAGGED_NAME_PATTERN = /(^|[\s([{])@([A-Za-z])([A-Za-z0-9'_-]*)/g;
const SUMMARY_TAG_PATTERN = /(^|[\s([{])[@#$]([A-Za-z])([A-Za-z0-9'_-]*)/g;
const MAX_SUMMARY_ITEMS = 5;
const MAX_CHARACTER_ITEMS = 5;
const MAX_SETTING_ITEMS = 3;
const MAX_RELATIONSHIP_ITEMS = 3;
const MAX_REFLECTION_ITEMS = 3;
const MAX_EXTRA_SECTIONS = 1;
const MAX_EXTRA_ITEMS = 3;

const GENERIC_CHARACTER_EXACT = new Set([
  "audience",
  "corporation",
  "crawler",
  "crawlers",
  "crowd",
  "crowds",
  "fans",
  "group",
  "groups",
  "humans",
  "npc",
  "npcs",
  "participants",
  "people",
  "player",
  "players",
  "supporters",
  "survivors",
  "victims",
]);

const GENERIC_CHARACTER_FRAGMENTS = [
  " (group",
  " audience",
  "collective identity",
  "corporation",
  "crowd",
  "fans",
  "group of",
  "participants",
  "player base",
  "supporters",
  "victims of",
];

const GENERIC_SETTING_EXACT = new Set([
  "audience",
  "darkness",
  "gate",
  "gates",
  "inside",
  "inventory",
  "map",
  "outside",
  "rest zone",
  "snow storm",
  "snowstorm",
  "stats",
  "storm",
  "tooltips",
  "weather",
  "window",
  "windows",
  "tree",
  "trees",
]);

const GENERIC_SETTING_FRAGMENTS = [
  "audience",
  "broadcast",
  "destination",
  "game-like world",
  "hud",
  "in-game audience",
  "inventory",
  "map",
  "outdoor encounter",
  "scene texture",
  "sought after combat",
  "stats",
  "tooltips",
  "where creatures are fought",
];

const LOW_VALUE_EXTRA_TITLES = new Set([
  "context",
  "details",
  "future",
  "misc",
  "notes on future",
  "other",
  "predictions",
]);

const REFLECTION_MARKERS = [
  /\bi think\b/i,
  /\bi wonder\b/i,
  /\bi feel\b/i,
  /\bi felt\b/i,
  /\bi noticed\b/i,
  /\bi liked\b/i,
  /\bi loved\b/i,
  /\bi hated\b/i,
  /\bi suspect\b/i,
  /\bi predict\b/i,
  /\bi was surprised\b/i,
  /\bi'm surprised\b/i,
  /\bi am surprised\b/i,
  /\bmy takeaway\b/i,
  /\bfor me\b/i,
];

function stripCharacterTags(value: string): string {
  return value.replace(TAGGED_NAME_PATTERN, (_, prefix: string, firstLetter: string, rest: string) => {
    return `${prefix}${firstLetter.toUpperCase()}${rest}`;
  });
}

function stripSummaryTags(value: string): string {
  return value.replace(SUMMARY_TAG_PATTERN, (_, prefix: string, firstLetter: string, rest: string) => {
    return `${prefix}${firstLetter.toUpperCase()}${rest}`;
  });
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTrailingQualifier(value: string): string {
  return normalizeWhitespace(value.replace(/\s*\(([^()]*)\)\s*$/u, ""));
}

function toComparableKey(value: string): string {
  return stripTrailingQualifier(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeAndLimit(
  values: string[],
  maxItems: number,
  keyFn: (value: string) => string = toComparableKey,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = normalizeWhitespace(value);
    if (!normalized) {
      return;
    }
    const key = keyFn(normalized);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    if (result.length < maxItems) {
      result.push(normalized);
    }
  });
  return result;
}

function splitSummaryCandidate(value: string): string[] {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return [];
  }
  const sentenceMatches = normalized.match(/[^.!?]+[.!?]?/g) ?? [];
  const sentences = sentenceMatches
    .map((entry) => normalizeWhitespace(entry))
    .filter(Boolean);
  if (sentences.length >= 2) {
    return sentences;
  }
  return [normalized];
}

function cleanSummaryItems(values: string[]): string[] {
  const expanded = values.flatMap((value) => {
    const parts = splitSummaryCandidate(value);
    if (parts.length === 1) {
      const only = parts[0] ?? "";
      if (only.length > 220) {
        return only
          .split(/\s*;\s*/g)
          .map((entry) => normalizeWhitespace(entry))
          .filter(Boolean);
      }
    }
    return parts;
  });
  return dedupeAndLimit(expanded, MAX_SUMMARY_ITEMS);
}

function looksLikeCharacter(value: string): boolean {
  const normalized = stripTrailingQualifier(value);
  const comparable = toComparableKey(normalized);
  if (!comparable || GENERIC_CHARACTER_EXACT.has(comparable)) {
    return false;
  }
  if (GENERIC_CHARACTER_FRAGMENTS.some((fragment) => ` ${comparable} `.includes(fragment))) {
    return false;
  }
  if (normalized.includes("→") || normalized.includes("->") || normalized.includes(":")) {
    return false;
  }
  return true;
}

function cleanCharacterItems(values: string[]): string[] {
  return dedupeAndLimit(
    values
      .map((value) => stripTrailingQualifier(value))
      .map(normalizeWhitespace)
      .filter((value) => looksLikeCharacter(value)),
    MAX_CHARACTER_ITEMS,
  );
}

function looksLikeSetting(value: string): boolean {
  const normalized = stripTrailingQualifier(value);
  const comparable = toComparableKey(normalized);
  if (!comparable || GENERIC_SETTING_EXACT.has(comparable)) {
    return false;
  }
  if (GENERIC_SETTING_FRAGMENTS.some((fragment) => comparable.includes(fragment))) {
    return false;
  }
  if (/\bwhere\b|\bdestination\b|\bafter combat\b/i.test(normalized)) {
    return false;
  }
  return true;
}

function cleanSettingItems(values: string[]): string[] {
  return dedupeAndLimit(
    values
      .map((value) => stripTrailingQualifier(value))
      .map(normalizeWhitespace)
      .filter((value) => looksLikeSetting(value)),
    MAX_SETTING_ITEMS,
  );
}

function containsWholeComparablePhrase(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

function cleanRelationshipItems(values: string[], characters: string[]): string[] {
  const characterKeys = characters
    .map((name) => ({ name, key: toComparableKey(name) }))
    .filter((entry) => entry.key);

  return dedupeAndLimit(
    values.filter((value) => {
      const comparable = toComparableKey(value);
      if (!comparable) {
        return false;
      }
      const matchedCharacters = characterKeys.filter((entry) =>
        containsWholeComparablePhrase(comparable, entry.key),
      );
      return new Set(matchedCharacters.map((entry) => entry.key)).size >= 2;
    }),
    MAX_RELATIONSHIP_ITEMS,
  );
}

function looksLikeReflection(value: string): boolean {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return false;
  }
  return REFLECTION_MARKERS.some((pattern) => pattern.test(normalized));
}

function cleanReflectionItems(values: string[]): string[] {
  return dedupeAndLimit(
    values
      .map(normalizeWhitespace)
      .filter((value) => looksLikeReflection(value)),
    MAX_REFLECTION_ITEMS,
  );
}

function cleanExtraSections(
  values: { title: string; items: string[] }[],
  usedKeys: Set<string>,
): { title: string; items: string[] }[] {
  const sections = values
    .map((section) => {
      const title = normalizeWhitespace(section.title);
      const titleKey = toComparableKey(title);
      if (!title || !titleKey || LOW_VALUE_EXTRA_TITLES.has(titleKey)) {
        return null;
      }
      const items = dedupeAndLimit(
        section.items.filter((item) => {
          const key = toComparableKey(item);
          return Boolean(key) && !usedKeys.has(key);
        }),
        MAX_EXTRA_ITEMS,
      );
      if (items.length < 2) {
        return null;
      }
      return { title, items };
    })
    .filter((section): section is { title: string; items: string[] } => Boolean(section));

  return sections.slice(0, MAX_EXTRA_SECTIONS);
}

function cleanStructuredNote(note: StructuredNote): StructuredNote {
  const summary = cleanSummaryItems(note.summary);
  const characters = cleanCharacterItems(note.characters);
  const setting = cleanSettingItems(note.setting);
  const relationships = cleanRelationshipItems(note.relationships, characters);
  const reflections = cleanReflectionItems(note.reflections);
  const usedKeys = new Set<string>();
  [...summary, ...characters, ...setting, ...relationships, ...reflections].forEach((value) => {
    const key = toComparableKey(value);
    if (key) {
      usedKeys.add(key);
    }
  });
  const extras = cleanExtraSections(note.extras ?? [], usedKeys);

  return {
    summary,
    characters,
    setting,
    relationships,
    reflections,
    extras,
    extraSections: extras,
  };
}

function coerceNoteValue(value: unknown, seen: WeakSet<object> = new WeakSet()): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => coerceNoteValue(item, seen)).filter(Boolean);
    return parts.join("; ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (seen.has(record)) {
      return "";
    }
    seen.add(record);
    const nameKeys = ["name", "title", "label", "heading"];
    const detailKeys = [
      "summary",
      "description",
      "detail",
      "note",
      "notes",
      "insight",
      "text",
      "value",
      "role",
      "trait",
      "info",
    ];

    const selectValue = (keys: string[]): string => {
      for (const key of keys) {
        if (!(key in record)) {
          continue;
        }
        const extracted = coerceNoteValue(record[key], seen);
        if (extracted) {
          return extracted;
        }
      }
      return "";
    };

    const name = selectValue(nameKeys);
    const detail = selectValue(detailKeys);
    if (name && detail) {
      return `${name} - ${detail}`;
    }
    if (name) {
      return name;
    }
    if (detail) {
      return detail;
    }
    const fallback = Object.values(record)
      .map((item) => coerceNoteValue(item, seen))
      .find((entry) => entry);
    seen.delete(record);
    return fallback ?? "";
  }
  return "";
}

function normalizeStringList(value: unknown, options: { stripSummaryTags?: boolean } = {}): string[] {
  const { stripSummaryTags: shouldStripSummary = false } = options;
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : typeof value === "string"
        ? [value]
        : [];
  return source
    .map((item) => coerceNoteValue(item, new WeakSet()))
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .map((entry) => {
      if (!entry) {
        return "";
      }
      const withoutCharacterTags = stripCharacterTags(entry);
      const cleaned = shouldStripSummary ? stripSummaryTags(withoutCharacterTags) : withoutCharacterTags;
      return cleaned.trim();
    })
    .filter(Boolean);
}

function normalizeExtraSections(value: unknown): { title: string; items: string[] }[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as { title?: unknown; name?: unknown; items?: unknown; bullets?: unknown; points?: unknown };
      const titleString = coerceNoteValue(record.title ?? record.name ?? "", new WeakSet());
      const title = stripCharacterTags(titleString.trim());
      if (!title) {
        return null;
      }
      const itemsSource = record.items ?? record.bullets ?? record.points ?? [];
      const items = normalizeStringList(itemsSource);
      return { title, items };
    })
    .filter((section): section is { title: string; items: string[] } => Boolean(section));
}

function normalizeSummary(raw: unknown): StructuredNote {
  if (!raw || typeof raw !== "object") {
    return { ...FALLBACK_SUMMARY };
  }
  const candidate = raw as Partial<StructuredNote>;
  const summaryList = normalizeStringList(candidate.summary, { stripSummaryTags: true });
  const extrasRaw =
    (candidate as { extras?: unknown }).extras ??
    (candidate as { extraSections?: unknown }).extraSections ??
    [];
  const extras = normalizeExtraSections(extrasRaw);
  return cleanStructuredNote({
    summary: summaryList,
    characters: normalizeStringList(candidate.characters),
    setting: normalizeStringList(candidate.setting),
    relationships: normalizeStringList(candidate.relationships),
    reflections: normalizeStringList(candidate.reflections),
    extras,
    extraSections: extras,
  });
}

function normalizeCharacterBio(raw: unknown): CharacterBio | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Partial<CharacterBio>;
  const nameRaw = (candidate as { name?: unknown }).name;
  if (typeof nameRaw !== "string") {
    return null;
  }
  const name = stripCharacterTags(nameRaw.trim());
  if (!name) {
    return null;
  }
  return {
    name,
    traits: normalizeStringList(candidate.traits),
    actions: normalizeStringList(candidate.actions),
    affiliations: normalizeStringList(candidate.affiliations),
    motives: normalizeStringList(candidate.motives),
    relationships: normalizeStringList(candidate.relationships),
  };
}

function normalizePlaceBio(raw: unknown): PlaceBio | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Partial<PlaceBio>;
  const nameRaw = (candidate as { name?: unknown }).name;
  if (typeof nameRaw !== "string") {
    return null;
  }
  const name = stripCharacterTags(nameRaw.trim());
  if (!name) {
    return null;
  }
  return {
    name,
    descriptions: normalizeStringList(candidate.descriptions),
    notableEvents: normalizeStringList(candidate.notableEvents),
    affiliations: normalizeStringList(candidate.affiliations),
  };
}

function normalizeMetadata(raw: unknown): ExtractedMetadata {
  if (!raw || typeof raw !== "object") {
    return { ...FALLBACK_METADATA };
  }
  const candidate = raw as Partial<ExtractedMetadata>;
  const characters = Array.isArray(candidate.characters)
    ? candidate.characters
        .map(normalizeCharacterBio)
        .filter((item): item is CharacterBio => item !== null)
    : [];
  const places = Array.isArray(candidate.places)
    ? candidate.places
        .map(normalizePlaceBio)
        .filter((item): item is PlaceBio => item !== null)
    : [];
  return { characters, places };
}

function normalizeAssistantMessage(raw: unknown): AssistantMessage | null {
  if (!raw) {
    return null;
  }
  if (typeof raw === "string") {
    const content = raw.replace(/\s+/g, " ").trim();
    return content ? { content } : null;
  }
  if (typeof raw !== "object") {
    return null;
  }
  const candidate = raw as { content?: unknown };
  const content =
    typeof candidate.content === "string" ? candidate.content.replace(/\s+/g, " ").trim() : "";
  return content ? { content } : null;
}

function normalizeInsights(value: unknown): { section: string; value: string; preview: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const candidate = entry as InsightEntry;
      const valueString = typeof candidate.value === "string" ? candidate.value.replace(/\s+/g, " ").trim() : "";
      if (!valueString) {
        return null;
      }
      const section =
        typeof candidate.section === "string" && candidate.section.trim()
          ? candidate.section.replace(/\s+/g, " ").trim()
          : "User Reflections";
      const preview =
        typeof candidate.preview === "string" ? candidate.preview.replace(/\s+/g, " ").trim() : "";
      return { section, value: valueString, preview };
    })
    .filter((entry): entry is { section: string; value: string; preview: string } => Boolean(entry));
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const mock = url.searchParams.get("mock") === "1" || process.env.MOCK_AI === "1" || process.env.NEXT_PUBLIC_MOCK_AI === "1";

    const body = (await req.json()) as RequestBody;
    const content = body?.content ?? "";
    const summary = body?.summary ?? FALLBACK_SUMMARY;
    const notes = Array.isArray(body?.notes) ? body.notes : [];
    const insights = normalizeInsights(body?.insights);

    if (mock) {
      const merged: StructuredNote = normalizeSummary({
        ...summary,
        summary: Array.isArray(summary?.summary) && summary.summary.length > 0
          ? summary.summary
          : [
              "A concise recap of the chapter’s key beats and what mattered.",
            ],
        characters: Array.from(new Set([...(summary?.characters ?? []), "Darrow", "Mustang"])),
        setting: Array.from(new Set([...(summary?.setting ?? []), "Mars"])),
        relationships: Array.from(new Set([...(summary?.relationships ?? []), "Darrow & Mustang - Trusted allies"])),
        reflections: summary?.reflections ?? [],
        extras: summary?.extras ?? [],
      });
      const metadata: ExtractedMetadata = { characters: [], places: [] };
      return Response.json({ summary: merged, metadata, assistantMessage: null });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY in environment" }),
        { status: 500 },
      );
    }

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing note content" }),
        { status: 400 },
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const instructions = `
Developer: You are the journaling intelligence inside Scriba, a reading companion app. Your job is to silently turn one journaling session into a clean, trustworthy structured note while staying mostly invisible to the user.

Core behavior:
- Treat the full journaling session as the canonical source. Read every note in the session, in order, on every invocation.
- The newest note may add, refine, or correct earlier notes, but it must never replace the rest of the session in your understanding.
- Stay mostly silent. Do not reply to every user message.
- Only produce "assistantMessage" when one short clarification question would materially improve the quality of the saved note for future recall. Otherwise return "assistantMessage": null.
- Never repeat the opening journaling message from the UI.
- Never mention the act of note-taking in summaries or bullets.
- Optimize for memory value, not extraction coverage. It is better to omit a weak item than to fill a section with low-value or generic content.

What counts as a character:
- A character is any story-relevant being with agency or clear importance.
- Humans, animals, creatures, and other non-human beings can qualify if they act, speak, think, recur, or clearly matter to the story.
- Exclude objects, species labels, background animals, crowds, and abstract entities.
- If a named animal or creature appears repeatedly or is clearly important, include it.
- Do not turn roles or collectives into characters. "crawlers", "players", "audience", and similar group labels are not characters by themselves.

What counts as a setting:
- A setting must be a meaningful place where the story happens or an important scene anchor.
- Include concrete locations such as cities, rooms, ships, buildings, forests, planets, schools, arenas, or other place-like locations when they matter to the scene.
- Exclude incidental physical details or props such as doors, gates, trees, snow storms, weather, furniture, darkness, and generic obstacles unless the user clearly frames them as a specific important location.
- If unsure whether something is a real setting or just scene texture, exclude it.
- Do not turn world mechanics or descriptive framing into settings. "game-like world", "broadcast audience", "outdoor encounter area", and similar abstractions are not settings.

What counts as a relationship:
- Only include meaningful, narratively useful dynamics between characters.
- Good relationship signals include family ties, friendship, rivalry, romance, alliance, mentorship, fear, loyalty, dependence, resentment, or repeated conflict.
- Exclude one-off introductions, greetings, commands, logistics, proximity, job functions, or temporary scene mechanics.
- Example to exclude: a captain introducing each person to someone else does not create a meaningful relationship entry by itself.
- Include a relationship only when the session makes the dynamic explicit or strongly supported.
- If a fact is better expressed in the summary than as a relationship, keep it in the summary and leave "relationships" empty.

Summary rules:
- Summarize the whole session, not just the latest note.
- Match the depth and certainty of the user's notes. If the notes are shallow, factual, or tentative, keep the summary shallow, factual, or tentative.
- Do not add extra drama, symbolism, motives, stakes, or interpretation unless the user clearly supports them.
- Use your own words, keep the summary concise, and keep it under 150 words total.
- Return 3-5 short bullet-style summary items, not one dense paragraph.
- Preserve weird book-specific facts when the user gives them. Do not smooth them into vague genre framing.
- Do not add emotional color such as "hopeful", "unsettled", or similar mood language unless the user explicitly states it.
- If later notes correct earlier notes, reflect the latest supported understanding.

Extraction rules:
- Use only information supported by the user's notes and provided reflection insights.
- If something is ambiguous, leave it out or ask for clarification only if knowing it would clearly improve the note.
- Prioritize the 1-5 most important items in each array.
- Deduplicate aggressively and merge overlapping points.
- Keep bullets brief, neutral, and useful for future recall.
- "reflections" must only contain explicit user opinions, reactions, questions, or predictions. Do not invent takeaways on the user's behalf.
- "extraSections" should usually be empty. Use them only when a small section would add clear recall value without repeating the summary.
- "metadata" should usually stay empty.

Clarification rules:
- Ask at most one brief clarification question.
- Ask only when ambiguity blocks reliable extraction of a key character, relationship, setting, or story term.
- Good reasons to ask:
  - a repeated but undefined story-specific term such as "crawler"
  - a repeatedly mentioned named being whose role or importance is unclear
  - a contradiction in the session that changes the summary
  - a vague reference that prevents understanding who or what is being discussed
- Do not ask for minor decorative details.
- Do not ask a question if the note is already useful without it.
- Keep the clarification short, natural, and directly tied to the user's wording.

Output instructions:
- Return one JSON object only.
- Use this exact shape:
  {
    "summary": [],
    "characters": [],
    "setting": [],
    "relationships": [],
    "reflections": [],
    "extraSections": [
      {
        "title": "",
        "items": []
      }
    ],
    "metadata": {
      "characters": [
        {
          "name": "",
          "traits": [],
          "actions": [],
          "affiliations": [],
          "motives": [],
          "relationships": []
        }
      ],
      "places": [
        {
          "name": "",
          "descriptions": [],
          "notableEvents": [],
          "affiliations": []
        }
      ]
    },
    "assistantMessage": {
      "content": ""
    }
  }
- If no clarification is needed, set "assistantMessage" to null.
- All other arrays must be empty when the session lacks enough support.
- Order arrays by importance.

Examples:
- If the user writes "Carl is a crawler" and the term is important but undefined, a good assistantMessage is:
  {"content":"You mentioned that Carl is a crawler. What is a crawler in this story?"}
- If the user keeps mentioning Donut the cat and the notes suggest Donut matters, a good assistantMessage is:
  {"content":"You mention Donut a lot. Is Donut an important character in this book?"}
- If the user mentions a door, gate, tree, or snow storm as scene detail, those should usually stay out of "setting".
- If the user says one character introduced others to each other, that alone should not create relationship entries.
- Bad character: "Crawlers (group)"
- Bad setting: "Game-like world with legendary loot boxes"
- Bad relationship: "Mordecai → corporation: former player who became an NPC/employee"
- Bad reflection: "The dungeon's historical cap suggests extreme risk" unless the user explicitly said that as their own takeaway.
`.trim();

    const latestNote = notes.length > 0 ? notes[notes.length - 1].content : "";
    const insightsBlock =
      insights.length > 0
        ? insights
            .map((entry, index) => {
              const preview = entry.preview ? ` (${entry.preview})` : "";
              return `${index + 1}. [${entry.section}] ${entry.value}${preview}`;
            })
            .join("\n")
        : "None";

    const userPayload = `
Structured note so far:
${JSON.stringify(summary, null, 2)}

All notes so far (latest last):
${notes.map((note, index) => `${index + 1}. ${note.content}`).join("\n") || "None yet"}

Reflection insights to merge:
${insightsBlock}

Newest note from the user:
${latestNote || "None"}

Important reminder:
- The saved summary must represent the whole session above, not only the newest note.
- Use the newest note mainly to update or correct the session-wide understanding.
`.trim();

    const response = await client.responses.create({
      model: process.env.AI_MODEL_JOURNAL || JOURNAL_CONFIG.model,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: instructions },
        { role: "user", content: userPayload },
      ],
      max_output_tokens: (
        process.env.AI_MAX_TOKENS_JOURNAL
          ? parseInt(process.env.AI_MAX_TOKENS_JOURNAL, 10)
          : JOURNAL_CONFIG.maxOutputTokens
      ),
    });

    const rawOutput = response.output_text ?? "";
    const jsonCandidate = (() => {
      const direct = rawOutput.trim();
      if (!direct) return "{}";
      try {
        JSON.parse(direct);
        return direct;
      } catch {
        const fenced = direct.match(/```json\s*([\s\S]*?)```/i) ?? direct.match(/```\s*([\s\S]*?)```/);
        if (fenced) {
          return fenced[1];
        }
        const start = direct.indexOf("{");
        const end = direct.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          return direct.slice(start, end + 1);
        }
        return "{}";
      }
    })();

    const parsed = (() => {
      try {
        return JSON.parse(jsonCandidate);
      } catch {
        return {};
      }
    })();

    const updatedSummary = normalizeSummary(parsed);
    const extractedMetadata = normalizeMetadata(
      parsed && typeof parsed === "object" ? (parsed as { metadata?: unknown }).metadata : undefined,
    );
    const assistantMessage = normalizeAssistantMessage(
      parsed && typeof parsed === "object" ? (parsed as { assistantMessage?: unknown }).assistantMessage : undefined,
    );

    return Response.json({ summary: updatedSummary, metadata: extractedMetadata, assistantMessage });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to generate note summary";
    console.error("/api/ai-reply error:", error);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
