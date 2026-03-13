"use client";

import AppErrorPage from "@/components/errors/AppErrorPage";

export default function HomeError({ reset }) {
  return <AppErrorPage onRetry={reset} />;
}
