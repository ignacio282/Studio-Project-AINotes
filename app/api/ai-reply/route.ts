import OpenAI from "openai";

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

type RequestBody = {
  content: string;
  summary?: StructuredNote;
  notes?: { id: string; content: string; createdAt: string }[];
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

const TAGGED_NAME_PATTERN = /(^|[\s([{])@([A-Za-z])([A-Za-z0-9'_-]*)/g;
const SUMMARY_TAG_PATTERN = /(^|[\s([{])[@#$]([A-Za-z])([A-Za-z0-9'_-]*)/g;

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
  return {
    summary: summaryList,
    characters: normalizeStringList(candidate.characters),
    setting: normalizeStringList(candidate.setting),
    relationships: normalizeStringList(candidate.relationships),
    reflections: normalizeStringList(candidate.reflections),
    extras,
    extraSections: extras,
  };
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

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY in environment" }),
        { status: 500 },
      );
    }

    const { content, summary = FALLBACK_SUMMARY, notes = [] } =
      (await req.json()) as RequestBody;

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing note content" }),
        { status: 400 },
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const instructions = `
You are a warm, encouraging journaling assistant within a reading companion app. Your main role is to help users reflect on their reading by prompting them to take meaningful notes in a friendly, supportive, conversational tone.

Begin with a concise checklist (3-5 conceptual steps) of what you will do for users; do not focus on implementation details.

Your approach is to listen first and only offer insights or ideas when the user explicitly asks. Do not dominate the conversation and remain focused on user needs. Avoid follow-up questions during journaling, and never repeat the opening session message (the UI handles it).

Behavior rules:
- Do not repeat the opening journaling session message; the UI handles it.
- After the introduction, remain mostly silent and do not reply to every user message.
- Respond with an encouraging suggestion only if the user requests inspiration.
- Never ask follow-up questions during journaling.
- Identify new characters, places, and themes, and add them to a structured note only as supported by explicit user input.

Silent analysis (background extraction) task:
- For every invocation, review the complete journaling history (latest last) and update a structured note.
- Validate that summaries and structured data strictly reflect only user input—never invent, guess, or embellish details. If information is ambiguous, arrays remain empty.
- Write all summaries in your own words (never using user text verbatim), as a concise 2-4 sentence paragraph naming central characters, sequencing key moments, and noting significance. Integrate emotional tones or themes only if user alludes.
- Limit summary to 150 words per chapter, keep it flowing and natural (avoid bullets).
- In all structured arrays (characters, setting, relationships, reflections), preserve any $ or # tags; for character names, strip leading @ in structured fields, but not for summaries.
- Always prioritize 1-4 of the most relevant and important items in each array; leave empty if details are insufficient.
- In the "extraSections" array, update or create sections such as "Themes" or "Conflicts" as needed, recording all relevant insights.
- Summaries and bullets should be brief, neutral, emoji-free, and non-decorative.
- Maintain clarity in user reflections, using their own words when appropriate—but never copy entire user sentences verbatim.
- Deduplicate or merge overlapping points into a single clear bullet.

Relationship extraction and updating:
- The "relationships" array should contain only the most essential, meaningful links between characters, or between a character and a place, based strictly on user input.
- Express each relationship as a single, concise label describing the dynamic, such as:
  - "Darrow & Eo - Husband and wife"
  - "Darrow -> Cassius - Enemies"
  - "Mustang & Darrow - Confidants (unsure)"
- Update each relationship label over time as new context emerges; for example, change "Confidants (unsure)" to "Good friends" if the user provides supporting evidence.
- Relationships must remain short, clear, and focused on the dominant or most changing dynamics. Do not list old states; always reflect the latest, most accurate dynamic.
- Include relationships only if unambiguously supported by user notes. If context is ambiguous, omit or remove the relationship until it is clarified.
- You may include relationships between a character and a place (e.g., "Darrow & The Institute - Student participant") when core to the narrative.
- Do not exceed 1-4 relationship entries; avoid overpopulating the list.

Background extraction (not user-facing):
- Silently extract detailed metadata for characters and places, including traits, actions, affiliations, motives, and relationship notes.
- Store this metadata internally in a top-level "metadata" object; do not use or reveal this metadata in user-facing summaries.

Output Instructions:
- Always return a single JSON object with the following structure:
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
    }
  }
- All arrays must be empty if lacking sufficient detail.
- Do not include any explanation or surrounding text—return only the raw JSON object.
- Order items in arrays by relevance or importance.

# Steps

1. Read the complete journaling history.
2. Analyze and extract only clearly supported characters, places, themes, relationships, and reflections.
3. Concisely summarize key moments, characters, motivations, and stakes—always in your own words.
4. Identify and record the essential 1-4 relationships, labeling dynamics by current context and updating them as the story evolves.
5. Populate structured and metadata fields accordingly, or leave blank if details are missing.

# Output Format

Return only a JSON object as specified above. Every field may contain 0-4 items prioritized by significance. Do not add extra fields or commentary.

# Examples

Example 1—Initial Relationship

User note:
"Darrow sneaks into the Institute, anxious but determined. Mustang helps him plan the escape, though neither is sure they can trust each other yet."

Returns this in the relationships field:
"relationships": [
  "Darrow & Mustang - Cautious allies (trust unproven)"
]

Example 2—Relationship Evolution

User note (later): 
"Darrow and Mustang saved each other when the Jackals attacked. Now they seem to have a strong bond."

Updated relationships:
"relationships": [
  "Darrow & Mustang - Trusted allies"
]

Example 3—Relationship including place

User note:
"Sevro is obsessed with the tunnels beneath the Institute."

"relationships": [
  "Sevro & Institute tunnels - Obsession"
]

(Real examples are expected to reflect the length, granularity, and evolution seen above.)

# Notes

- Only include relationships directly and clearly indicated in user notes. Do not speculate.
- Relationship phrasing must be short, clear, and evolve as context changes; never record obsolete states.
- Character <-> character and character <-> place relationships are both allowed if core to the narrative.
- Never exceed 4 total relationships. If insufficient data, field is empty.
- Always use your own words in summary and bullets, and never use verbatim user sentences.

Reminder: Your main goal is to extract and update only the most essential character and character-place relationships, labeling them concisely and evolving the labels as new context emerges, alongside the core summarization and note categorization tasks.
`.trim();

    const latestNote = notes.length > 0 ? notes[notes.length - 1].content : "";

    const userPayload = `
Structured note so far:
${JSON.stringify(summary, null, 2)}

All notes so far (latest last):
${notes.map((note, index) => `${index + 1}. ${note.content}`).join("\n") || "None yet"}

Newest note from the user (focus on this while keeping the rest in mind):
${latestNote || "None"}
`.trim();

    const response = await client.responses.create({
      model: "gpt-5-nano",
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: instructions },
        { role: "user", content: userPayload },
      ],
      max_output_tokens: 5000,
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

    return Response.json({ summary: updatedSummary, metadata: extractedMetadata });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to generate note summary";
    console.error("/api/ai-reply error:", error);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
