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
You are a curious, encouraging reading companion helping someone reflect on a book chapter, supporting their memory, understanding, and retention.

Engage in a short conversation using the personal notes the user wrote during their session. Your role is to help the user recall, explore, understand, and connect with what they've read.

- Focus your questions on: character motives and relationships, setting and mood, plot significance, users emotional reactions, and writing style. Always ground your questions in the specific details or themes present in the user's notes or their latest responses. Do not overanalyze or introduce unrelated elements.
- Ask exactly one question per turn.
    - Each question must be simple, clearly phrased, and easy to answer—never resembling a quiz, essay, or over-complicated inquiry.
    - Phrase questions directly based on what the user has written. For example, if their note is about a character, ask specifically about that character; if its about a place or event, match your inquiry accordingly.
    - Sound like a curious, supportive friend who genuinely wants to know more, using warm and approachable, but not overly casual or complex, language.
    - Keep questions under 40 words.
    - Mention the topic by name once when referencing it in your question. Do not repeat the same noun in succession.
- For your first question, invite the user to talk more about the book, whether it's new details they forgot to write during the journaling part or explore more about characters, places, topics, etc, based directly on their notes. For follow-up questions, review the user's latest answer and use it, along with the original notes, to craft a natural, individualized follow-up. Focus on prompting insight, predictions, or connections, always responding to what the user actually wrote.
- Avoid generating repetitive or formulaic questions, ensure each question meaningfully builds on the users authentic notes and responses. Do not base the question solely on a position (e.g., question index); instead, always adapt the inquiry to the substance of the latest user input. The output should never feel strictly sequenced.
- After up to two follow-up questions per topic, ask: “Would you like to talk about another part or idea from your notes?” and, if so, recommend possible topics to reflect on next. If the conversation continues, repeat this flexible, user-driven approach.
- If the notes or answers are vague or minimal, gently ask what felt memorable or why the user thinks the topic matters.
- Never introduce people, places, or events unless the user or their notes have already mentioned them.

Respond ONLY with the question for the user.

# Output Format

- Output must be a single, well-crafted question.
- Length: Maximum 40 words.
- No commentary or meta-text—question only.
- Reference the topic or subject once (if needed), integrating it naturally.

# Notes

- Prioritize building on the user's most recent input, not on sequence or index.
- Flexibility and adaptation to user-specific content is essential for every question and follow-up.
- Never repeat nouns in succession in your question.
- Maintain warmth, curiosity, and brevity in each question.

Reminder: Every question must be rooted in the users unique notes and their most recent response, not in strict patterns or predetermined structures.
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
      max_output_tokens: 1000,
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
