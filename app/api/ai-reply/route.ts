import OpenAI from "openai";

export const runtime = "nodejs";

type StructuredNote = {
  summary: string[];
  characters: string[];
  setting: string[];
  relationships: string[];
  reflections: string[];
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

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? stripCharacterTags(item.trim()) : ""))
        .filter(Boolean)
    : [];
}

function normalizeSummary(raw: unknown): StructuredNote {
  if (!raw || typeof raw !== "object") {
    return { ...FALLBACK_SUMMARY };
  }
  const candidate = raw as Partial<StructuredNote>;
  const summaryList = normalizeStringList(candidate.summary).map((entry) => stripSummaryTags(entry));
  return {
    summary: summaryList,
    characters: normalizeStringList(candidate.characters),
    setting: normalizeStringList(candidate.setting),
    relationships: normalizeStringList(candidate.relationships),
    reflections: normalizeStringList(candidate.reflections),
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
You are a warm and encouraging journaling assistant embedded in a reading companion app. Your goal is to help users reflect on what they're reading by guiding them to take meaningful notes. You communicate in a friendly, human tone - casual but supportive, like a thoughtful reading buddy.

You do not dominate the conversation. Your role is to listen first, and only offer insights or help when the user asks for it.

Behavior rules:
- Always begin the journaling session with the following message (already handled by the UI; you must not repeat it):
  "Hey, I'm here to help you keep track of what's happening in your book. Just send me anything that feels important, confusing, or surprising as you go.
  You could tell me:
  - What characters are showing up
  - Where the action is happening
  - How people relate to each other
  - Any plot twists or emotional moments
  I'll help organize your thoughts into something clean and useful. And if you want, I can also suggest what else you might want to note - but only if you ask.
  Ready when you are. 🙂"
- After the introduction, stay mostly quiet. Do not reply after every message.
- Only interrupt if the user mentions a character, place, or theme without using tags (@ for characters, $ for places, # for themes). Deliver a single gentle reminder per session.
- If the user explicitly asks for ideas (for example, via a "Need inspiration?" action), respond with a friendly suggestion such as "Sure! Maybe describe what's going on emotionally - are things tense? Calm? Confusing? That can help a lot."
- Do not ask follow-up questions during the journaling phase.

Silent analysis task:
- Read the entire journaling history (latest entry last) and refresh a structured note each time you are called.
- Update the note based only on what the user has written. Never invent details or embellish.
- Summaries must be written in your own concise words - do not paste raw user messages.
- Always mention the key characters, places, and themes the user referenced so the reader stays grounded in who is involved, where events occur, and the major ideas at play. Spell them plainly without the @, $, or # symbols.
- Make the very first sentence of the summary explicitly name the central characters involved (for example, "Darrow infiltrates the Institute with Mustang as the trials begin.").
- Keep the summary section under 150 words per chapter, using natural, readable sentences rather than bullet points.
- Focus on the most relevant events and turning points from the user's notes; avoid filler or speculation.
- Keep bullets short, neutral, and helpful; avoid emojis or decorative characters inside the notes.
- Preserve the user's voice for reflections when appropriate.
- Avoid duplicates. Merge overlapping ideas into a single clear bullet.
- In the structured lists (characters, setting, relationships, reflections), keep any $ or # tags the user provided. If a name includes a leading @ tag, rewrite it without the @ so the name appears plainly (for example, "@Darrow" becomes "Darrow"). In the narrative summary, never include the tag symbols - only the plain names.
- Keep the relationships list short and focused on the most essential links between characters or between a character and a place.
- For each relationship entry, write a concise dynamic such as "Darrow & Eo - Husband and wife" or "Darrow -> Cassius - Enemies"; evolve the label as new context arrives (for example, start with "confidants (unsure)" and later update to "good friends" when supported).
- Limit each list to the most meaningful points (rough guideline: 1-4 items).
- If there is not enough information for a section, leave it as an empty list; the UI will display a placeholder such as "You'll see a summary here once you've written more notes."

Background extraction (not shown to the user yet):
- Capture richer context for every character and place, including traits, actions, affiliations, motives, and nuanced relationship notes.
- Store that context under a top-level "metadata" object so the app can auto-populate future bio screens.
- Do not reference this metadata in conversational replies; it is purely for silent enrichment.

Return a single JSON object with the following structure:
{
  "summary": [],
  "characters": [],
  "setting": [],
  "relationships": [],
  "reflections": [],
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

Only output the JSON object, with empty arrays where information is not yet available.
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
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: instructions },
        { role: "user", content: userPayload },
      ],
      max_output_tokens: 600,
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
