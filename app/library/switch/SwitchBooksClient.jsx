"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function BookCard({ book, isCurrent, onSelect, isSubmitting }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isCurrent || isSubmitting}
      className={`relative w-full rounded-3xl px-5 py-4 text-left ${
        isCurrent
          ? "border-4 border-[var(--color-accent)] bg-[var(--color-surface)]"
          : "border border-transparent bg-[var(--color-surface)]"
      } ${isSubmitting ? "opacity-60" : ""}`}
    >
      {isCurrent ? (
        <span className="absolute -top-4 right-8 rounded-full bg-[var(--color-accent)] px-4 py-1 text-[14px] leading-5 text-[var(--color-text-on-accent)]">
          Currently reading
        </span>
      ) : null}

      <div className="flex items-center gap-4">
        <div className="h-28 w-20 overflow-hidden rounded-xl bg-white/70">
          {book?.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-secondary)]">
              No cover
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[24px] leading-8 font-medium text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-h2)" }}>
            {book?.title || "Untitled"}
          </div>
          <div className="truncate text-[14px] leading-[22px] text-[var(--color-secondary)]">
            By {book?.author || "Unknown author"}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function SwitchBooksClient({ currentBookId = "", books = [] }) {
  const router = useRouter();
  const [submittingId, setSubmittingId] = useState("");
  const [error, setError] = useState("");

  const handleSelect = async (bookId) => {
    if (!bookId || submittingId) return;
    setSubmittingId(bookId);
    setError("");
    try {
      const response = await fetch("/api/books/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (!response.ok) {
        let message = "Unable to switch current book.";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string" && payload.error.trim()) {
            message = payload.error;
          }
        } catch {}
        throw new Error(message);
      }

      try {
        localStorage.setItem("rc.currentBookId", bookId);
      } catch {
        // ignore storage access errors
      }

      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch current book.");
      setSubmittingId("");
    }
  };

  return (
    <div className="space-y-4">
      {books.map((book) => {
        const isCurrent = book.id === currentBookId;
        return (
          <BookCard
            key={book.id}
            book={book}
            isCurrent={isCurrent}
            onSelect={() => handleSelect(book.id)}
            isSubmitting={Boolean(submittingId) && submittingId === book.id}
          />
        );
      })}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
