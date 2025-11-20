"use client";

import { use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Journaling from "../../../page.jsx";

export default function BookJournalingPage({ params }) {
  const { bookId } = use(params) ?? {};
  const searchParams = useSearchParams();

  const chapterParam = searchParams?.get("chapter");
  const chapterNumber = chapterParam ? Number(chapterParam) : undefined;
  const bookTitleParam = searchParams?.get("bookTitle") || undefined;
  const chapterTitleParam =
    searchParams?.get("chapterTitle") ||
    (typeof chapterNumber === "number" && Number.isFinite(chapterNumber) && chapterNumber > 0
      ? `Chapter ${chapterNumber}`
      : undefined);

  useEffect(() => {
    if (!bookId) return;
    try {
      localStorage.setItem("rc.currentBookId", String(bookId));
    } catch {
      // ignore storage errors
    }
  }, [bookId]);

  const normalizedChapterNumber =
    typeof chapterNumber === "number" && Number.isFinite(chapterNumber) && chapterNumber > 0
      ? chapterNumber
      : undefined;

  return (
    <Journaling
      initialBookId={bookId}
      initialBookTitle={bookTitleParam}
      initialChapterNumber={normalizedChapterNumber}
      initialChapterTitle={chapterTitleParam}
    />
  );
}
