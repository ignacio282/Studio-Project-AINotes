"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const AI_ENDPOINT =
  process.env.NEXT_PUBLIC_AI_ENDPOINT || "/api/ai-reply";

// Initial assistant greeting shown in the chat transcript
const INTRO_MESSAGE = `Hey, I'm here to help you keep track of what's happening in your book. Just send me anything that feels important, confusing, or surprising as you go.
You could tell me:
- What characters are showing up
- Where the action is happening
- How people relate to each other
- Any plot twists or emotional moments

I'll help organize your thoughts into something clean and useful. And if you want, I can also suggest what else you might want to note - but only if you ask.

Ready when you are.`;

// One-time reminder the assistant injects when tags are missing
const TAG_REMINDER_MESSAGE = `Hey, sorry to interrupt - I noticed you're writing about some characters.
Next time, you can tag them like this: '@Darrow', '$Mars', or '#Betrayal' - that way, they'll be linked to their bios and story arcs later.
You don't need to go back and change anything now, just something to keep in mind.`;

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
};

// Builds the blank structured summary returned from the API
function createEmptySummary() {
  return {
    summary: [],
    characters: [],
    setting: [],
    relationships: [],
    reflections: [],
  };
}

// Generates message IDs using crypto when available
function safeUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

// Normalizes summary payloads coming back from the server
function normalizeSummary(raw) {
  const ensureList = (value) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
      : [];

  if (!raw || typeof raw !== "object") {
    return createEmptySummary();
  }

  return {
    summary: ensureList(raw.summary),
    characters: ensureList(raw.characters),
    setting: ensureList(raw.setting),
    relationships: ensureList(raw.relationships),
    reflections: ensureList(raw.reflections),
  };
}

// Light heuristic for deciding when to surface the tag reminder
function shouldSendTagReminder(note) {
  if (/[#@$]/.test(note)) return false;
  const properNouns = note.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g);
  if (!properNouns) return false;
  const uniqueProper = new Set(
    properNouns
      .map((name) => name.trim())
      .filter((name) => !["I", "The", "A"].includes(name)),
  );
  return uniqueProper.size >= 2;
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

function hasSummaryContent(summary) {
  if (!summary) return false;
  const lists = [
    summary.summary,
    summary.characters,
    summary.setting,
    summary.relationships,
    summary.reflections,
  ];
  return lists.some((items) => Array.isArray(items) && items.length > 0);
}

// Reusable block for each section inside the summary drawer
function SummaryCategory({ title, items, placeholder, showWhenEmpty = false }) {
  const hasItems = Array.isArray(items) && items.length > 0;
  if (!hasItems && !showWhenEmpty) {
    return null;
  }

  const icon = SUMMARY_ICONS[title] ?? null;
  // Summary stays paragraph-style; other sections switch to bullet points
  const listClass = title === "Summary" ? "space-y-2" : "list-disc space-y-2 pl-5";

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-main)]">
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span>{title}</span>
      </div>
      {hasItems ? (
        <ul className={`mt-4 ${listClass} text-sm leading-6 text-[var(--color-text-main)]`}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 text-sm text-[var(--color-text-disabled)]">{placeholder}</div>
      )}
    </section>
  );
}

// Slide-up panel that shows the structured notes summary
function SummarySheet({ open, onClose, session }) {
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
                <div className="space-y-6">
                <SummaryCategory
                  title="Summary"
                  items={session.summary.summary}
                  placeholder="You'll see a summary here once you've written more notes."
                  showWhenEmpty
                />
                <SummaryCategory
                  title="Characters"
                  items={session.summary.characters}
                />
                <SummaryCategory
                  title="Setting"
                  items={session.summary.setting}
                />
                <SummaryCategory
                  title="Relationships"
                  items={session.summary.relationships}
                />
                <SummaryCategory
                  title="User Reflections"
                  items={session.summary.reflections}
                />
                </div>
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
  const [hasTagReminder, setHasTagReminder] = useState(false);
  const [isUpdatingSummary, setIsUpdatingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const scrollRef = useRef(null);
  const aiControllerRef = useRef(null);
  const summaryRef = useRef(session.summary);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showSummary]);

  useEffect(() => {
    summaryRef.current = session.summary;
  }, [session.summary]);

  useEffect(() => {
    if (!hasSummaryContent(session.summary)) {
      setShowSummary(false);
    }
  }, [session.summary]);

  useEffect(() => {
    return () => {
      if (aiControllerRef.current) {
        aiControllerRef.current.abort();
      }
    };
  }, []);

  const updateSummaryWithAI = async (latestNote, nextNotes, previousSummary) => {
    if (!latestNote) return;
    if (aiControllerRef.current) {
      aiControllerRef.current.abort();
    }

    const controller = new AbortController();
    aiControllerRef.current = controller;
    setIsUpdatingSummary(true);
    setSummaryError(null);

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: latestNote,
          summary: previousSummary,
          notes: nextNotes,
        }),
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
        setSession((prev) => ({
          ...prev,
          summary: normalizeSummary(payload.summary),
        }));
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

  const summaryAvailable = hasSummaryContent(session.summary);
  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const createdAt = new Date().toISOString();
    const userMessage = { id: safeUuid(), role: "user", content: trimmed, createdAt };
    const needsReminder = !hasTagReminder && shouldSendTagReminder(trimmed);
    const previousSummary = summaryRef.current;
    const nextNotes = [
      ...session.notes,
      { id: userMessage.id, content: trimmed, createdAt },
    ];

    setMessages((prev) => {
      const nextMessages = [...prev, userMessage];
      if (needsReminder) {
        nextMessages.push({ id: safeUuid(), role: "ai", content: TAG_REMINDER_MESSAGE, createdAt: new Date().toISOString() });
      }
      return nextMessages;
    });

    setSession((prev) => ({
      ...prev,
      notes: nextNotes,
    }));

    void updateSummaryWithAI(trimmed, nextNotes, previousSummary);

    if (needsReminder) {
      setHasTagReminder(true);
    }

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

      <SummarySheet open={showSummary && summaryAvailable} onClose={() => setShowSummary(false)} session={session} />
    </div>
  );
}
