import OpenAI from "openai";

export const runtime = "nodejs";

type StructuredNote = {
  summary: string[];
  characters: string[];
  setting: string[];
  relationships: string[];
  reflections: string[];
  extraSections?: { title: string; items: string[] }[];
};

type ChangeHighlights = Record<string, string[]>;

type ReflectionResponse = {
  response?: string;
  section?: string;
  value?: string;
};

type RequestBody = {
  before?: StructuredNote;
  after?: StructuredNote;
  highlights?: ChangeHighlights;
  responses?: ReflectionResponse[];
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function sanitizeList(values: unknown): string[] {
  if (typeof values === "string") {
    const trimmed = values.trim();
    return trimmed ? [trimmed] : [];
  }
  return Array.isArray(values)
    ? values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    : [];
}

function sanitizeExtraSections(values: unknown): { title: string; items: string[] }[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const candidate = entry as { title?: unknown; items?: unknown };
      const titleRaw = candidate.title;
      if (typeof titleRaw !== "string") {
        return null;
      }
      const title = titleRaw.trim();
      if (!title) {
        return null;
      }
      const items = sanitizeList(candidate.items);
      return { title, items };
    })
    .filter((section): section is { title: string; items: string[] } => Boolean(section));
}

function sanitizeNote(note: unknown): StructuredNote {
  if (!note || typeof note !== "object") {
    return {
      summary: [],
      characters: [],
      setting: [],
      relationships: [],
      reflections: [],
      extraSections: [],
    };
  }
  const candidate = note as Partial<StructuredNote>;
  return {
    summary: sanitizeList(candidate.summary),
    characters: sanitizeList(candidate.characters),
    setting: sanitizeList(candidate.setting),
    relationships: sanitizeList(candidate.relationships),
    reflections: sanitizeList(candidate.reflections),
    extraSections: sanitizeExtraSections(
      (candidate as { extraSections?: unknown }).extraSections ?? (candidate as { extras?: unknown }).extras,
    ),
  };
}

function normalizeHighlights(raw: unknown): ChangeHighlights {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const result: ChangeHighlights = {};
  Object.entries(raw as Record<string, unknown>).forEach(([section, value]) => {
    const items = sanitizeList(value);
    if (items.length > 0) {
      result[section.trim()] = items;
    }
  });
  return result;
}

function normalizeResponses(raw: unknown): ReflectionResponse[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const normalized = raw
    .map((entry): ReflectionResponse | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const candidate = entry as ReflectionResponse;
      const response = typeof candidate.response === "string" ? candidate.response.trim() : "";
      const value = typeof candidate.value === "string" ? candidate.value.trim() : "";
      const section =
        typeof candidate.section === "string" && candidate.section.trim()
          ? candidate.section.trim()
          : value
            ? "User Reflections"
            : "";
      if (!response && !value) {
        return null;
      }
      return { response, value, section };
    })
    .filter((entry): entry is ReflectionResponse => entry !== null);

  return normalized;
}

function summarizeStructuredNote(note: StructuredNote): string {
  const sections: Array<[string, string[]]> = [
    ["Summary", note.summary],
    ["Characters", note.characters],
    ["Setting", note.setting],
    ["Relationships", note.relationships],
    ["User Reflections", note.reflections],
  ];

  if (Array.isArray(note.extraSections)) {
    note.extraSections.forEach((section) => {
      if (!section || !section.title) {
        return;
      }
      sections.push([section.title, section.items ?? []]);
    });
  }

  return sections
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => `${title}:\n- ${items.join("\n- ")}`)
    .join("\n\n")
    .trim();
}

function formatHighlights(highlights: ChangeHighlights): string {
  const entries = Object.entries(highlights);
  if (entries.length === 0) {
    return "None";
  }
  return entries
    .map(([section, items]) => `${section}:\n- ${items.join("\n- ")}`)
    .join("\n\n")
    .trim();
}

function formatResponses(responses: ReflectionResponse[]): string {
  if (responses.length === 0) {
    return "None";
  }
  return responses
    .map((entry, index) => {
      const bits = [];
      if (entry.section) {
        bits.push(`[${entry.section}]`);
      }
      if (entry.value) {
        bits.push(entry.value);
      }
      if (entry.response && entry.response !== entry.value) {
        bits.push(`Reader said: ${entry.response}`);
      }
      return `${index + 1}. ${bits.join(" — ")}`.trim();
    })
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const mock = url.searchParams.get("mock") === "1" || process.env.MOCK_AI === "1" || process.env.NEXT_PUBLIC_MOCK_AI === "1";

    const body = (await request.json()) as RequestBody;
    const before = sanitizeNote(body.before);
    const after = sanitizeNote(body.after);
    const highlights = normalizeHighlights(body.highlights);
    const responses = normalizeResponses(body.responses);

    if (mock) {
      const keys = Object.keys(highlights);
      const summaryText = keys.length > 0
        ? `You added or refined items in ${keys.join(", ")}.`
        : "No notable updates were detected.";
      return Response.json({ summary: summaryText });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY in environment" }), { status: 500 });
    }

    const beforeDigest = summarizeStructuredNote(before) || "None";
    const afterDigest = summarizeStructuredNote(after) || "None";
    const highlightDigest = formatHighlights(highlights);
    const responsesDigest = formatResponses(responses);

    const systemPrompt = `
You are helping a reader understand what changed in their structured book notes after a reflection session.
- Produce a concise 1-2 sentence summary describing the most meaningful updates.
- Never refer to the act of note-taking or the presence of a note within summaries or reflections; instead, present all extracted information as direct observations or story narrative.
- Focus on the new insights or evolutions, not on everything that stayed the same.
- Refer to sections (Summary, Characters, Relationships, Setting, Themes, etc.) when it helps orient the reader.
- Use your own words—do not quote the reader directly.
- If there were no notable updates, state that plainly instead of inventing changes.
Respond with valid JSON of the form {"summary":"..."}.
`.trim();

    const userPrompt = `
Structured note before reflection:
${beforeDigest}

Structured note after reflection:
${afterDigest}

Highlighted additions or revisions:
${highlightDigest}

Reader responses that informed the update:
${responsesDigest}
`.trim();

    const response = await client.responses.create({
      model: process.env.AI_MODEL_CHANGE || "gpt-5-nano",
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: (process.env.AI_MAX_TOKENS_CHANGE ? parseInt(process.env.AI_MAX_TOKENS_CHANGE, 10) : 5000),
    });

    const output = response.output_text ?? "";
    const summaryText = (() => {
      const trimmed = output.trim();
      if (!trimmed) return "";
      try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed.summary === "string" ? parsed.summary.trim() : "";
      } catch {
        const match = trimmed.match(/```json\s*([\s\S]*?)```/i) ?? trimmed.match(/```\s*([\s\S]*?)```/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            return typeof parsed.summary === "string" ? parsed.summary.trim() : "";
          } catch {
            return match[1].trim();
          }
        }
        return trimmed;
      }
    })();

    return Response.json({ summary: summaryText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to summarize reflection changes.";
    console.error("/api/reflection-change error:", error);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
