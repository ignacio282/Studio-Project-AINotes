"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BookChapterStartSheet({
  bookId,
  bookTitle,
  trackingMode = "chapter",
  openOnMount = false,
}) {
  const router = useRouter();

  const hasValidBook =
    typeof bookId === "string" && bookId.trim().length > 0;

  const handleStart = () => {
    if (!hasValidBook) return;

    const params = new URLSearchParams();
    const safeBookTitle =
      typeof bookTitle === "string" && bookTitle.trim().length > 0
        ? bookTitle.trim()
        : "";

    if (safeBookTitle) {
      params.set("bookTitle", safeBookTitle);
    }
    params.set("trackingMode", trackingMode);

    router.push(
      `/books/${encodeURIComponent(bookId)}/journal?${params.toString()}`,
    );
  };

  useEffect(() => {
    if (!openOnMount || !hasValidBook) return;
    const params = new URLSearchParams();
    const safeBookTitle =
      typeof bookTitle === "string" && bookTitle.trim().length > 0
        ? bookTitle.trim()
        : "";

    if (safeBookTitle) {
      params.set("bookTitle", safeBookTitle);
    }
    params.set("trackingMode", trackingMode);

    router.push(
      `/books/${encodeURIComponent(bookId)}/journal?${params.toString()}`,
    );
  }, [bookId, bookTitle, hasValidBook, openOnMount, router, trackingMode]);

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={!hasValidBook}
      className="type-button block w-full rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-center text-[var(--color-text-on-accent)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      Write a note
    </button>
  );
}
