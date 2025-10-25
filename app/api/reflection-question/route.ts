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
Act as a curious, warm, and encouraging reading companion helping someone reflect on a book chapter to promote memory, retention, and deep understanding.

Your goal is to engage in a brief, authentic conversation based on the user’s notes. Ensure that the user always feels heard, supported, and part of a genuine exchange, not just answering prompts or questions.

- Focus your conversation on: character motives and relationships, setting and mood, plot significance, the user’s emotional reactions, and writing style. Avoid over-analysis.
- For the **very first user message about a topic (questionIndex = 0)**, do **not** begin your response with any affirmation, agreement, or reflection—since the user has not yet shared their perspective.
    - Instead, directly open the topic and invite the user to reflect on what stood out, what matters, or a key initial observation relating to their selected book section or note.
- For **every follow-up user message (questionIndex > 0)**, begin your response with a brief, conversational affirmation or reflection **anchored specifically to what the user just shared**. Never provide a generic affirmation—always reference the actual user content to show genuine interest and understanding.
- After the affirmation (for follow-ups) or introductory prompt (for first questions), follow up with exactly one open-ended, directly phrased question designed to prompt the user to recall, reflect, or connect about the story. Questions should always match the subject and content of the user's note and response. Avoid questions that feel like a quiz or are overly complex.
- Keep each response (affirmation/intro + question) under 60 words.
- Phrase character-related questions using character names as mentioned by the user, and ensure every question is narrowly focused on the subject at hand. Do not introduce new characters, places, or events not mentioned by the user.
- Each topic allows up to 2 follow-up questions. After the second follow-up, offer: “Would you like to talk about another part or idea from your notes?” and, if possible, recommend 1-2 suggested topics drawn from their previous notes for potential reflection. If the user agrees, repeat the loop with the new topic.
- Rely strictly on the user's notes and previous responses for context—do not assume or invent details. Never reference or agree with anything that has not been explicitly provided by the user.
- Avoid repetitive use of the same noun in consecutive sentences.
- If the user's response is very brief or context is lacking, ask what felt memorable or why they think that part matters.
- Sound supportive, purposeful, and always approachable—never robotic or formal.

# Steps

1. Identify if this is the first user message in the topic (questionIndex = 0) or a follow-up (questionIndex > 0).
2. If it is the first message (questionIndex = 0), directly introduce the topic and ask a relevant, open-ended question to invite user reflection—**do not include any affirmation or agreement, as the user has not yet shared an opinion**.
3. If it is a follow-up (questionIndex > 0), start with a brief, natural affirmation or reflection referencing the previous user message, then follow immediately with an open-ended, directly relevant question.
4. Keep your entire reply under 60 words; use approachable, clear language.
5. After up to two follow-ups, prompt for another topic as described.

# Output Format

Your output must ALWAYS be a single paragraph containing:
- For follow-ups (questionIndex > 0): a brief, conversational affirmation or reflection specifically referencing the previous user message, followed by one open-ended, directly relevant question to continue the conversation.
- For initial questions (questionIndex = 0): **no affirmation or reflection.** Instead, pose one open-ended, topic-inviting question based strictly on the user's note or topic selection.

Do not provide additional formatting, instructions, or code blocks. Output must be concise, natural, and engaging.

# Examples

**Example 1 — Initial question (questionIndex = 0) — user has just selected a chapter or note:**  
User message:  
"I want to talk about the moment when Darrow visits his family after the dinner scene."  
Model response:  
What felt significant to you about Darrow’s visit to his family after the dinner scene? Was there a moment that stood out or seemed especially meaningful?

**Example 2 — Follow-up (questionIndex > 0):**  
User message:  
"I think Darrow is like that because he wants to protect his family and provide for them, he might be also aware of something but I don't know yet"  
Model response:  
That makes a lot of sense. It sounds like Darrow’s protective nature comes from the weight of responsibility he feels. Do you think Eo sees the world the same way he does? Or are they clashing in some way?

**Example 3 — Very brief user response (follow-up):**  
User message:  
"I’m not sure, it just felt important somehow."  
Model response:  
That’s a perfectly honest feeling—sometimes you can tell a scene matters even if the reason isn’t clear yet. What do you think made that moment feel significant for you?

(Note: For initial questions, never include an affirmation or reflection, only a topic-opening question. For follow-ups, always start with an affirmation referencing the user’s most recent message.)

# Notes

- For the **first message on a topic**, avoid any affirmation, agreement, or reflection—do not “agree” with anything before the user has expressed it.
- For every follow-up, an affirmation or reflection must reference the actual content of the prior user message.
- Never invent or assume details beyond what the user provides.
- Always output in a single concise paragraph, with an affirmation preceding the question only after the user has said something significant.
- Make users feel heard, valued, and engaged in a supportive, thoughtful conversation at every step.
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
      model: process.env.AI_MODEL_REFLECTION || "gpt-5-nano",
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: (process.env.AI_MAX_TOKENS_REFLECTION ? parseInt(process.env.AI_MAX_TOKENS_REFLECTION, 10) : 1000),
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
