"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const NAV_SHELL_SHADOW =
  "0px 6px 14px 0px rgba(0,0,0,0.10), 0px 25px 25px 0px rgba(0,0,0,0.09), 0px 57px 34px 0px rgba(0,0,0,0.05), 0px 101px 40px 0px rgba(0,0,0,0.01), 0px 158px 44px 0px rgba(0,0,0,0)";

function HomeIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LibraryIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 4h10a2 2 0 0 1 2 2v13H8a2 2 0 0 0-2 2V4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 20h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 7h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StatsIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 15v-4m4 4V9m4 6v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20c1.8-3.2 5-4.5 8-4.5S18.2 16.8 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function NoteIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 4h12a2 2 0 0 1 2 2v9.5L14.5 21H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 15h6" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AssistantIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="5" y="6" width="14" height="9" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 18h10v2H7z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="10.5" r="1" fill="currentColor" />
      <circle cx="14" cy="10.5" r="1" fill="currentColor" />
    </svg>
  );
}

function triggerHaptic() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }
  } catch {
    // ignore unsupported haptics
  }
}

function ActionOption({ title, subtitle, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-[var(--color-surface)] px-4 py-5 text-center transition hover:bg-[color:var(--rc-color-accent-subtle)/45%]"
    >
      <span className="mx-auto block w-fit text-[var(--color-text-main)]">{icon}</span>
      <div className="mt-2 text-[20px] leading-7 font-semibold text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-h3)" }}>
        {title}
      </div>
      <div className="mt-1 text-sm leading-[22px] text-[var(--color-secondary)]">{subtitle}</div>
    </button>
  );
}

export default function AppBottomNav({
  active = "home",
  hasActionContext = false,
  currentBookId = "",
  currentBookTitle = "",
}) {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const canOpenSheet = hasActionContext && Boolean(currentBookId);
  const safeBookTitle = useMemo(
    () => (typeof currentBookTitle === "string" && currentBookTitle.trim() ? currentBookTitle.trim() : "Current book"),
    [currentBookTitle],
  );

  const openSheet = () => {
    if (!canOpenSheet) return;
    triggerHaptic();
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
  };

  const handleNewNote = () => {
    if (!currentBookId) return;
    triggerHaptic();
    closeSheet();
    router.push(`/books/${encodeURIComponent(currentBookId)}?startNote=1`);
  };

  const handleAskAssistant = () => {
    if (!currentBookId) return;
    triggerHaptic();
    closeSheet();
    router.push(`/books/${encodeURIComponent(currentBookId)}/assistant`);
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 px-5">
        <div className="mx-auto max-w-2xl">
          <div
            className="pointer-events-auto flex items-center justify-between rounded-[40px] bg-[var(--color-text-on-accent)] px-4 py-3"
            style={{ boxShadow: NAV_SHELL_SHADOW }}
          >
            <Link href="/home" className={`flex w-[68px] flex-col items-center gap-1 ${active === "home" ? "text-[var(--color-text-main)]" : "text-[var(--color-text-disabled)]"}`}>
              <HomeIcon className="h-7 w-7" />
              <span className="text-[14px] leading-5">Home</span>
            </Link>

            <Link href="/library" className={`flex w-[68px] flex-col items-center gap-1 ${active === "library" ? "text-[var(--color-text-main)]" : "text-[var(--color-text-disabled)]"}`}>
              <LibraryIcon className="h-7 w-7" />
              <span className="text-[14px] leading-5">Library</span>
            </Link>

            <button
              type="button"
              onClick={openSheet}
              className={`flex h-[64px] w-[64px] items-center justify-center rounded-full ${
                canOpenSheet ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]" : "bg-[var(--color-text-disabled)] text-[var(--color-text-on-accent)]"
              }`}
              aria-label="Open quick actions"
              disabled={!canOpenSheet}
            >
              <PlusIcon className="h-10 w-10" />
            </button>

            <button
              type="button"
              className="flex w-[68px] cursor-not-allowed flex-col items-center gap-1 text-[var(--color-text-disabled)]"
              aria-label="Stats (coming soon)"
              disabled
            >
              <StatsIcon className="h-7 w-7" />
              <span className="text-[14px] leading-5">Stats</span>
            </button>

            <button
              type="button"
              className="flex w-[68px] cursor-not-allowed flex-col items-center gap-1 text-[var(--color-text-disabled)]"
              aria-label="You (coming soon)"
              disabled
            >
              <UserIcon className="h-7 w-7" />
              <span className="text-[14px] leading-5">You</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSheetOpen ? (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/35" onClick={closeSheet} aria-label="Close actions" />
            <motion.div
              className="relative z-10 w-full max-w-2xl rounded-t-[36px] bg-[var(--color-page)] px-6 pb-10 pt-4"
              initial={{ y: 360 }}
              animate={{ y: 0 }}
              exit={{ y: 360 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.18}
              onDragEnd={(_event, info) => {
                if (info.offset.y > 90 || info.velocity.y > 700) {
                  closeSheet();
                }
              }}
            >
              <div className="mx-auto h-1.5 w-16 rounded-full bg-[var(--color-text-main)]/95" />
              <div className="mt-9 text-[20px] leading-7 font-semibold text-[var(--color-text-main)]" style={{ fontFamily: "var(--font-h3)" }}>
                {safeBookTitle}
              </div>

              <div className="mt-8 space-y-3">
                <ActionOption
                  title="New note"
                  subtitle="Write down important moments, ideas, or characters."
                  icon={<NoteIcon className="h-8 w-8" />}
                  onClick={handleNewNote}
                />
                <ActionOption
                  title="Ask assistant"
                  subtitle="Find details, summaries, or connections in your notes."
                  icon={<AssistantIcon className="h-8 w-8" />}
                  onClick={handleAskAssistant}
                />
              </div>

              <button
                type="button"
                onClick={closeSheet}
                className="mt-8 w-full py-3 text-center text-[14px] leading-5 font-medium text-[var(--color-text-accent)]"
                style={{ fontFamily: "var(--font-title)" }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
