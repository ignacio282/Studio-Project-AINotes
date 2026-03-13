"use client";

import AppErrorPage from "@/components/errors/AppErrorPage";

export default function AppError({ reset }) {
  return <AppErrorPage onRetry={reset} showReturnHome />;
}
