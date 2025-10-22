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

type ReflectionTopic = {
  id?: string;
  section?: string;
  label?: string;
  detail?: string;
  source?: string;
};

type RequestBody = {
  summary?: StructuredNote;
  topic?: ReflectionTopic;
  questionIndex?: number;
  userResponses?: string[];
  askedQuestions?: string[];
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
/* revise the thin part*/
const SYSTEM_PROMPT = `
You are a curious, encouraging reading companion helping someone reflect on a book chapter.
- Ask exactly one question per request.
- Use the structured notes and topic context to ground your question.
- Sound warm, supportive, and purposeful; focus on recall, understanding, or implications.
- Keep the question under 40 words.
- Refer to the topic by name once. If the label and detail are the same, mention it only once.
- When questionIndex is 0, open the topic and invite reflection on what stood out or why it matters.
- When questionIndex is 1 or higher, build on what the reader already said and nudge toward insight, prediction, or connection.
- Let the reader's latest response guide the follow-up; avoid introducing characters, places, or conflicts that weren't mentioned in the notes or responses.
- Avoid repeating the same noun twice in a row (for example, not "Darrow ... Darrow").
- If context is thin, ask what felt memorable or why the reader thinks it matters. 
Respond with the question only.
`.trim();

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
      const rawTitle = candidate.title;
      if (typeof rawTitle !== "string") {
        return null;
      }
      const title = rawTitle.trim();
      if (!title) {
        return null;
      }
      const items = sanitizeList(candidate.items);
      return { title, items };
    })
    .filter((section): section is { title: string; items: string[] } => Boolean(section));
}

function normalizeStructuredNote(raw: unknown): StructuredNote {
  if (!raw || typeof raw !== "object") {
    return {
      summary: [],
      characters: [],
      setting: [],
      relationships: [],
      reflections: [],
      extraSections: [],
    };
  }
  const candidate = raw as Partial<StructuredNote>;
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

function sanitizeTopic(raw: ReflectionTopic | undefined): { section: string; label: string; detail: string } {
  const section = typeof raw?.section === "string" && raw.section.trim() ? raw.section.trim() : "General";
  const label = typeof raw?.label === "string" && raw.label.trim() ? raw.label.trim() : "this part";
  const detail = typeof raw?.detail === "string" && raw.detail.trim() ? raw.detail.trim() : "";
  return { section, label, detail };
}

function summarizeNote(summary: StructuredNote): string {
  const sections: Array<[string, string[]]> = [
    ["Summary", summary.summary],
    ["Characters", summary.characters],
    ["Setting", summary.setting],
    ["Relationships", summary.relationships],
    ["User Reflections", summary.reflections],
  ];

  if (Array.isArray(summary.extraSections)) {
    summary.extraSections.forEach((section) => {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const summary = normalizeStructuredNote(body.summary);
    const topic = sanitizeTopic(body.topic);
    const questionIndex = Number.isInteger(body.questionIndex) ? Number(body.questionIndex) : 0;
    const userResponses = sanitizeList(body.userResponses);
    const askedQuestions = sanitizeList(body.askedQuestions);

    const summaryDigest = summarizeNote(summary) || "No structured notes were captured yet.";
    const responsesDigest =
      userResponses.length > 0 ? userResponses.map((entry, index) => `${index + 1}. ${entry}`).join("\n") : "None";
    const askedDigest =
      askedQuestions.length > 0 ? askedQuestions.map((entry, index) => `${index + 1}. ${entry}`).join("\n") : "None";
    const latestResponse = userResponses.length > 0 ? userResponses[userResponses.length - 1] : "None";

    const userPrompt = `
Structured note so far:
${summaryDigest}

Current reflection topic:
- Section: ${topic.section}
- Label: ${topic.label}
- Detail: ${topic.detail || "Not provided"}

Question position: ${questionIndex === 0 ? "First question about this topic" : `Follow-up question #${questionIndex}`}

Questions already asked in this reflection:
${askedDigest}

Reader responses so far:
${responsesDigest}

Latest reader response to build on:
${latestResponse}

Craft the next single question now.
`.trim();

    const response = await client.responses.create({
      model: "gpt-5-nano",
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: 400,
    });

    const question = (response.output_text ?? "").trim().replace(/\s+/g, " ");
    if (!question) {
      throw new Error("The reflection assistant did not return a question.");
    }

    return Response.json({ question });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate a reflection question right now.";
    console.error("/api/reflection-question error:", error);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
