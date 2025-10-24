"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const AI_ENDPOINT =
  process.env.NEXT_PUBLIC_AI_ENDPOINT || "/api/ai-reply";

const REFLECTION_ENDPOINT =
  process.env.NEXT_PUBLIC_REFLECTION_ENDPOINT || "/api/reflection-question";

const REFLECTION_CHANGE_ENDPOINT =
  process.env.NEXT_PUBLIC_REFLECTION_CHANGE_ENDPOINT || "/api/reflection-change";

// Initial assistant greeting shown in the chat transcript
const INTRO_MESSAGE = `Hey! I'm all ears for the chapter you just read. Drop in anything that made you pause - a character choice, a setting detail, a twist, even a feeling.
Things I love hearing about:
- Who showed up and what they did
- Places or atmosphere that stood out
- How people are connected or pulling apart
- Moments that made you cheer, sigh, or frown

I'll keep the thread organized so it's easy to revisit later. Whenever you want a nudge to remember more, just say so.
Ready when you are.`;

// Static session scaffold used to seed local state
const sessionTemplate = Object.freeze({
  bookId: "book123",
  bookTitle: "Red Rising",
  chapterId: "chapter-5",
  chapterTitle: "Chapter 5",
  notes: [],
  summary: createEmptySummary(),
});

// Emoji markers used for summary sections (escaped for consistent encoding)
const SUMMARY_ICONS = {
  Summary: "\uD83D\uDCDD",
  Characters: "\uD83D\uDC65",
  Setting: "\uD83D\uDCCD",
  Relationships: "\uD83D\uDD17",
  "User Reflections": "\uD83D\uDCAD",
  Themes: "\u2728",
  Conflicts: "\u26A1",
  Motifs: "\uD83C\uDFA8",
};

const SUMMARY_PLACEHOLDERS = {
  Summary: "You'll see a summary here once you've written more notes.",
  Characters: "You'll see key character notes here once they've shown up.",
  Setting: "Describe where the story is unfolding to see it here.",
  Relationships: "Capture important dynamics or tensions to track them here.",
  "User Reflections": "Add your personal reactions and takeaways to fill this in.",
};

const DEFAULT_EXTRA_PLACEHOLDER = "Add a few notes during reflection to fill this in.";

const FLOW_STATES = Object.freeze({
  JOURNALING: "journaling",
  SUMMARY: "summary",
  REFLECTION: "reflection",
  COMPLETE: "complete",
});

const REFLECTION_INTRO_MESSAGE = `Let's take a minute to reflect on what you just read. I'll ask a couple of quick questions based on your notes - together we might uncover a few insights you hadn't written down yet. That'll help your memory and prep you for next time. Ready?`;
const MAX_TOPIC_QUESTIONS = 2;
const CONTINUE_PROMPT_DEFAULT = "Want to explore another idea or part of your notes?";
const CONTINUE_PROMPTS = [
  "Were there any characters you noticed but haven't written about yet?",
  "Was there a setting or place that stood out to you that we haven't captured?",
  "Is there a theme or tension you want to unpack a little more?",
  "Did anything surprise you or hit you emotionally that we should jot down?",
  "Is there a loose end or prediction you'd like to explore?",
];

// Builds the blank structured summary returned from the API
function createEmptySummary() {
  return {
    summary: [],
    characters: [],
    setting: [],
    relationships: [],
    reflections: [],
    extras: [],
  };
}

// Generates message IDs using crypto when available
function safeUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

function toStringArray(value) {
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized ? [normalized] : [];
  }
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.replace(/\s+/g, " ").trim() : ""))
        .filter(Boolean)
    : [];
}

// Normalizes summary payloads coming back from the server
function normalizeSummary(raw) {
  const normalizeExtras = (value) =>
    Array.isArray(value)
      ? value
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const title = typeof entry.title === "string" ? entry.title.trim() : "";
            const items = toStringArray(entry.items);
            if (!title) {
              return null;
            }
            return { title, items };
          })
          .filter(Boolean)
      : [];

  if (!raw || typeof raw !== "object") {
    return createEmptySummary();
  }

  return {
    summary: toStringArray(raw.summary),
    characters: toStringArray(raw.characters),
    setting: toStringArray(raw.setting),
    relationships: toStringArray(raw.relationships),
    reflections: toStringArray(raw.reflections),
    extras: normalizeExtras(raw.extraSections ?? raw.extras ?? []),
  };
}

function collectSummarySections(summary) {
  const base = summary ?? createEmptySummary();
  const sections = {
    Summary: {
      items: toStringArray(base.summary),
    },
    Characters: {
      items: toStringArray(base.characters),
    },
    Setting: {
      items: toStringArray(base.setting),
    },
    Relationships: {
      items: toStringArray(base.relationships),
    },
    "User Reflections": {
      items: toStringArray(base.reflections),
    },
  };
  if (Array.isArray(base.extras)) {
    base.extras.forEach((section) => {
      if (!section || typeof section.title !== "string") return;
      const title = section.title.trim();
      if (!title) return;
      sections[title] = {
        items: toStringArray(section.items),
      };
    });
  }
  return sections;
}

