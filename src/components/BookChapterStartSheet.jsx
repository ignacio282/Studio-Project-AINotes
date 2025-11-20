"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export default function BookChapterStartSheet({
  bookId,
  bookTitle,
  totalChapters,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);

  const hasValidBook =
    typeof bookId === "string" && bookId.trim().length > 0;

  const chapters = useMemo(() => {
    const n =
      typeof totalChapters === "number" && Number.isFinite(totalChapters)
        ? Math.floor(totalChapters)
        : 0;
    if (n <= 0) return [];
    return Array.from({ length: n }, (_, idx) => idx + 1);
  }, [totalChapters]);

  const handleClose = () => {
    setOpen(false);
    setSelectedChapter(null);
  };

  const handleStart = () => {
    if (!hasValidBook || !selectedChapter) return;
    const params = new URLSearchParams();
    params.set("chapter", String(selectedChapter));
    const safeBookTitle =
      typeof bookTitle === "string" && bookTitle.trim().length > 0
        ? bookTitle.trim()
        : "";
    if (safeBookTitle) {
      params.set("bookTitle", safeBookTitle);
    }
    params.set("chapterTitle", `Chapter ${selectedChapter}`);
    router.push(
      `/books/${encodeURIComponent(bookId)}/journal?${params.toString()}`,
    );
  };

  const startDisabled = !selectedChapter || !hasValidBook;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hasValidBook}
        className="block w-full rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-center text-[var(--color-text-on-accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Write a note
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-40 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Close chapter selection"
              className="absolute inset-0 bg-black/30"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Sheet */}
            <motion.div
              className="relative z-10 w-full max-w-2xl rounded-t-3xl bg-[var(--color-text-on-accent)] px-4 pb-6 pt-4 shadow-xl"
              initial={{ y: 320 }}
              animate={{ y: 0 }}
              exit={{ y: 320 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="mx-auto h-1 w-12 rounded-full bg-[var(--color-secondary)]/50" />

              <section className="mt-4 rounded-2xl bg-[var(--color-surface)] p-4">
                <div className="text-sm font-medium text-[var(--color-text-main)]">
                  What chapter are you going to read?
                </div>
                <div className="mt-3 max-h-60 overflow-y-auto rounded-xl bg-[var(--color-page)]">
                  {chapters.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[var(--color-secondary)]">
                      Add the number of chapters for this book to start
                      tracking notes by chapter.
                    </div>
                  ) : (
                    chapters.map((chapter) => {
                      const isActive = selectedChapter === chapter;
                      return (
                        <button
                          key={chapter}
                          type="button"
                          onClick={() => setSelectedChapter(chapter)}
                          className={`flex w-full items-center justify-between border-b border-[var(--color-surface)] px-4 py-3 text-left text-sm ${
                            isActive
                              ? "bg-[color:var(--rc-color-accent-subtle)/70%] text-[var(--color-text-main)]"
                              : "bg-[var(--color-page)] text-[var(--color-text-main)]"
                          }`}
                        >
                          <span>{`Chapter ${chapter}`}</span>
                          {isActive ? (
                            <span
                              className="text-[var(--color-text-accent)]"
                              aria-hidden
                            >
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <button
                type="button"
                onClick={handleStart}
                disabled={startDisabled}
                className={`mt-4 w-full rounded-2xl px-5 py-3 text-base font-semibold ${
                  startDisabled
                    ? "cursor-not-allowed bg-[color:var(--rc-color-accent-subtle)/35%] text-[var(--color-secondary)]"
                    : "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                }`}
              >
                Start
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
