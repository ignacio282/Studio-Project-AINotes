"use client";

import { useEffect } from "react";
import Journaling from "../../../page.jsx";

export default function BookJournalingPage({ params }) {
  const { bookId } = params || {};
  useEffect(() => {
    if (!bookId) return;
    try {
      localStorage.setItem("rc.currentBookId", String(bookId));
    } catch {
      // ignore storage errors
    }
  }, [bookId]);
  return <Journaling />;
}