function normalizeForDiff(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function buildNormalizedCounts(items) {
  const counts = new Map();
  items.forEach((item) => {
    const key = normalizeForDiff(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

function computeSummaryDiff(previous, next) {
  const prevSections = collectSummarySections(previous);
  const nextSections = collectSummarySections(next);
  const sectionTitles = new Set([...Object.keys(prevSections), ...Object.keys(nextSections)]);
  const added = {};
  const removed = {};
  sectionTitles.forEach((title) => {
    const prevItems = prevSections[title]?.items ?? [];
    const nextItems = nextSections[title]?.items ?? [];
    const prevCounts = buildNormalizedCounts(prevItems);
    const nextCounts = buildNormalizedCounts(nextItems);
    const additionUsage = new Map();
    const addedItems = [];
    nextItems.forEach((item) => {
      const key = normalizeForDiff(item);
      const usage = (additionUsage.get(key) ?? 0) + 1;
      additionUsage.set(key, usage);
      const baseline = prevCounts.get(key) ?? 0;
      if (usage > baseline) {
        addedItems.push(item);
      }
    });
    const removalUsage = new Map();
    const removedItems = [];
    prevItems.forEach((item) => {
      const key = normalizeForDiff(item);
      const usage = (removalUsage.get(key) ?? 0) + 1;
      removalUsage.set(key, usage);
      const remaining = nextCounts.get(key) ?? 0;
      if (usage > remaining) {
        removedItems.push(item);
      }
    });
    if (addedItems.length > 0) {
      added[title] = addedItems;
    }
    if (removedItems.length > 0) {
      removed[title] = removedItems;
    }
  });
  return { added, removed };
}

// Renders a chat bubble (AI vs user styling handled here)
function NoteMessage({ message }) {
  const isAI = message.role === "ai";
  const alignment = isAI ? "justify-start" : "justify-end";
  return (
    <div className={`mb-6 flex ${alignment}`}>
      {isAI ? (
        <>
          {/* Assistant responses span the width and use primary text tone */}
          <div className="w-full max-w-2xl text-sm leading-6 text-[var(--color-text-main)]">
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        </>
      ) : (
        <>
          {/* User notes stay compact in a rounded surface bubble */}
          <div className="max-w-xs rounded-2xl bg-[var(--color-surface)] px-5 py-3 text-sm leading-6 text-[var(--color-text-main)]">
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        </>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-6 flex justify-start">
      <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-secondary)]">
        Thinking...
      </div>
    </div>
  );
}

function hasSummaryContent(summary) {
  if (!summary) return false;
  const lists = [
    summary.summary,
    summary.characters,
    summary.setting,
    summary.relationships,
    summary.reflections,
    ...(Array.isArray(summary.extras) ? summary.extras.map((section) => section?.items ?? []) : []),
  ];
  return lists.some((items) => Array.isArray(items) && items.length > 0);
}

// Reusable block for each section inside the summary drawer
function SummaryCategory({ title, items, placeholder, showWhenEmpty = false, highlights = [] }) {
  const sanitizedItems = Array.isArray(items)
    ? items.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
  const highlightSet = new Set(
    Array.isArray(highlights)
      ? highlights
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean)
      : [],
  );
  const hasItems = sanitizedItems.length > 0;
  if (!hasItems && !showWhenEmpty) {
    return null;
  }

  const icon = SUMMARY_ICONS[title] ?? null;
  const resolvedPlaceholder = placeholder || DEFAULT_EXTRA_PLACEHOLDER;

  const HighlightBadge = () => (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
      NEW
    </span>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-main)]">
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span>{title}</span>
      </div>
      {hasItems ? (
        <div className="mt-4 space-y-2">
          {sanitizedItems.map((item, index) => {
            const key = `${title}-${index}-${item.slice(0, 16)}`;
            const isHighlighted = highlightSet.has(item);
            const containerHighlightClass = isHighlighted ? "rounded-md bg-[var(--color-accent-subtle)]/60 px-3 py-2" : "";
            const summaryLayoutClass = isHighlighted ? "flex items-start justify-between gap-3" : "flex items-start gap-3";
            const listLayoutClass = isHighlighted
              ? "flex items-start justify-between gap-3"
              : "flex items-start gap-2";
            if (title === "Summary") {
              return (
                <div key={key} className={`${summaryLayoutClass} ${containerHighlightClass}`}>
                  <p className="flex-1 text-sm leading-6 text-[var(--color-text-main)]">{item}</p>
                  {isHighlighted ? <HighlightBadge /> : null}
                </div>
              );
            }
            return (
              <div key={key} className={`${listLayoutClass} ${containerHighlightClass}`}>
                <div className="flex flex-1 items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-secondary)]" aria-hidden />
                  <span className="flex-1 text-sm leading-6 text-[var(--color-text-main)]">{item}</span>
                </div>
                {isHighlighted ? <HighlightBadge /> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 text-sm text-[var(--color-text-disabled)]">{resolvedPlaceholder}</div>
      )}
    </section>
  );
}

function SummarySectionStack({ summary, highlights = {}, showPlaceholders = false }) {
  const extras = Array.isArray(summary?.extras) ? summary.extras : [];
  const resolvedHighlights = typeof highlights === "object" && highlights !== null ? highlights : {};
  const sectionHighlights = (title) => {
    const items = resolvedHighlights[title];
    if (!items) return [];
    return Array.isArray(items) ? items : [];
  };

  return (
    <div className="space-y-8">
      <SummaryCategory
        title="Summary"
        items={summary?.summary}
        placeholder={SUMMARY_PLACEHOLDERS.Summary}
        showWhenEmpty={showPlaceholders}
        highlights={sectionHighlights("Summary")}
      />
      <SummaryCategory
        title="Characters"
        items={summary?.characters}
        placeholder={SUMMARY_PLACEHOLDERS.Characters}
        showWhenEmpty={showPlaceholders}
        highlights={sectionHighlights("Characters")}
      />
      <SummaryCategory
        title="Setting"
        items={summary?.setting}
        placeholder={SUMMARY_PLACEHOLDERS.Setting}
        showWhenEmpty={showPlaceholders}
        highlights={sectionHighlights("Setting")}
      />
      <SummaryCategory
        title="Relationships"
        items={summary?.relationships}
        placeholder={SUMMARY_PLACEHOLDERS.Relationships}
        showWhenEmpty={showPlaceholders}
        highlights={sectionHighlights("Relationships")}
      />
      <SummaryCategory
        title="User Reflections"
        items={summary?.reflections}
        placeholder={SUMMARY_PLACEHOLDERS["User Reflections"]}
        showWhenEmpty={showPlaceholders}
        highlights={sectionHighlights("User Reflections")}
      />
      {extras.map((section, index) => (
        <SummaryCategory
          key={`extra-${section.title}-${index}`}
          title={section.title}
          items={section.items}
          placeholder={DEFAULT_EXTRA_PLACEHOLDER}
          showWhenEmpty={showPlaceholders && Array.isArray(section.items) && section.items.length === 0}
          highlights={sectionHighlights(section.title)}
        />
      ))}
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg
      className="h-5 w-5 text-[var(--color-text-accent)]"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M11.5 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatSessionTimestamp(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch (error) {
    console.warn("Unable to format timestamp", error);
    return "";
  }
}

const REFLECTION_STAGES = Object.freeze({
  IDLE: "idle",
  INTRO: "intro",
  QUESTION: "question",
  CONTINUE_PROMPT: "continue_prompt",
  COMPLETE: "complete",
});

function createInitialReflectionContext() {
  return {
    stage: REFLECTION_STAGES.IDLE,
    topicsQueue: [],
    currentTopic: null,
    questionIndex: 0,
    userResponses: [],
    lastTopic: null,
    addedInsight: false,
    questionsAsked: [],
    insightLog: [],
    meaningfulResponses: [],
    awaitingContinue: false,
    continuePromptIndex: 0,
  };
}

function cleanDetail(detail) {
  return detail ? detail.trim().replace(/\s+/g, " ") : "";
}

function splitTopicEntry(entry) {
  if (!entry || typeof entry !== "string") {
    return { label: "", detail: "" };
  }
  const trimmed = entry.trim();
  const separatorMatch = trimmed.match(/^(.+?)[\s]*[:\-][\s]*(.+)$/);
  if (separatorMatch) {
    return { label: cleanDetail(separatorMatch[1]), detail: cleanDetail(separatorMatch[2]) };
  }
  const arrowMatch = trimmed.match(/^(.+?)[\s]*(?:<->|<-|->|-->|=>)[\s]*(.+)$/);
  if (arrowMatch) {
    return { label: cleanDetail(arrowMatch[1]), detail: cleanDetail(arrowMatch[2]) };
  }
  return { label: cleanDetail(trimmed), detail: cleanDetail(trimmed) };
}

function extractReflectionTopics(summary) {
  const topics = [];
  if (!summary) {
    return topics;
  }

  const pushTopic = (topic) => {
    if (!topic || !topic.label) return;
    const key = `${topic.section}|${topic.label}|${topic.detail}`;
    if (!topics.find((item) => `${item.section}|${item.label}|${item.detail}` === key)) {
      topics.push(topic);
    }
  };

  (Array.isArray(summary.characters) ? summary.characters : []).forEach((entry, index) => {
    const { label, detail } = splitTopicEntry(entry);
    pushTopic({
      id: `characters-${index}`,
      section: "Characters",
      label,
      detail,
      source: entry,
    });
  });

  (Array.isArray(summary.relationships) ? summary.relationships : []).forEach((entry, index) => {
    const { label, detail } = splitTopicEntry(entry);
    pushTopic({
      id: `relationships-${index}`,
      section: "Relationships",
      label,
      detail,
      source: entry,
    });
  });

  (Array.isArray(summary.setting) ? summary.setting : []).forEach((entry, index) => {
    const { label, detail } = splitTopicEntry(entry);
    pushTopic({
      id: `setting-${index}`,
      section: "Setting",
      label,
      detail,
      source: entry,
    });
  });

  (Array.isArray(summary.extras) ? summary.extras : []).forEach((section, sectionIndex) => {
    if (!section || typeof section.title !== "string") return;
    const sectionTitle = section.title.trim();
    if (!sectionTitle) return;
    (Array.isArray(section.items) ? section.items : []).forEach((entry, index) => {
      const { label, detail } = splitTopicEntry(entry);
      pushTopic({
        id: `extra-${sectionIndex}-${index}`,
        section: sectionTitle,
        label,
        detail,
        source: entry,
      });
    });
  });

  (Array.isArray(summary.reflections) ? summary.reflections : []).forEach((entry, index) => {
    pushTopic({
      id: `user-reflection-${index}`,
      section: "User Reflections",
      label: entry.trim(),
      detail: entry.trim(),
      source: entry,
    });
  });

  (Array.isArray(summary.summary) ? summary.summary : []).forEach((entry, index) => {
    const cleaned = cleanDetail(entry);
    if (!cleaned) return;
    pushTopic({
      id: `summary-${index}`,
      section: "Summary",
      label: cleaned,
      detail: cleaned,
      source: entry,
    });
  });

  if (topics.length === 0) {
    pushTopic({
      id: "general-0",
      section: "General",
      label: "the part that stayed with you",
      detail: "",
      source: "",
    });
  }

  return topics.slice(0, 6);
}

function buildGeneralReflectionTopic() {
  return {
    id: `general-${safeUuid()}`,
    section: "General",
    label: "something that stayed with you",
    detail: "",
    source: "",
  };
}

function buildContinuePromptMessage(lastTopic, remainingCount, promptIndex = 0) {
  const basePrompt = CONTINUE_PROMPTS[promptIndex % CONTINUE_PROMPTS.length] ?? CONTINUE_PROMPT_DEFAULT;
  if (lastTopic && typeof lastTopic.label === "string" && lastTopic.label.trim()) {
    const label = lastTopic.label.trim();
    const pivotPrompt =
      remainingCount > 0
        ? `We can circle back to ${label} or follow something completely new—whatever helps you remember more.`
        : `We can stay with ${label} or wander to anything else that feels important.`;
    return `Want to keep exploring? ${basePrompt} ${pivotPrompt}`;
  }
  return `Want to keep exploring? ${basePrompt}`;
}

function findTopicMatchFromMessage(message, queue) {
  if (!message || !Array.isArray(queue) || queue.length === 0) {
    return null;
  }
  const normalized = message.toLowerCase();
  const index = queue.findIndex((topic) => {
    if (!topic) return false;
    const rawLabel = typeof topic.label === "string" ? topic.label.toLowerCase() : "";
    const rawDetail = typeof topic.detail === "string" ? topic.detail.toLowerCase() : "";
    return (rawLabel && normalized.includes(rawLabel)) || (rawDetail && normalized.includes(rawDetail));
  });
  if (index === -1) {
    return null;
  }
  const topic = queue[index];
  const remaining = [...queue.slice(0, index), ...queue.slice(index + 1)];
  return { topic, remaining };
}

function createAdHocTopicFromInput(input) {
  if (!input || typeof input !== "string") {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed || trimmed.length < 4) {
    return null;
  }
  const cleaned = stripAffirmationPrefix(trimmed);
  const usable = cleaned.length >= 4 ? cleaned : trimmed;
  const focusPrefacePattern =
    /^(?:i\s+(?:forgot|should|want(?:ed)?)\s+to\s+mention(?:\s+about)?|also|and\s+also)\s+/i;
  const focusTextCandidate = usable.replace(focusPrefacePattern, "").trim();
  const focusText = focusTextCandidate.length >= 4 ? focusTextCandidate : usable;

  const { label: initialLabel, detail: initialDetail } = splitTopicEntry(focusText);
  const properNames = extractProperNouns(focusText);
  const meaningfulNames = properNames.filter(isMeaningfulName);

  let section = "General";
  let label = initialLabel;
  let detail = initialDetail;

  if (meaningfulNames.length >= 2) {
    section = "Relationships";
    label = meaningfulNames.slice(0, 2).join(" & ");
  } else if (meaningfulNames.length === 1) {
    section = "Characters";
    label = meaningfulNames[0];
  }

  if (!label) {
    label = meaningfulNames[0] || focusText.slice(0, 32).trim();
  }

  let detailSource = focusText;
  if (section === "Characters" && label) {
    detailSource = stripLeadingName(focusText, label);
  } else if (section === "Relationships" && meaningfulNames.length > 0) {
    detailSource = stripLeadingRelationship(focusText, meaningfulNames);
  }
  detailSource = detailSource.replace(/^[\s,:;-]+/, "").trim();
  if (!detailSource) {
    detailSource = initialDetail && initialDetail !== label ? initialDetail : focusText;
  }
  const sanitizedDetail = sanitizePerspective(detailSource);
  const compactDetail = shortenSentence(sanitizedDetail || detailSource, MAX_REFLECTION_DETAIL_WORDS);
  detail = compactDetail || label;

  return {
    id: `adhoc-${safeUuid()}`,
    section,
    label,
    detail,
    source: usable,
  };
}

function detectExplicitRelationship(responseText) {
  if (!responseText) return null;
  const text = responseText.trim();
  if (!text) return null;
  const patterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'?s relationship to ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+as\s+([^.!?]+))?/i,
    /relationship\s+(?:between|among)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[^A-Za-z]+(?:and|&|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+as\s+([^.!?]+))?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match || match.length < 3) {
      continue;
    }
    const rawFirst = cleanNameToken(match[1] ?? "");
    const rawSecond = cleanNameToken(match[2] ?? "");
    const namesSource = [rawFirst, rawSecond].map((name) => name.trim()).filter(Boolean);
    const meaningfulNames = [];
    const seen = new Set();
    namesSource.forEach((name) => {
      const normalized = normalizeName(name);
      if (!normalized || seen.has(normalized)) {
        return;
      }
      if (!isMeaningfulName(name)) {
        return;
      }
      seen.add(normalized);
      meaningfulNames.push(name);
    });
    if (meaningfulNames.length < 2) {
      continue;
    }
    const capturedDetail = match[3] ? match[3].trim() : "";
    const trailingDetail = text.slice((match.index ?? 0) + match[0].length).trim();
    const detailCandidate = [capturedDetail, trailingDetail].find((value) => value && value.length > 1) || "";
    const detail = detailCandidate.replace(/^(?:as|like)\s+/i, "").trim();
    return {
      names: meaningfulNames.slice(0, 2),
      detail,
    };
  }
  return null;
}

async function requestReflectionQuestion({
  summary,
  topic,
  questionIndex,
  userResponses,
  askedQuestions,
  signal,
}) {
  const payload = {
    summary,
    topic,
    questionIndex,
    userResponses,
    askedQuestions,
  };

  const response = await fetch(REFLECTION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let message = "Unable to think of a follow-up question right now.";
    try {
      const errorBody = await response.json();
      if (errorBody?.error) {
        message = errorBody.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const data = await response.json();
  const question = typeof data?.question === "string" ? data.question.trim() : "";
  if (!question) {
    throw new Error("The reflection assistant returned an empty question.");
  }
  return question;
}

function isAffirmativeResponse(value) {
  const normalized = value.trim().toLowerCase();
  return /(yes|yep|sure|sure thing|okay|ok|let'?s go|let'?s keep going|keep going|yup|yeah|do it|absolutely|sounds good|why not|count me in|let'?s keep rolling)/.test(
    normalized,
  );
}

function stripAffirmationPrefix(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  const patterns = [
    /^yes\b[,\s-]*/i,
    /^yeah\b[,\s-]*/i,
    /^yep\b[,\s-]*/i,
    /^yup\b[,\s-]*/i,
    /^sure\b[,\s-]*/i,
    /^ok\b[,\s-]*/i,
    /^okay\b[,\s-]*/i,
    /^absolutely\b[,\s-]*/i,
    /^definitely\b[,\s-]*/i,
    /^totally\b[,\s-]*/i,
    /^of course\b[,\s-]*/i,
    /^sounds good\b[,\s-]*/i,
    /^why not\b[,\s-]*/i,
    /^please\b[,\s-]*/i,
    /^let'?s\b[,\s-]*/i,
  ];
  for (const pattern of patterns) {
    if (pattern.test(trimmed)) {
      return trimmed.replace(pattern, "").trim();
    }
  }
  return trimmed;
}

function isNegativeResponse(value) {
  const normalized = value.trim().toLowerCase();
  return /(?:^|\b)(no|nope|nah|not\s+now|later|stop|i'?m\s+good|i\s+am\s+good|i'?m\s+done|i\s+am\s+done|i'?m\s+finished|i\s+am\s+finished|that'?s\s+it|that'?s\s+all|done|all\s+good|that'?ll\s+do|i'?m\s+all\s+set|i'?m\s+set)(?:\b|$)/.test(
    normalized,
  );
}

function isVagueResponse(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.length <= 3) return true;
  return /(not sure|no idea|idk|don't know|unsure|maybe)/.test(normalized);
}

function pickNextTopic(context) {
  if (!context.topicsQueue || context.topicsQueue.length === 0) {
    return { topic: null, remaining: [] };
  }
  const [nextTopic, ...rest] = context.topicsQueue;
  return { topic: nextTopic, remaining: rest };
}

function summarizeEntryForPrompt(entry) {
  if (!entry) return "";
  const section = entry.section || "";
  const rawValue = (entry.value || entry.preview || "").trim();
  if (!rawValue) return "";

  if (section === "Characters") {
    const [name, ...detailParts] = rawValue.split(":");
    const detail = detailParts.join(":").trim();
    if (name && detail) {
      return `${name.trim()} (${compactText(detail, 6)})`;
    }
  }

  if (section === "Relationships") {
    const [label, ...detailParts] = rawValue.split("-");
    const detail = detailParts.join("-").trim();
    if (label && detail) {
      return `${label.trim()} (${compactText(detail, 6)})`;
    }
  }

  return compactText(rawValue, 8);
}

function buildWrapupSuggestion(pendingEntries, fallbackTopic) {
  if (pendingEntries.length > 0) {
    const highlights = pendingEntries.map(summarizeEntryForPrompt).filter(Boolean);
    if (highlights.length === 1) {
      return highlights[0];
    }
    if (highlights.length === 2) {
      return `${highlights[0]} and ${highlights[1]}`;
    }
    if (highlights.length > 2) {
      return `${highlights[0]}, ${highlights[1]}, and ${highlights[2]}`;
    }
  }

  if (fallbackTopic && fallbackTopic.label) {
    return `the way ${fallbackTopic.label.toLowerCase()} might shape what happens next`;
  }

  return "how the scene felt from your perspective";
}

function normalizeEntryKey(section, value) {
  return `${(section || "User Reflections").toLowerCase()}|${(value || "").trim().toLowerCase()}`;
}

function createReflectionEntryFromResponse(response) {
  if (!response || isVagueResponse(response)) {
    return null;
  }
  const sentence = ensureSentence(shortenSentence(extractLeadingSentence(response), MAX_REFLECTION_DETAIL_WORDS));
  const preview = previewFromValue("User Reflections", sentence);
  return sentence
    ? {
        section: "User Reflections",
        value: sentence,
        preview,
      }
    : null;
}

function deriveEntriesFromLog(insightLog, fallbackTopic) {
  const entries = [];
  const seen = new Set();

  const addEntry = (entry) => {
    if (!entry || !entry.value) return;
    const key = normalizeEntryKey(entry.section, entry.value);
    if (seen.has(key)) return;
    entries.push(entry);
    seen.add(key);
  };

  (Array.isArray(insightLog) ? insightLog : []).forEach((logEntry) => {
    if (!logEntry) return;
    if (logEntry.candidate && logEntry.candidate.value) {
      addEntry(logEntry.candidate);
      return;
    }
    if (logEntry.response) {
      const candidate = createReflectionEntryFromResponse(logEntry.response);
      addEntry(candidate);
    }
  });

  return entries.slice(-4);
}

function ensureSentence(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function compactText(text, maxWords = 6) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) {
    return trimmed;
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function extractLeadingSentence(text) {
  const normalized = (text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  const match = normalized.match(/.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : normalized;
}

function shortenSentence(text, maxWords = 24) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) {
    return trimmed;
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function containsFirstPerson(text) {
  return /\b(i|me|my|mine|myself)\b/i.test(text);
}

const HEDGING_PATTERN = /\b(might|maybe|perhaps|seems|seemed|seeming|appears|appeared|likely|probably|possibly|could|could've|couldn['\u2019]?t|i think|i feel|i guess|i wonder|i suspect)\b/i;

function containsSpeculation(text) {
  if (!text) return false;
  return HEDGING_PATTERN.test(text.toLowerCase());
}

const NAME_STOPWORDS = new Set([
  "i",
  "the",
  "he",
  "she",
  "they",
  "we",
  "it",
  "his",
  "hers",
  "him",
  "her",
  "them",
  "their",
  "our",
  "a",
  "an",
  "that",
  "this",
  "those",
  "these",
  "there",
  "then",
  "here",
  "when",
  "where",
  "why",
  "how",
  "which",
  "someone",
  "something",
  "anyone",
  "anything",
  "because",
  "but",
  "and",
  "if",
  "or",
  "nor",
  "so",
]);

function extractProperNouns(text) {
  const candidates = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g) || []).map((name) => name.trim());
  return candidates.filter((name) => !NAME_STOPWORDS.has(name.toLowerCase()));
}

function normalizeName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function extractAdditionalNames(text, primaryLabel) {
  const primaryNormalized = normalizeName(primaryLabel);
  const names = new Set();
  extractProperNouns(text).forEach((candidate) => {
    const normalized = normalizeName(candidate);
    if (!normalized || normalized === primaryNormalized) {
      return;
    }
    names.add(candidate);
  });
  return Array.from(names);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanNameToken(token) {
  return (token || "").replace(/["'`]|[\u201C\u201D\u2018\u2019]/g, "").trim();
}

function splitNameCandidates(label) {
  if (!label) return [];
  return label
    .split(/(?:&|,|\/|\\|\||\s+vs\s+|\s+and\s+|[-\u2013\u2014:;])/i)
    .map((part) => cleanNameToken(part))
    .filter(Boolean);
}

const GENERIC_LABELS = new Set(["character", "relationship", "setting", "summary", "location", "place", "scene", "moment", "detail", "note", "notes"]);

function isGenericLabel(label) {
  const normalized = normalizeName(label);
  if (!normalized) return true;
  if (NAME_STOPWORDS.has(normalized)) return true;
  return GENERIC_LABELS.has(normalized);
}

function isMeaningfulName(label) {
  return !isGenericLabel(label);
}

function getTopicPrimaryLabel(topic) {
  if (!topic || !topic.label) {
    return "";
  }
  const candidates = splitNameCandidates(topic.label);
  const meaningful = candidates.find((candidate) => isMeaningfulName(candidate));
  if (meaningful) {
    return meaningful;
  }
  return candidates[0] || "";
}

function getTopicRelationshipNames(topic, fallbackNames = []) {
  const baseNames = splitNameCandidates(topic?.label ?? "").filter(isMeaningfulName);
  const supplemental = (Array.isArray(fallbackNames) ? fallbackNames : []).filter(isMeaningfulName);
  const combined = [];
  const seen = new Set();
  [...baseNames, ...supplemental].forEach((name) => {
    const normalized = normalizeName(name);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    combined.push(name.trim());
  });
  return combined;
}

function stripLeadingName(sentence, name) {
  if (!sentence || !name) return sentence?.trim() ?? "";
  const pattern = new RegExp(`^${escapeRegExp(name)}\\s*(?:[:,\\-]|is|was|seems|felt|feels|looks)?\\s*`, "i");
  return sentence.replace(pattern, "").trim();
}

function stripLeadingRelationship(sentence, names) {
  if (!sentence) return "";
  let result = sentence.trim();
  (Array.isArray(names) ? names : []).forEach((name) => {
    if (!name) return;
    const pattern = new RegExp(`^${escapeRegExp(name)}\\s*(?:[:,\\-&]|and)?\\s*`, "i");
    result = result.replace(pattern, "").trim();
  });
  return result;
}

function analyzeInsightTarget(topic, response) {
  const baseSection = topic && typeof topic.section === "string" ? topic.section : "User Reflections";
  const names = extractAdditionalNames(response, topic?.label ?? "");
  const responseWordCount = wordCount(response);
  if (containsFirstPerson(response) || responseWordCount > 60) {
    return { section: "User Reflections", names };
  }
  switch (baseSection) {
    case "Summary":
      return { section: "Summary", names };
    case "Characters":
      if (names.length > 0) {
        return { section: "Relationships", names: [getTopicPrimaryLabel(topic), ...names] };
      }
      return { section: "Characters", names: [getTopicPrimaryLabel(topic)] };
    case "Relationships":
      return { section: "Relationships", names: names.length > 0 ? names : [] };
    case "Setting":
      return { section: "Setting", names };
    case "User Reflections":
    case "General":
    default:
      return { section: "User Reflections", names };
  }
}

const MAX_CHARACTER_DETAIL_WORDS = 12;
const MAX_RELATIONSHIP_DETAIL_WORDS = 16;
const MAX_SETTING_DETAIL_WORDS = 22;
const MAX_REFLECTION_DETAIL_WORDS = 26;

function sanitizePerspective(text) {
  if (!text) return "";
  return text.replace(/\b(I|me|my|mine|myself)\b/gi, "").replace(/\s+/g, " ").trim();
}

function formatInsightValue(targetSection, topic, baseSentence, rawResponse, names) {
  const primaryLabel = getTopicPrimaryLabel(topic);
  if (targetSection === "Summary") {
    return ensureSentence(shortenSentence(baseSentence, 28));
  }
  if (targetSection === "Characters") {
    const meaningfulPrimary = isMeaningfulName(primaryLabel);
    const detailSource = stripLeadingName(baseSentence, primaryLabel) || baseSentence;
    const perspectiveStripped = sanitizePerspective(detailSource);
    const conciseDetail = shortenSentence(perspectiveStripped || detailSource, MAX_CHARACTER_DETAIL_WORDS);
    if (!meaningfulPrimary || !conciseDetail) {
      return ensureSentence(shortenSentence(baseSentence, MAX_REFLECTION_DETAIL_WORDS));
    }
    return ensureSentence(`${primaryLabel.trim()}: ${conciseDetail}`);
  }
  if (targetSection === "Relationships") {
    const relationshipNames = getTopicRelationshipNames(topic, names || []);
    const meaningfulNames = relationshipNames.filter(isMeaningfulName);
    if (meaningfulNames.length < 2) {
      return ensureSentence(shortenSentence(baseSentence, MAX_REFLECTION_DETAIL_WORDS));
    }
    const label = meaningfulNames.slice(0, 2).join(" & ");
    const detail = stripLeadingRelationship(baseSentence, relationshipNames) || baseSentence;
    const conciseDetail = shortenSentence(sanitizePerspective(detail) || detail, MAX_RELATIONSHIP_DETAIL_WORDS);
    if (!conciseDetail) {
      return ensureSentence(shortenSentence(baseSentence, MAX_RELATIONSHIP_DETAIL_WORDS));
    }
    return ensureSentence(`${label} - ${conciseDetail}`);
  }
  if (targetSection === "Setting") {
    return ensureSentence(shortenSentence(baseSentence, MAX_SETTING_DETAIL_WORDS));
  }
  return ensureSentence(shortenSentence(baseSentence, MAX_REFLECTION_DETAIL_WORDS));
}

function previewFromValue(section, value) {
  if (!value) return "";
  if (section === "User Reflections" || section === "Summary") {
    return value;
  }
  if (section === "Characters") {
    const parts = value.split(":");
    if (parts.length > 1) {
      return parts.slice(1).join(":").trim();
    }
  }
  if (section === "Relationships") {
    const parts = value.split("-");
    if (parts.length > 1) {
      return parts.slice(1).join("-").trim();
    }
  }
  return value;
}

const SECTION_KEYS = Object.freeze({
  Summary: "summary",
  Characters: "characters",
  Setting: "setting",
  Relationships: "relationships",
  "User Reflections": "reflections",
  General: "reflections",
});

function wordCount(value) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function createCandidateEntry(response, topic) {
  const rawResponse = (response || "").trim();
  if (!rawResponse) {
    return null;
  }

  const leadingSentence = extractLeadingSentence(rawResponse);
  const sentence = ensureSentence(leadingSentence);
  const analysis = analyzeInsightTarget(topic ?? {}, rawResponse);
  const primaryLabel = getTopicPrimaryLabel(topic ?? {});
  const relationshipNames = getTopicRelationshipNames(topic ?? {}, analysis.names || []);
  const meaningfulRelationshipNames = relationshipNames.filter(isMeaningfulName);
  const hedged = containsSpeculation(rawResponse);

  let targetSection = analysis.section ?? "User Reflections";

  if (targetSection === "Characters") {
    if (!isMeaningfulName(primaryLabel) || hedged) {
      targetSection = "User Reflections";
    }
  } else if (targetSection === "Relationships") {
    if (meaningfulRelationshipNames.length < 2 || hedged) {
      targetSection = "User Reflections";
    }
  }

  let namesForFormatting =
    targetSection === "Relationships" ? relationshipNames : analysis.names;
  let formattedValue = formatInsightValue(targetSection, topic ?? {}, sentence, rawResponse, namesForFormatting);

  if (targetSection !== "Relationships") {
    const explicitRelationship = detectExplicitRelationship(rawResponse);
    if (explicitRelationship && Array.isArray(explicitRelationship.names) && explicitRelationship.names.length >= 2) {
      const dedupedNames = [];
      const seen = new Set();
      explicitRelationship.names.forEach((name) => {
        const normalized = normalizeName(name);
        if (!normalized || seen.has(normalized) || !isMeaningfulName(name)) {
          return;
        }
        seen.add(normalized);
        dedupedNames.push(name.trim());
      });
      if (dedupedNames.length >= 2) {
        targetSection = "Relationships";
        namesForFormatting = dedupedNames;
        const detailSource = sanitizePerspective(explicitRelationship.detail || rawResponse) || explicitRelationship.detail || rawResponse;
        const conciseDetail = shortenSentence(detailSource, MAX_RELATIONSHIP_DETAIL_WORDS) || "have a pivotal connection";
        const relationshipLabel = dedupedNames.slice(0, 2).join(" & ");
        formattedValue = ensureSentence(`${relationshipLabel} - ${conciseDetail}`);
      }
    }
  }

  if (!formattedValue) {
    return null;
  }

  if (targetSection === "Characters") {
    const label = (formattedValue.split(":")[0] || "").trim();
    if (!isMeaningfulName(label)) {
      targetSection = "User Reflections";
      formattedValue = ensureSentence(shortenSentence(rawResponse, MAX_REFLECTION_DETAIL_WORDS));
    }
  } else if (targetSection === "Relationships") {
    const label = (formattedValue.split("-")[0] || "").trim();
    const labelNames = label.split("&").map((name) => name.trim()).filter(Boolean);
    const meaningful = labelNames.filter(isMeaningfulName);
    if (meaningful.length < 2) {
      targetSection = "User Reflections";
      formattedValue = ensureSentence(shortenSentence(rawResponse, MAX_REFLECTION_DETAIL_WORDS));
    }
  }

  const preview = previewFromValue(targetSection, formattedValue);

  return {
    section: targetSection,
    value: formattedValue,
    preview,
  };
}

function NoteSummaryScreen({ session, completedAt, onBack, onReflect, onFinish, highlights }) {
  const timestampLabel = formatSessionTimestamp(completedAt);
  return (
    <div className="flex h-screen flex-col bg-[var(--color-page)] text-[var(--color-text-main)]">
      <header className="border-b border-[var(--color-accent-subtle)] bg-[var(--color-text-on-accent)] px-6 py-5">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-accent)] transition hover:text-[var(--color-accent-hover)]"
          >
            <BackArrowIcon />
            <span>Back</span>
          </button>
          <div className="text-sm font-semibold uppercase tracking-wide text-[var(--color-secondary)]">Session notes</div>
          <div className="w-12" />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-6 pb-24 pt-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div>
            <div className="text-xs text-[var(--color-secondary)]">{timestampLabel}</div>
            <h1 className="text-2xl font-medium" style={{ fontFamily: "var(--font-h2)" }}>
              {session.chapterTitle}
            </h1>
          </div>
          <div className="rounded-xl bg-[var(--color-surface)] p-6">
            <SummarySectionStack summary={session.summary} highlights={highlights} showPlaceholders />
          </div>
        </div>
      </main>
      <footer className="border-t border-[var(--color-accent-subtle)] bg-[var(--color-page)] px-6 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <button
            type="button"
            onClick={onReflect}
            className="w-full rounded-full bg-[var(--color-accent)] px-5 py-3 text-base font-semibold text-[var(--color-text-on-accent)] transition hover:bg-[var(--color-accent-hover)]"
          >
            Reflect and expand
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="w-full rounded-full border border-transparent px-5 py-3 text-base font-semibold text-[var(--color-text-accent)] transition hover:text-[var(--color-accent-hover)]"
          >
            Finish session
          </button>
        </div>
      </footer>
    </div>
  );
}

function ReflectionCompleteScreen({
  session,
  completedAt,
  onBackToBook,
  onStartNewNote,
  highlights,
  changeSummary,
  isChangeSummaryLoading = false,
}) {
  const timestampLabel = formatSessionTimestamp(completedAt);
  const hasChangeSummary = typeof changeSummary === "string" && changeSummary.trim().length > 0;
  const changeSummaryContent = hasChangeSummary ? changeSummary.trim() : "";
  return (
    <div className="flex h-screen flex-col bg-[var(--color-page)] text-[var(--color-text-main)]">
      <header className="border-b border-[var(--color-accent-subtle)] bg-[var(--color-text-on-accent)] px-6 py-5">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-[var(--color-secondary)]">Reflection complete</div>
            <h1 className="text-2xl font-medium text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-h2)" }}>
              {session.chapterTitle}
            </h1>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-6 pb-24 pt-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div>
            <div className="text-xs text-[var(--color-secondary)]">{timestampLabel}</div>
            <div className="text-base font-medium text-[var(--color-text-main)]">{session.bookTitle}</div>
          </div>
          {hasChangeSummary || isChangeSummaryLoading ? (
            <div className="rounded-lg border border-[var(--color-accent-subtle)] bg-[var(--color-text-on-accent)] px-4 py-3 text-sm text-[var(--color-text-main)]">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-secondary)]">Reflection updates</div>
              <div className="mt-2 text-sm leading-6 text-[var(--color-text-main)]">
                {isChangeSummaryLoading ? "Give me a second to summarize what changed..." : changeSummaryContent}
              </div>
            </div>
          ) : null}
          <div className="rounded-xl bg-[var(--color-surface)] p-6">
            <SummarySectionStack summary={session.summary} highlights={highlights} showPlaceholders />
          </div>
        </div>
      </main>
      <footer className="border-t border-[var(--color-accent-subtle)] bg-[var(--color-page)] px-6 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <button
            type="button"
            onClick={onBackToBook}
            className="w-full rounded-full bg-[var(--color-accent)] px-5 py-3 text-base font-semibold text-[var(--color-text-on-accent)] transition hover:bg-[var(--color-accent-hover)]"
          >
            Back to Book
          </button>
          <button
            type="button"
            onClick={onStartNewNote}
            className="w-full rounded-full border border-transparent px-5 py-3 text-base font-semibold text-[var(--color-text-accent)] transition hover:text-[var(--color-accent-hover)]"
          >
            Start a new note
          </button>
        </div>
      </footer>
    </div>
  );
}

// Slide-up panel that shows the structured notes summary
function SummarySheet({ open, onClose, session, highlights }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* Backdrop tap target */}
          <motion.button
            type="button"
            aria-label="Close notes"
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* Sheet container */}
          <motion.div
            className="relative z-10 flex w-full max-w-2xl flex-col rounded-t-3xl bg-[var(--color-page)] px-4 pb-8 pt-6"
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            style={{ maxHeight: "80vh" }}
          >
            <div className="mx-auto flex h-full w-full max-w-xl flex-col gap-6 overflow-hidden">
              {/* Sheet header with context + dismiss */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-[var(--color-secondary)]">{session.bookTitle}</div>
                  <div className="text-2xl font-medium text-[var(--color-text-main)]">{session.chapterTitle}</div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-[var(--color-text-accent)] transition hover:text-[var(--color-accent-hover)]"
                >
                  Done
                </button>
              </div>

              {/* Summary sections grouped inside a single surface */}
              <div className="flex-1 overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4">
                <SummarySectionStack summary={session.summary} highlights={highlights} showPlaceholders />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ChevronDown({ open }) {
  return (
    <svg
      className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Main journaling surface: header, transcript, composer, and summary toggle
export default function JournalingPage() {
  // Local state: message history, structured summary, and UI flags
  const [messages, setMessages] = useState(() => [
    { id: safeUuid(), role: "ai", content: INTRO_MESSAGE, createdAt: new Date().toISOString() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [session, setSession] = useState(() => ({
    ...sessionTemplate,
    notes: [...sessionTemplate.notes],
    summary: createEmptySummary(),
  }));
  const [showSummary, setShowSummary] = useState(false);
  const [isUpdatingSummary, setIsUpdatingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryHighlights, setSummaryHighlights] = useState({});
  const [reflectionChangeSummary, setReflectionChangeSummary] = useState("");
  const [isReflectionChangeSummaryLoading, setIsReflectionChangeSummaryLoading] = useState(false);
  const [flowStep, setFlowStep] = useState(FLOW_STATES.JOURNALING);
  const [sessionCompletedAt, setSessionCompletedAt] = useState(null);
  const [reflectionMessages, setReflectionMessages] = useState([]);
  const [reflectionInput, setReflectionInput] = useState("");
  const [reflectionContext, setReflectionContext] = useState(createInitialReflectionContext);
  const [isFetchingReflectionQuestion, setIsFetchingReflectionQuestion] = useState(false);
  const scrollRef = useRef(null);
  const aiControllerRef = useRef(null);
  const summaryRef = useRef(session.summary);
  const reflectionTimerRef = useRef(null);
  const reflectionQuestionControllerRef = useRef(null);
  const reflectionContextRef = useRef(reflectionContext);
  const reflectionBaselineSummaryRef = useRef(null);
  const reflectionDiffRef = useRef({ added: {} });
  const reflectionChangeSummaryRequestRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, reflectionMessages, showSummary, flowStep]);

  useEffect(() => {
    summaryRef.current = session.summary;
  }, [session.summary]);

  useEffect(() => {
    reflectionContextRef.current = reflectionContext;
  }, [reflectionContext]);

  useEffect(() => {
    if (!hasSummaryContent(session.summary)) {
      setShowSummary(false);
    }
  }, [session.summary]);

  useEffect(() => {
    if (flowStep !== FLOW_STATES.COMPLETE) {
      return;
    }
    if (isUpdatingSummary || isReflectionChangeSummaryLoading) {
      return;
    }
    if (reflectionChangeSummaryRequestRef.current) {
      return;
    }
    const highlightSets = reflectionDiffRef.current?.added ?? {};
    const hasHighlights = Object.values(highlightSets).some((value) => {
      if (value instanceof Set) {
        return value.size > 0;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return false;
    });
    if (!hasHighlights) {
      reflectionChangeSummaryRequestRef.current = true;
      setReflectionChangeSummary("");
      return;
    }
    reflectionChangeSummaryRequestRef.current = true;
    void requestReflectionChangeSummary();
  }, [flowStep, isUpdatingSummary, isReflectionChangeSummaryLoading]);

  useEffect(() => {
    return () => {
      if (aiControllerRef.current) {
        aiControllerRef.current.abort();
      }
      if (reflectionTimerRef.current) {
        clearTimeout(reflectionTimerRef.current);
      }
      if (reflectionQuestionControllerRef.current) {
        reflectionQuestionControllerRef.current.abort();
      }
    };
  }, []);

  const applyReflectionDiff = (diffAdded) => {
    if (!diffAdded || typeof diffAdded !== "object") {
      return;
    }
    const currentSets = reflectionDiffRef.current?.added ?? {};
    const nextSets = { ...currentSets };
    let changed = false;
    Object.entries(diffAdded).forEach(([section, items]) => {
      if (!Array.isArray(items) || items.length === 0) {
        return;
      }
      const set =
        nextSets[section] instanceof Set
          ? nextSets[section]
          : new Set(Array.isArray(nextSets[section]) ? nextSets[section] : []);
      const beforeSize = set.size;
      items.forEach((item) => {
        if (item) {
          set.add(item);
        }
      });
      if (set.size !== beforeSize || !(nextSets[section] instanceof Set)) {
        nextSets[section] = set;
        changed = true;
      }
    });
    if (!changed) {
      return;
    }
    reflectionDiffRef.current = { added: nextSets };
    const highlightMap = {};
    Object.entries(nextSets).forEach(([section, set]) => {
      const entries = set instanceof Set ? Array.from(set) : Array.isArray(set) ? set : [];
      if (entries.length > 0) {
        highlightMap[section] = entries;
      }
    });
    setSummaryHighlights(highlightMap);
  };

  const updateSummaryWithAI = async (latestNote, nextNotes, previousSummary, options = {}) => {
    if (!latestNote) return;
    if (aiControllerRef.current) {
      aiControllerRef.current.abort();
    }

    const { source = "journal", insights = [] } = options ?? {};
    const previousNormalized = normalizeSummary(previousSummary ?? createEmptySummary());

    const controller = new AbortController();
    aiControllerRef.current = controller;
    setIsUpdatingSummary(true);
    setSummaryError(null);

    try {
      const requestBody = {
        content: latestNote,
        summary: previousSummary,
        notes: nextNotes,
      };
      if (Array.isArray(insights) && insights.length > 0) {
        requestBody.insights = insights;
      }
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = "Unable to update notes right now.";
        try {
          const err = await res.json();
          if (err?.error) message = err.error;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const payload = await res.json();
      if (payload?.summary) {
        const normalizedSummary = normalizeSummary(payload.summary);
        if (source === "reflection") {
          const diff = computeSummaryDiff(previousNormalized, normalizedSummary);
          applyReflectionDiff(diff.added);
        } else if (source !== "reflection") {
          // For non-reflection updates, clear reflection-specific highlights.
          setSummaryHighlights((prev) => (Object.keys(prev).length > 0 ? {} : prev));
          reflectionDiffRef.current = { added: {} };
        }
        setSession((prev) => ({
          ...prev,
          summary: normalizedSummary,
        }));
        summaryRef.current = normalizedSummary;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Summary update failed", error);
      setSummaryError(error instanceof Error ? error.message : "Something went wrong while updating notes.");
    } finally {
      if (aiControllerRef.current === controller) {
        aiControllerRef.current = null;
      }
      setIsUpdatingSummary(false);
    }
  };

  const requestReflectionChangeSummary = async () => {
    if (!reflectionBaselineSummaryRef.current) {
      return;
    }
    const highlightSets = reflectionDiffRef.current?.added ?? {};
    const highlightMap = {};
    Object.entries(highlightSets).forEach(([section, set]) => {
      const items = set instanceof Set ? Array.from(set) : Array.isArray(set) ? set : [];
      if (items.length > 0) {
        highlightMap[section] = items;
      }
    });
    if (Object.keys(highlightMap).length === 0) {
      setReflectionChangeSummary("");
      return;
    }

    const rawResponses = Array.isArray(reflectionContextRef.current?.meaningfulResponses)
      ? reflectionContextRef.current.meaningfulResponses
      : [];
    const responseSummaries = rawResponses
      .slice(-8)
      .map((entry) => ({
        response: typeof entry?.response === "string" ? entry.response : typeof entry?.content === "string" ? entry.content : "",
        section:
          (entry?.candidate && typeof entry.candidate.section === "string" && entry.candidate.section.trim()) ||
          (entry?.topic && typeof entry.topic.section === "string" && entry.topic.section.trim()) ||
          "User Reflections",
        value: entry?.candidate?.value ?? "",
      }))
      .filter((entry) => entry.response || entry.value);

    setIsReflectionChangeSummaryLoading(true);
    try {
      const res = await fetch(REFLECTION_CHANGE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          before: reflectionBaselineSummaryRef.current,
          after: summaryRef.current,
          highlights: highlightMap,
          responses: responseSummaries,
        }),
      });
      if (!res.ok) {
        let message = "Unable to summarize the updates right now.";
        try {
          const err = await res.json();
          if (err?.error) {
            message = err.error;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }
      const data = await res.json();
      const summaryText = typeof data?.summary === "string" ? data.summary.trim() : "";
      setReflectionChangeSummary(summaryText);
    } catch (error) {
      console.error("Reflection change summary failed", error);
      setReflectionChangeSummary("");
    } finally {
      setIsReflectionChangeSummaryLoading(false);
    }
  };

  const buildReflectionNotes = (responses) => {
    if (!Array.isArray(responses)) {
      return [];
    }
    return responses
      .map((entry, index) => {
        if (!entry || typeof entry.content !== "string") {
          return null;
        }
        const rawContent = entry.content.trim();
        const topicSection =
          entry.topic && typeof entry.topic.section === "string" ? entry.topic.section.trim() : "";
        const topicLabel = entry.topic && typeof entry.topic.label === "string" ? entry.topic.label.trim() : "";
        const contextParts = [];
        if (topicSection && topicSection !== "General") {
          contextParts.push(topicSection);
        }
        if (topicLabel) {
          contextParts.push(topicLabel);
        }
        if (entry.topic && typeof entry.topic.detail === "string") {
          const detail = entry.topic.detail.trim();
          if (detail && !contextParts.includes(detail)) {
            contextParts.push(detail);
          }
        }
        const contextLabel = contextParts.length > 0 ? contextParts.join(" - ") : "Reflection";
        const candidateValue =
          entry.candidate && typeof entry.candidate.value === "string" ? entry.candidate.value.trim() : "";
        const compactDetail = shortenSentence(rawContent, MAX_REFLECTION_DETAIL_WORDS);
        const fallbackDetail = ensureSentence(compactDetail);
        const contextualFallback =
          contextLabel && contextLabel !== "Reflection"
            ? ensureSentence(`${contextLabel} - ${compactDetail}`)
            : fallbackDetail;
        const noteContent = candidateValue || contextualFallback;
        return {
          id: entry.id || `reflection-${index}`,
          content: noteContent,
          createdAt: entry.createdAt || new Date().toISOString(),
        };
      })
      .filter(Boolean);
  };

  const updateSummaryFromReflection = async (latestEntry, allResponses) => {
    const latestContent = latestEntry && typeof latestEntry.content === "string" ? latestEntry.content.trim() : "";
    if (!latestContent) return;
    const reflectionNotes = buildReflectionNotes(allResponses);
    const combinedNotes = [
      ...session.notes,
      ...reflectionNotes,
    ];
    const latestNotePayload =
      reflectionNotes.find((note) => note.id === latestEntry?.id) ||
      (reflectionNotes.length > 0 ? reflectionNotes[reflectionNotes.length - 1] : null);
    const noteForSummary = latestNotePayload ? latestNotePayload.content : latestContent;
    const candidatesSource = Array.isArray(allResponses) ? allResponses : [];
    const seenInsights = new Set();
    const reflectionInsights = [];
    for (let index = candidatesSource.length - 1; index >= 0 && reflectionInsights.length < 8; index -= 1) {
      const entry = candidatesSource[index];
      const candidate = entry && entry.candidate;
      if (!candidate || !candidate.value) {
        continue;
      }
      const section = typeof candidate.section === "string" && candidate.section.trim() ? candidate.section.trim() : "User Reflections";
      const key = `${section}|${candidate.value}`;
      if (seenInsights.has(key)) {
        continue;
      }
      seenInsights.add(key);
      reflectionInsights.unshift({
        section,
        value: candidate.value,
        preview: candidate.preview,
      });
    }

    await updateSummaryWithAI(noteForSummary, combinedNotes, summaryRef.current, {
      source: "reflection",
      insights: reflectionInsights,
    });
  };

  const concludeReflection = (logEntries, fallbackTopic, addedInsightFlag, meaningfulResponses) => {
    const entries = deriveEntriesFromLog(logEntries, fallbackTopic);
    const proposal = buildWrapupSuggestion(entries, fallbackTopic);
    const closingMessage = ensureSentence(`Thanks for reflecting - sounds like ${proposal}. I'll keep that in your notes.`);
    appendReflectionMessages([createAIReflectionMessage(closingMessage)]);
    setReflectionContext((prev) => {
      const nextState = {
        ...prev,
        stage: REFLECTION_STAGES.COMPLETE,
        addedInsight: entries.length > 0 || addedInsightFlag || prev.addedInsight,
        insightLog: logEntries,
        meaningfulResponses: Array.isArray(meaningfulResponses) ? meaningfulResponses : prev.meaningfulResponses,
      };
      reflectionContextRef.current = nextState;
      return nextState;
    });
    if (reflectionTimerRef.current) {
      clearTimeout(reflectionTimerRef.current);
    }
    reflectionTimerRef.current = setTimeout(() => {
      setFlowStep(FLOW_STATES.COMPLETE);
      reflectionTimerRef.current = null;
    }, 600);
  };

  const summaryAvailable = hasSummaryContent(session.summary);
  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const createdAt = new Date().toISOString();
    const userMessage = { id: safeUuid(), role: "user", content: trimmed, createdAt };
    const previousSummary = summaryRef.current;
    const nextNotes = [
      ...session.notes,
      { id: userMessage.id, content: trimmed, createdAt },
    ];

    setMessages((prev) => [...prev, userMessage]);

    setSession((prev) => ({
      ...prev,
      notes: nextNotes,
    }));

    void updateSummaryWithAI(trimmed, nextNotes, previousSummary);

    setInputValue("");
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    handleSubmit();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleDoneClick = () => {
    if (!sessionCompletedAt) {
      setSessionCompletedAt(new Date().toISOString());
    }
    setFlowStep(FLOW_STATES.SUMMARY);
  };

  const handleBackToJournaling = () => {
    setFlowStep(FLOW_STATES.JOURNALING);
  };

  const handleStartReflection = () => {
    if (reflectionTimerRef.current) {
      clearTimeout(reflectionTimerRef.current);
      reflectionTimerRef.current = null;
    }
    if (reflectionQuestionControllerRef.current) {
      reflectionQuestionControllerRef.current.abort();
      reflectionQuestionControllerRef.current = null;
    }
    reflectionBaselineSummaryRef.current = JSON.parse(JSON.stringify(summaryRef.current ?? createEmptySummary()));
    reflectionDiffRef.current = { added: {} };
    reflectionChangeSummaryRequestRef.current = false;
    setSummaryHighlights({});
    setReflectionChangeSummary("");
    setIsReflectionChangeSummaryLoading(false);
    const topics = extractReflectionTopics(session.summary);
    setReflectionMessages([
      { id: safeUuid(), role: "ai", content: REFLECTION_INTRO_MESSAGE, createdAt: new Date().toISOString() },
    ]);
    setReflectionInput("");
    const initialContext = {
      stage: REFLECTION_STAGES.INTRO,
      topicsQueue: topics,
      currentTopic: null,
      questionIndex: 0,
      userResponses: [],
      lastTopic: null,
      addedInsight: false,
      questionsAsked: [],
      insightLog: [],
      meaningfulResponses: [],
      awaitingContinue: false,
      continuePromptIndex: 0,
    };
    setReflectionContext(initialContext);
    reflectionContextRef.current = initialContext;
    setIsFetchingReflectionQuestion(false);
    setFlowStep(FLOW_STATES.REFLECTION);
  };

  const handleFinishSession = () => {};

  const handleStartNewNoteFlow = () => {
    if (reflectionTimerRef.current) {
      clearTimeout(reflectionTimerRef.current);
      reflectionTimerRef.current = null;
    }
    if (reflectionQuestionControllerRef.current) {
      reflectionQuestionControllerRef.current.abort();
      reflectionQuestionControllerRef.current = null;
    }
    setIsFetchingReflectionQuestion(false);
    reflectionDiffRef.current = { added: {} };
    reflectionChangeSummaryRequestRef.current = false;
    setSummaryHighlights({});
    setReflectionChangeSummary("");
    setIsReflectionChangeSummaryLoading(false);
    setFlowStep(FLOW_STATES.JOURNALING);
  };

  const appendReflectionMessages = (newMessages) => {
    if (!newMessages || newMessages.length === 0) return;
    setReflectionMessages((prev) => [...prev, ...newMessages]);
  };

  const createAIReflectionMessage = (content) => ({
    id: safeUuid(),
    role: "ai",
    content,
    createdAt: new Date().toISOString(),
  });

  const askQuestionForTopic = async (topic, questionIndex) => {
    if (!topic) {
      return;
    }

    if (reflectionQuestionControllerRef.current) {
      reflectionQuestionControllerRef.current.abort();
    }

    const controller = new AbortController();
    reflectionQuestionControllerRef.current = controller;
    setIsFetchingReflectionQuestion(true);
    const contextSnapshot = reflectionContextRef.current;

    try {
      const question = await requestReflectionQuestion({
        summary: summaryRef.current,
        topic,
        questionIndex,
        userResponses: contextSnapshot.userResponses,
        askedQuestions: (contextSnapshot.questionsAsked ?? []).map((entry) => entry.prompt),
        signal: controller.signal,
      });

      appendReflectionMessages([createAIReflectionMessage(question)]);
      setReflectionContext((prev) => {
        const nextState = {
          ...prev,
          stage: REFLECTION_STAGES.QUESTION,
          currentTopic: topic,
          questionIndex: questionIndex + 1,
          lastTopic: topic,
          questionsAsked: [
            ...(prev.questionsAsked ?? []),
            { topicId: topic.id, prompt: question, index: questionIndex },
          ],
          awaitingContinue: false,
        };
        reflectionContextRef.current = nextState;
        return nextState;
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Reflection question error:", error);
      appendReflectionMessages([
        createAIReflectionMessage(
          "I'm hitting a snag coming up with the next question right now. Want to tell me anything else that stood out while I reset?",
        ),
      ]);
      setReflectionContext((prev) => {
        const nextState = {
          ...prev,
          stage: REFLECTION_STAGES.QUESTION,
          currentTopic: topic,
          awaitingContinue: false,
        };
        reflectionContextRef.current = nextState;
        return nextState;
      });
    } finally {
      if (reflectionQuestionControllerRef.current === controller) {
        reflectionQuestionControllerRef.current = null;
      }
      setIsFetchingReflectionQuestion(false);
    }
  };

  const launchTopicQuestion = (topicCandidate, remainingQueue, startIndex = 0, overrides = {}) => {
    const topic = topicCandidate ?? buildGeneralReflectionTopic();
    setReflectionContext((prev) => {
      const nextState = {
        ...prev,
        ...overrides,
        stage: REFLECTION_STAGES.QUESTION,
        topicsQueue: Array.isArray(remainingQueue) ? remainingQueue : prev.topicsQueue,
        currentTopic: topic,
        questionIndex: startIndex,
        lastTopic: topic,
        awaitingContinue: false,
      };
      reflectionContextRef.current = nextState;
      return nextState;
    });
    void askQuestionForTopic(topic, startIndex);
  };

  const promptForNextTopic = (lastTopicSnapshot, overrides = {}) => {
    const queue = Array.isArray(overrides.topicsQueue)
      ? overrides.topicsQueue
      : Array.isArray(reflectionContextRef.current?.topicsQueue)
        ? reflectionContextRef.current.topicsQueue
        : [];
    const remainingCount = queue.length;
    const baseContext = reflectionContextRef.current;
    const baseIndex =
      typeof overrides.continuePromptIndex === "number"
        ? overrides.continuePromptIndex
        : typeof baseContext?.continuePromptIndex === "number"
          ? baseContext.continuePromptIndex
          : 0;
    const promptIndex = CONTINUE_PROMPTS.length > 0 ? baseIndex % CONTINUE_PROMPTS.length : 0;
    const promptMessage = buildContinuePromptMessage(
      lastTopicSnapshot || baseContext?.lastTopic,
      remainingCount,
      promptIndex,
    );
    const nextPromptIndex = CONTINUE_PROMPTS.length > 0 ? (promptIndex + 1) % CONTINUE_PROMPTS.length : promptIndex;
    appendReflectionMessages([createAIReflectionMessage(promptMessage)]);
    setReflectionContext((prev) => {
      const nextState = {
        ...prev,
        ...overrides,
        stage: REFLECTION_STAGES.CONTINUE_PROMPT,
        awaitingContinue: true,
        currentTopic: null,
        questionIndex: 0,
        lastTopic: lastTopicSnapshot || prev.lastTopic,
        continuePromptIndex: nextPromptIndex,
      };
      reflectionContextRef.current = nextState;
      return nextState;
    });
  };

  const handleExitReflection = () => {
    if (reflectionTimerRef.current) {
      clearTimeout(reflectionTimerRef.current);
      reflectionTimerRef.current = null;
    }
    if (reflectionQuestionControllerRef.current) {
      reflectionQuestionControllerRef.current.abort();
      reflectionQuestionControllerRef.current = null;
    }
    setIsFetchingReflectionQuestion(false);
    setFlowStep(FLOW_STATES.SUMMARY);
  };

  const processReflectionTurn = (userMessage) => {
    const rawContent = userMessage && typeof userMessage.content === "string" ? userMessage.content : "";
    const trimmed = rawContent.trim();
    if (!trimmed) {
      return;
    }

    if (isFetchingReflectionQuestion) {
      return;
    }

    const messageRecord = {
      id: userMessage?.id || safeUuid(),
      content: trimmed,
      createdAt: userMessage?.createdAt || new Date().toISOString(),
    };

    const context = reflectionContext;

    if (context.stage === REFLECTION_STAGES.INTRO) {
      if (isNegativeResponse(trimmed)) {
        const fallbackTopic = context.lastTopic || context.currentTopic;
        const logEntries = Array.isArray(context.insightLog) ? [...context.insightLog] : [];
        concludeReflection(logEntries, fallbackTopic, context.addedInsight, context.meaningfulResponses);
        return;
      }
      const { topic, remaining } = pickNextTopic(context);
      launchTopicQuestion(topic, remaining, 0, {
        userResponses: [],
        insightLog: [],
        meaningfulResponses: [],
        awaitingContinue: false,
      });
      return;
    }

    if (context.stage === REFLECTION_STAGES.QUESTION) {
      if (isNegativeResponse(trimmed)) {
        const fallbackTopic = context.lastTopic || context.currentTopic;
        const logEntries = Array.isArray(context.insightLog) ? [...context.insightLog] : [];
        concludeReflection(logEntries, fallbackTopic, context.addedInsight, context.meaningfulResponses);
        return;
      }

      const meaningful = !isVagueResponse(trimmed);
      const updatedUserResponses = meaningful ? [...context.userResponses, trimmed] : context.userResponses;
      let updatedLog = Array.isArray(context.insightLog) ? [...context.insightLog] : [];
      let updatedMeaningfulResponses = Array.isArray(context.meaningfulResponses)
        ? [...context.meaningfulResponses]
        : [];

      if (meaningful) {
        const candidateEntry = createCandidateEntry(trimmed, context.currentTopic);
        const responseRecord = {
          id: messageRecord.id,
          content: trimmed,
          createdAt: messageRecord.createdAt,
          topic: context.currentTopic,
          candidate: candidateEntry,
          response: trimmed,
        };
        updatedLog = [...updatedLog, responseRecord];
        updatedMeaningfulResponses = [...updatedMeaningfulResponses, responseRecord];
        void updateSummaryFromReflection(responseRecord, updatedMeaningfulResponses);
      } else {
        updatedLog = [
          ...updatedLog,
          {
            response: trimmed,
            topic: context.currentTopic,
            candidate: null,
            createdAt: messageRecord.createdAt,
          },
        ];
      }

      const updatedContextSnapshot = {
        ...context,
        userResponses: updatedUserResponses,
        insightLog: updatedLog,
        meaningfulResponses: updatedMeaningfulResponses,
      };
      reflectionContextRef.current = updatedContextSnapshot;

      if (!meaningful) {
        setReflectionContext((prev) => {
          const nextState = {
            ...prev,
            userResponses: updatedUserResponses,
            insightLog: updatedLog,
            meaningfulResponses: updatedMeaningfulResponses,
          };
          reflectionContextRef.current = nextState;
          return nextState;
        });
        void askQuestionForTopic(context.currentTopic ?? buildGeneralReflectionTopic(), context.questionIndex);
        return;
      }

      setReflectionContext((prev) => {
        const nextState = {
          ...prev,
          userResponses: updatedUserResponses,
          insightLog: updatedLog,
          meaningfulResponses: updatedMeaningfulResponses,
        };
        reflectionContextRef.current = nextState;
        return nextState;
      });

      if (context.questionIndex < MAX_TOPIC_QUESTIONS) {
        void askQuestionForTopic(context.currentTopic ?? buildGeneralReflectionTopic(), context.questionIndex);
        return;
      }

      const remainingQueue = Array.isArray(context.topicsQueue) ? [...context.topicsQueue] : [];
      promptForNextTopic(context.currentTopic ?? context.lastTopic, {
        userResponses: updatedUserResponses,
        insightLog: updatedLog,
        meaningfulResponses: updatedMeaningfulResponses,
        topicsQueue: remainingQueue,
      });
      return;
    }

    if (context.stage === REFLECTION_STAGES.CONTINUE_PROMPT) {
      if (isNegativeResponse(trimmed)) {
        const fallbackTopic = context.lastTopic || context.currentTopic;
        const logEntries = Array.isArray(context.insightLog) ? [...context.insightLog] : [];
        concludeReflection(logEntries, fallbackTopic, context.addedInsight, context.meaningfulResponses);
        return;
      }

      const queue = Array.isArray(context.topicsQueue) ? [...context.topicsQueue] : [];
      const searchValueBase = stripAffirmationPrefix(trimmed);
      const searchValue = searchValueBase || trimmed;
      const matchedTopic = findTopicMatchFromMessage(searchValue, queue);
      const adHocTopic = matchedTopic ? null : createAdHocTopicFromInput(searchValue);
      const fallbackTopicForRecord =
        context.currentTopic || context.lastTopic || buildGeneralReflectionTopic();
      const responseTopic = (matchedTopic && matchedTopic.topic) || adHocTopic || fallbackTopicForRecord;

      const meaningful = !isVagueResponse(trimmed);
      const updatedUserResponses = meaningful ? [...context.userResponses, trimmed] : context.userResponses;
      let updatedLog = Array.isArray(context.insightLog) ? [...context.insightLog] : [];
      let updatedMeaningfulResponses = Array.isArray(context.meaningfulResponses)
        ? [...context.meaningfulResponses]
        : [];

      if (meaningful) {
        const candidateEntry = createCandidateEntry(trimmed, responseTopic);
        const responseRecord = {
          id: messageRecord.id,
          content: trimmed,
          createdAt: messageRecord.createdAt,
          topic: responseTopic,
          candidate: candidateEntry,
          response: trimmed,
        };
        updatedLog = [...updatedLog, responseRecord];
        updatedMeaningfulResponses = [...updatedMeaningfulResponses, responseRecord];
        void updateSummaryFromReflection(responseRecord, updatedMeaningfulResponses);
      } else {
        updatedLog = [
          ...updatedLog,
          {
            response: trimmed,
            topic: responseTopic,
            candidate: null,
            createdAt: messageRecord.createdAt,
          },
        ];
      }

      const nextContext = {
        ...context,
        userResponses: updatedUserResponses,
        insightLog: updatedLog,
        meaningfulResponses: updatedMeaningfulResponses,
      };
      reflectionContextRef.current = nextContext;
      setReflectionContext(nextContext);

      const overrides = {
        userResponses: updatedUserResponses,
        insightLog: updatedLog,
        meaningfulResponses: updatedMeaningfulResponses,
      };

      if (matchedTopic) {
        launchTopicQuestion(matchedTopic.topic, matchedTopic.remaining, 0, overrides);
        return;
      }

      if (adHocTopic) {
        launchTopicQuestion(adHocTopic, queue, 0, overrides);
        return;
      }

      if (isAffirmativeResponse(trimmed)) {
        if (queue.length > 0) {
          const [nextTopic, ...remaining] = queue;
          launchTopicQuestion(nextTopic, remaining, 0, overrides);
          return;
        }
        launchTopicQuestion(buildGeneralReflectionTopic(), queue, 0, overrides);
        return;
      }

      if (queue.length > 0) {
        const [fallbackTopic, ...remaining] = queue;
        launchTopicQuestion(fallbackTopic, remaining, 0, overrides);
        return;
      }

      launchTopicQuestion(buildGeneralReflectionTopic(), [], 0, overrides);
      return;
    }

    if (context.stage !== REFLECTION_STAGES.COMPLETE) {
      const fallbackTopic = context.lastTopic || context.currentTopic;
      const logEntries = Array.isArray(context.insightLog) ? [...context.insightLog] : [];
      concludeReflection(logEntries, fallbackTopic, context.addedInsight, context.meaningfulResponses);
    }
  };
  const handleReflectionSubmit = () => {
    const trimmed = reflectionInput.trim();
    if (!trimmed) return;
    if (isFetchingReflectionQuestion) return;

    const userMessage = {
      id: safeUuid(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    appendReflectionMessages([userMessage]);
    setReflectionInput("");
    processReflectionTurn(userMessage);
  };

  const handleReflectionFormSubmit = (event) => {
    event.preventDefault();
    handleReflectionSubmit();
  };

  const handleReflectionKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleReflectionSubmit();
    }
  };

  if (flowStep === FLOW_STATES.SUMMARY) {
    return (
      <NoteSummaryScreen
        session={session}
        completedAt={sessionCompletedAt}
        onBack={handleBackToJournaling}
        onReflect={handleStartReflection}
        onFinish={handleFinishSession}
        highlights={summaryHighlights}
      />
    );
  }

  if (flowStep === FLOW_STATES.REFLECTION) {
    return (
      <div className="flex h-screen flex-col bg-[var(--color-page)] text-[var(--color-text-main)]">
        <header className="sticky top-0 z-30 border-b border-[var(--color-accent-subtle)] bg-[var(--color-text-on-accent)] px-6 py-5">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
            <button
              type="button"
              onClick={handleExitReflection}
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-accent)] transition hover:text-[var(--color-accent-hover)]"
            >
              <BackArrowIcon />
              <span>Back</span>
            </button>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wide text-[var(--color-secondary)]">Reflection</div>
              <div className="text-xl font-medium text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-h2)" }}>
                {session.chapterTitle}
              </div>
            </div>
            <div className="w-12" />
          </div>
        </header>
        <main ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-36 pt-8">
          <div className="mx-auto max-w-3xl">
            {reflectionMessages.map((message) => (
              <NoteMessage key={message.id} message={message} />
            ))}
            {isFetchingReflectionQuestion ? <TypingIndicator /> : null}
          </div>
        </main>
        <div className="sticky bottom-0 z-30 border-t border-[var(--color-surface)] bg-[var(--color-page)] px-0">
          {summaryAvailable ? (
            <button
              type="button"
              onClick={() => setShowSummary((prev) => !prev)}
              className="flex w-full items-center justify-center gap-2 border-b border-[var(--color-surface)] bg-[var(--color-page)] px-4 py-2 text-sm font-medium text-[var(--color-text-main)] transition hover:text-[var(--color-text-accent)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdatingSummary}
            >
              <span>See Notes</span>
              <ChevronDown open={showSummary} />
            </button>
          ) : isUpdatingSummary ? (
            <div className="flex w-full items-center justify-center border-b border-[var(--color-surface)] bg-[var(--color-page)] px-4 py-2 text-sm font-medium text-[var(--color-secondary)]">
              <span>Collecting your notes...</span>
            </div>
          ) : null}
          <footer className="px-0 pb-6 pt-3">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4">
              {summaryError ? <div className="text-xs text-red-500">{summaryError}</div> : null}
              <form onSubmit={handleReflectionFormSubmit} className="flex items-end gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2">
                <textarea
                  value={reflectionInput}
                  onChange={(event) => setReflectionInput(event.target.value)}
                  onKeyDown={handleReflectionKeyDown}
                  rows={1}
                  disabled={isFetchingReflectionQuestion}
                  placeholder={isFetchingReflectionQuestion ? "Give me a second..." : "What are you thinking?"}
                  className={`h-12 flex-1 resize-none bg-transparent text-sm leading-6 text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)] ${isFetchingReflectionQuestion ? "cursor-not-allowed opacity-60" : ""}`}
                />
                <button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-text-on-accent)] transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                  disabled={!reflectionInput.trim() || isFetchingReflectionQuestion}
                  aria-label="Send reflection"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3.75 3.75l12.5 6.25-12.5 6.25 2.5-6.25-2.5-6.25z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </footer>
        </div>
        <SummarySheet
          open={showSummary && summaryAvailable}
          onClose={() => setShowSummary(false)}
          session={session}
          highlights={summaryHighlights}
        />
      </div>
    );
  }

  if (flowStep === FLOW_STATES.COMPLETE) {
    return (
      <ReflectionCompleteScreen
        session={session}
        completedAt={sessionCompletedAt}
        onBackToBook={handleFinishSession}
        onStartNewNote={handleStartNewNoteFlow}
        highlights={summaryHighlights}
        changeSummary={reflectionChangeSummary}
        isChangeSummaryLoading={isReflectionChangeSummaryLoading}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--color-page)] text-[var(--color-text-main)]">
      {/* Top app bar with session context and completion affordance */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-accent-subtle)] bg-[var(--color-text-on-accent)] px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <div className="text-xs text-[var(--color-secondary)]">{session.bookTitle}</div>
            <div className="text-2xl font-medium" style={{ fontFamily: "var(--font-h2)" }}>
              {session.chapterTitle}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDoneClick}
            className="text-sm font-medium text-[var(--color-text-accent)] transition hover:text-[var(--color-accent-hover)]"
          >
            Done
          </button>
        </div>
      </header>

      {/* Scrollable transcript area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-40 pt-8">
        <div className="mx-auto max-w-3xl">
          {messages.map((message) => (
            <NoteMessage key={message.id} message={message} />
          ))}
        </div>
      </main>
      {/* Ribbon toggle for opening the structured summary + composer kept fixed */}
      <div className="sticky bottom-0 z-30 border-t border-[var(--color-surface)] bg-[var(--color-page)] px-0">
        {summaryAvailable ? (
          <button
            type="button"
            onClick={() => setShowSummary((prev) => !prev)}
            className="flex w-full items-center justify-center gap-2 border-b border-[var(--color-surface)] bg-[var(--color-page)] px-4 py-2 text-sm font-medium text-[var(--color-text-main)] transition hover:text-[var(--color-text-accent)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUpdatingSummary}
          >
            <span>See Notes</span>
            <ChevronDown open={showSummary} />
          </button>
        ) : isUpdatingSummary ? (
          <div className="flex w-full items-center justify-center border-b border-[var(--color-surface)] bg-[var(--color-page)] px-4 py-2 text-sm font-medium text-[var(--color-secondary)]">
            <span>Collecting your notes...</span>
          </div>
        ) : null}
        <footer className="px-0 pb-6 pt-3">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4">
            {/* Error state when summary refresh fails */}
            {summaryError ? (
              <div className="text-xs text-red-500">{summaryError}</div>
            ) : null}

            {/* Composer layout: attachment button + message form */}
            <div className="flex items-end gap-2">
              {/* Placeholder action for future attachments */}
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-surface)] text-xl text-[var(--color-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                aria-label="Add attachment"
              >
                +
              </button>
              {/* Message input and submit affordance */}
              <form onSubmit={handleFormSubmit} className="flex flex-1 items-end gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2">
                <textarea
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="What's on your mind?"
                  className="h-10 flex-1 resize-none bg-transparent text-sm leading-6 text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)]"
                />
                <button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-text-on-accent)] transition hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                  disabled={!inputValue.trim()}
                  aria-label="Send note"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3.75 3.75l12.5 6.25-12.5 6.25 2.5-6.25-2.5-6.25z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </footer>
      </div>

      <SummarySheet
        open={showSummary && summaryAvailable}
        onClose={() => setShowSummary(false)}
        session={session}
        highlights={summaryHighlights}
      />
    </div>
  );
}
