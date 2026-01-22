"use client";

import { useEffect, useRef, useState } from "react";

function safeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

function ChatMessage({ message, onAction }) {
  const isAssistant = message.role === "assistant";
  const alignment = isAssistant ? "justify-start" : "justify-end";
  const bubbleClass = isAssistant
    ? "bg-transparent text-[var(--color-text-main)]"
    : "bg-[var(--color-surface)] text-[var(--color-text-main)]";
  const actions = Array.isArray(message.actions)
    ? message.actions.filter((action) => action && typeof action.label === "string")
    : [];

  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${bubbleClass}`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
        {isAssistant && actions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.id || action.label}
                type="button"
                onClick={() => onAction && onAction(action)}
                className="rounded-full bg-[var(--color-accent-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-accent)] transition hover:bg-[var(--color-accent-subtle)]/80"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-secondary)]">
        Thinking...
      </div>
    </div>
  );
}

export default function BookAssistantChat({ bookId, bookTitle }) {
  const [messages, setMessages] = useState(() => [
    {
      id: safeId(),
      role: "assistant",
      content: `I am your book assistant for ${bookTitle || "this book"}. Ask me about characters, places, or moments based on your notes so far.`,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState(null);
  const [promptResponse, setPromptResponse] = useState("");
  const [promptError, setPromptError] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const createEmptySummary = () => ({
    summary: [],
    characters: [],
    setting: [],
    relationships: [],
    reflections: [],
    extras: [],
  });

  const findLatestSummary = (notes, excludeId) => {
    if (!Array.isArray(notes)) return createEmptySummary();
    for (let idx = notes.length - 1; idx >= 0; idx -= 1) {
      const note = notes[idx];
      if (!note || note.id === excludeId) continue;
      const ai = note.ai_summary;
      if (ai && typeof ai === "object") {
        return ai;
      }
    }
    return createEmptySummary();
  };

  const upsertSummaryForPromptedNote = async (noteId, content, chapterNumber) => {
    const listRes = await fetch(
      `/api/notes?bookId=${encodeURIComponent(bookId)}&chapterNumber=${encodeURIComponent(chapterNumber)}`,
    );
    if (!listRes.ok) return;
    const listPayload = await listRes.json();
    const notes = Array.isArray(listPayload?.notes) ? listPayload.notes : [];
    const previousSummary = findLatestSummary(notes, noteId);

    const aiRes = await fetch("/api/ai-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        summary: previousSummary,
        notes: notes.map((note) => ({
          id: note.id,
          content: note.content,
          createdAt: note.created_at,
        })),
      }),
    });
    if (!aiRes.ok) return;
    const aiPayload = await aiRes.json();
    if (!aiPayload?.summary) return;

    await fetch(`/api/notes/${noteId}/summary`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiSummary: aiPayload.summary }),
    });
  };

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { id: safeId(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) {
        let message = "Unable to reach the assistant right now.";
        try {
          const payload = await res.json();
          if (payload?.error) message = payload.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      const payload = await res.json();
      const answer = typeof payload?.answer === "string" ? payload.answer.trim() : "";
      const actions = Array.isArray(payload?.actions) ? payload.actions : [];
      if (!answer) {
        throw new Error("The assistant did not return a reply.");
      }
      setMessages((prev) => [
        ...prev,
        { id: safeId(), role: "assistant", content: answer, actions },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: "assistant",
          content: "I hit a snag while checking your notes. Try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleAction = (action) => {
    if (!action || action.id !== "prompt-note") return;
    setPromptDraft(action);
    setPromptResponse("");
    setPromptError("");
    setPromptOpen(true);
  };

  const handlePromptSave = async () => {
    if (!promptDraft) return;
    const trimmed = promptResponse.trim();
    if (!trimmed) {
      setPromptError("Please add a quick note before saving.");
      return;
    }
    setPromptSaving(true);
    setPromptError("");
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/prompted-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterNumber: promptDraft.chapterNumber,
          content: trimmed,
          prompt: {
            title: promptDraft?.prompt?.title,
            context: promptDraft?.prompt?.context,
            questions: promptDraft?.prompt?.questions,
            topic: promptDraft?.topic,
          },
        }),
      });
      if (!res.ok) {
        let message = "Unable to save that note.";
        try {
          const payload = await res.json();
          if (payload?.error) message = payload.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      const payload = await res.json();
      if (payload?.noteId) {
        await upsertSummaryForPromptedNote(payload.noteId, trimmed, promptDraft.chapterNumber);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: safeId(),
          role: "assistant",
          content: "Got it. I added that to your notes and folded it into the book memory.",
        },
      ]);
      setPromptOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save that note.";
      setPromptError(message);
    } finally {
      setPromptSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-2xl bg-[var(--color-page)]">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-[var(--color-surface)] p-4"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} onAction={handleAction} />
        ))}
        {isLoading ? <TypingIndicator /> : null}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        {error ? <div className="text-xs text-red-500">{error}</div> : null}
        <div className="flex items-end gap-2 rounded-xl bg-[var(--color-surface)] px-3 py-2">
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask about a character, place, or moment..."
            className="h-10 flex-1 resize-none bg-transparent text-sm leading-6 text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)]"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-text-on-accent)] transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send question"
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
        </div>
      </form>

      {promptOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--color-page)] p-5 text-[var(--color-text-main)] shadow-xl">
            <div className="text-sm text-[var(--color-secondary)]">Prompted note</div>
            <div className="mt-1 text-xl font-semibold" style={{ fontFamily: "var(--font-h2)" }}>
              {promptDraft?.prompt?.title || "Add a note"}
            </div>
            {promptDraft?.chapterNumber ? (
              <div className="mt-1 text-xs text-[var(--color-secondary)]">
                Chapter {promptDraft.chapterNumber}
              </div>
            ) : null}

            {promptDraft?.prompt?.context ? (
              <div className="mt-3 rounded-xl bg-[var(--color-surface)] p-3 text-sm text-[var(--color-secondary)]">
                {promptDraft.prompt.context}
              </div>
            ) : null}

            {Array.isArray(promptDraft?.prompt?.questions) && promptDraft.prompt.questions.length > 0 ? (
              <div className="mt-4 space-y-2 text-sm">
                {promptDraft.prompt.questions.map((question, index) => (
                  <div key={`${question}-${index}`} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    <span>{question}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 rounded-xl bg-[var(--color-surface)] px-3 py-2">
              <textarea
                value={promptResponse}
                onChange={(event) => setPromptResponse(event.target.value)}
                rows={4}
                placeholder="Write a few lines..."
                className="w-full resize-none bg-transparent text-sm leading-6 text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)]"
              />
            </div>

            {promptError ? <div className="mt-2 text-xs text-red-500">{promptError}</div> : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPromptOpen(false)}
                className="rounded-full px-4 py-2 text-sm text-[var(--color-secondary)]"
                disabled={promptSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromptSave}
                className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-on-accent)] transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={promptSaving}
              >
                {promptSaving ? "Saving..." : "Save note"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
