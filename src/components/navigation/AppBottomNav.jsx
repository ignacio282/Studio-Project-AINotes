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
      <path d="M12 5.69 17 10.19V18h-2v-6H9v6H7v-7.81L12 5.69ZM12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3Z" fill="currentColor" />
    </svg>
  );
}

function LibraryIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M7.5 22C6.533 22 5.708 21.658 5.025 20.975 4.342 20.292 4 19.467 4 18.5V5.5C4 4.533 4.342 3.708 5.025 3.025 5.708 2.342 6.533 2 7.5 2H20v15c-.417 0-.771.146-1.063.438-.291.291-.437.645-.437 1.062s.146.771.438 1.063c.291.291.645.437 1.062.437v2H7.5ZM6 15.325c.233-.117.475-.2.725-.25.25-.05.508-.075.775-.075H8V4h-.5c-.417 0-.771.146-1.063.438C6.146 4.729 6 5.083 6 5.5v9.825ZM10 15h8V4h-8v11ZM7.5 20h9.325a4.795 4.795 0 0 1-.238-.713 3.275 3.275 0 0 1-.087-.787c0-.267.025-.525.075-.775.05-.25.133-.492.25-.725H7.5c-.433 0-.792.146-1.075.438C6.142 17.729 6 18.083 6 18.5c0 .433.142.792.425 1.075.283.283.642.425 1.075.425Z" fill="currentColor" />
    </svg>
  );
}

function StatsIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M19 3H5C3.9 3 3 3.9 3 5V19c0 1.1.9 2 2 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm0 16H5V5H19v14ZM7 10h2v7H7v-7Zm4-3h2v10h-2V7Zm4 6h2v4h-2v-4Z" fill="currentColor" />
    </svg>
  );
}

function UserIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 12c-1.1 0-2.042-.392-2.825-1.175C8.392 10.042 8 9.1 8 8c0-1.1.392-2.042 1.175-2.825C9.958 4.392 10.9 4 12 4c1.1 0 2.042.392 2.825 1.175C15.608 5.958 16 6.9 16 8c0 1.1-.392 2.042-1.175 2.825C14.042 11.608 13.1 12 12 12ZM4 20v-2.8c0-.567.146-1.088.438-1.563.291-.475.679-.837 1.162-1.087 1.033-.517 2.083-.904 3.15-1.163A13.653 13.653 0 0 1 12 13c1.1 0 2.183.129 3.25.387 1.067.258 2.117.646 3.15 1.163.483.25.871.612 1.163 1.087.291.475.437.996.437 1.563V20H4Zm2-2h12v-.8a.797.797 0 0 0-.138-.5.956.956 0 0 0-.362-.35 13.16 13.16 0 0 0-2.725-1.012A11.998 11.998 0 0 0 12 15a11.999 11.999 0 0 0-2.775.337A13.16 13.16 0 0 0 6.5 16.35a.956.956 0 0 0-.362.35.797.797 0 0 0-.138.5v.8ZM12 10c.55 0 1.021-.196 1.413-.587.391-.392.587-.863.587-1.413s-.196-1.021-.587-1.413C13.021 6.196 12.55 6 12 6s-1.021.196-1.413.587C10.196 6.979 10 7.45 10 8s.196 1.021.587 1.413C10.979 9.804 11.45 10 12 10Z" fill="currentColor" />
    </svg>
  );
}

function PlusIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M31.667 21.667h-10V31.667h-3.334v-10h-10v-3.334h10v-10h3.334v10h10v3.334Z" fill="currentColor" />
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
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 px-3 sm:px-6">
        <div className="mx-auto w-fit max-w-2xl">
          <div
            className="pointer-events-auto flex items-center justify-center gap-6 rounded-[61px] bg-white px-4 py-3"
            style={{ boxShadow: NAV_SHELL_SHADOW }}
          >
            <Link href="/home" className={`flex flex-col items-center justify-center ${active === "home" ? "text-[#2A2A2A]" : "text-[#A19F99]"}`}>
              <HomeIcon className="h-6 w-6" />
              <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "Inter, var(--font-title), sans-serif" }}>
                Home
              </span>
            </Link>

            <Link href="/library" className={`flex flex-col items-center justify-center ${active === "library" ? "text-[#2A2A2A]" : "text-[#A19F99]"}`}>
              <LibraryIcon className="h-6 w-6" />
              <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "Inter, var(--font-title), sans-serif" }}>
                Library
              </span>
            </Link>

            <button
              type="button"
              onClick={openSheet}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                canOpenSheet ? "bg-[#4C7B75] text-white" : "bg-[#4C7B75]/45 text-white/80"
              }`}
              aria-label="Open quick actions"
              disabled={!canOpenSheet}
            >
              <PlusIcon className="h-[23px] w-[23px]" />
            </button>

            <button
              type="button"
              className="flex w-10 cursor-not-allowed flex-col items-center justify-center text-[#A19F99]"
              aria-label="Stats (coming soon)"
              disabled
            >
              <StatsIcon className="h-6 w-6" />
              <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "Inter, var(--font-title), sans-serif" }}>
                Stats
              </span>
            </button>

            <button
              type="button"
              className="flex w-10 cursor-not-allowed flex-col items-center justify-center text-[#A19F99]"
              aria-label="You (coming soon)"
              disabled
            >
              <UserIcon className="h-6 w-6" />
              <span className="text-[14px] leading-5 font-medium" style={{ fontFamily: "Inter, var(--font-title), sans-serif" }}>
                You
              </span>
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
