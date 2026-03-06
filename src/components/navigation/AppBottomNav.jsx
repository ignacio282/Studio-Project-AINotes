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
      <path
        d="M5 19H14V14H19V5H5V19ZM5 21C4.45 21 3.979 20.8043 3.587 20.413C3.19567 20.021 3 19.55 3 19V5C3 4.45 3.19567 3.979 3.587 3.587C3.979 3.19567 4.45 3 5 3H19C19.55 3 20.021 3.19567 20.413 3.587C20.8043 3.979 21 4.45 21 5V15L15 21H5ZM7 14V12H12V14H7ZM7 10V8H17V10H7Z"
        fill="#2A2A2A"
      />
    </svg>
  );
}

function AssistantIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M4 21V16C4 15.45 4.19583 14.9792 4.5875 14.5875C4.97917 14.1958 5.45 14 6 14H18C18.55 14 19.0208 14.1958 19.4125 14.5875C19.8042 14.9792 20 15.45 20 16V21H4ZM9 13C7.61667 13 6.4375 12.5125 5.4625 11.5375C4.4875 10.5625 4 9.38333 4 8C4 6.61667 4.4875 5.4375 5.4625 4.4625C6.4375 3.4875 7.61667 3 9 3H15C16.3833 3 17.5625 3.4875 18.5375 4.4625C19.5125 5.4375 20 6.61667 20 8C20 9.38333 19.5125 10.5625 18.5375 11.5375C17.5625 12.5125 16.3833 13 15 13H9ZM6 19H18V16H6V19ZM9 11H15C15.8333 11 16.5417 10.7083 17.125 10.125C17.7083 9.54167 18 8.83333 18 8C18 7.16667 17.7083 6.45833 17.125 5.875C16.5417 5.29167 15.8333 5 15 5H9C8.16667 5 7.45833 5.29167 6.875 5.875C6.29167 6.45833 6 7.16667 6 8C6 8.83333 6.29167 9.54167 6.875 10.125C7.45833 10.7083 8.16667 11 9 11ZM9 9C9.28333 9 9.52083 8.90417 9.7125 8.7125C9.90417 8.52083 10 8.28333 10 8C10 7.71667 9.90417 7.47917 9.7125 7.2875C9.52083 7.09583 9.28333 7 9 7C8.71667 7 8.47917 7.09583 8.2875 7.2875C8.09583 7.47917 8 7.71667 8 8C8 8.28333 8.09583 8.52083 8.2875 8.7125C8.47917 8.90417 8.71667 9 9 9ZM15 9C15.2833 9 15.5208 8.90417 15.7125 8.7125C15.9042 8.52083 16 8.28333 16 8C16 7.71667 15.9042 7.47917 15.7125 7.2875C15.5208 7.09583 15.2833 7 15 7C14.7167 7 14.4792 7.09583 14.2875 7.2875C14.0958 7.47917 14 7.71667 14 8C14 8.28333 14.0958 8.52083 14.2875 8.7125C14.4792 8.90417 14.7167 9 15 9Z"
        fill="#2A2A2A"
      />
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
      className="w-full rounded-[8px] bg-[#F0EEE5] p-4 text-center transition hover:bg-[color:var(--rc-color-accent-subtle)/45%]"
    >
      <div className="mx-auto flex w-full max-w-[326px] flex-col items-center text-center">
        <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
        <div className="type-button text-[#2A2A2A]">{title}</div>
        <div className="type-caption text-[#595853]">{subtitle}</div>
      </div>
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
            className="pointer-events-auto flex items-center justify-center gap-8 rounded-[61px] bg-white px-5 py-3"
            style={{ boxShadow: NAV_SHELL_SHADOW }}
          >
            <Link href="/home" className={`flex flex-col items-center justify-center ${active === "home" ? "text-[#2A2A2A]" : "text-[#A19F99]"}`}>
              <HomeIcon className="h-6 w-6" />
              <span className="type-button">
                Home
              </span>
            </Link>

            <button
              type="button"
              onClick={openSheet}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                canOpenSheet ? "bg-[#4C7B75] text-white" : "bg-[#4C7B75]/45 text-white/80"
              }`}
              aria-label="Open quick actions"
              disabled={!canOpenSheet}
            >
              <PlusIcon className="h-[23px] w-[23px]" />
            </button>

            <Link href="/library" className={`flex flex-col items-center justify-center ${active === "library" ? "text-[#2A2A2A]" : "text-[#A19F99]"}`}>
              <LibraryIcon className="h-6 w-6" />
              <span className="type-button">
                Library
              </span>
            </Link>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSheetOpen ? (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-black/35" onClick={closeSheet} aria-label="Close actions" />
            <motion.div
              className="relative z-10 w-full max-w-[390px] overflow-hidden rounded-t-[32px] bg-[#F7F6F3]"
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
              <div className="px-4 py-4">
                <div className="mx-auto h-1 w-8 rounded-full bg-[#2A2A2A]" />
              </div>
              <div className="px-4 pb-4 pt-4">
                <div className="type-h3 text-[#2A2A2A]">
                  {safeBookTitle}
                </div>
                <div className="mt-4 space-y-2">
                  <ActionOption
                    title="New note"
                    subtitle="Write down important moments, ideas, or characters."
                    icon={<NoteIcon className="h-6 w-6" />}
                    onClick={handleNewNote}
                  />
                  <ActionOption
                    title="Ask assistant"
                    subtitle="Find details, summaries, or connections in your notes."
                    icon={<AssistantIcon className="h-6 w-6" />}
                    onClick={handleAskAssistant}
                  />
                </div>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="type-title mt-4 h-10 w-full px-1 text-center text-[#4C7B75]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
