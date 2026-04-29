"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import KebabIcon from "@/components/KebabIcon";
import ActionBottomSheet from "@/components/ui/ActionBottomSheet";
import { formatProgressLabel, normalizeTrackingMode } from "@/lib/books/progress";

const TABS = [
  { id: "notes", label: "Notes" },
  { id: "characters", label: "Characters" },
  { id: "places", label: "Places" },
];

function formatCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function slugifyPlaceName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function normalizePlace(place) {
  if (typeof place === "string") {
    const name = place.trim();
    return name ? { name, slug: slugifyPlaceName(name) } : null;
  }
  if (!place || typeof place !== "object") return null;
  const name = typeof place.name === "string" ? place.name.trim() : "";
  const slug =
    typeof place.slug === "string" && place.slug.trim()
      ? place.slug.trim()
      : slugifyPlaceName(name);
  return name ? { name, slug } : null;
}

function CloseIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M5.7 5.7a.75.75 0 0 1 1.06 0L10 8.94l3.24-3.24a.75.75 0 1 1 1.06 1.06L11.06 10l3.24 3.24a.75.75 0 1 1-1.06 1.06L10 11.06l-3.24 3.24a.75.75 0 1 1-1.06-1.06L8.94 10 5.7 6.76a.75.75 0 0 1 0-1.06Z"
      />
    </svg>
  );
}

function EmptyNotesIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M12 6h18.5L38 13.5V40a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm17 3.5V15h5.5L29 9.5ZM17 21h14v3H17v-3Zm0 7h14v3H17v-3Zm0 7h9v3h-9v-3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EmptyCharactersIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M24 6a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm0 22c9 0 16 4.5 16 10.5V42H8v-3.5C8 32.5 15 28 24 28Zm0-18a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 22c-6.6 0-11.5 2.8-11.9 6H35.9c-.4-3.2-5.3-6-11.9-6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EmptyPlacesIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M24 4c7.2 0 13 5.8 13 13 0 8.9-10.3 22.3-11.5 23.8L24 42.7l-1.5-1.9C21.3 39.3 11 25.9 11 17 11 9.8 16.8 4 24 4Zm0 4c-5 0-9 4-9 9 0 5.5 5.4 14 9 19.1 3.6-5.1 9-13.6 9-19.1 0-5-4-9-9-9Zm0 5.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BookHubEmptyState({ icon: Icon, title, description }) {
  return (
    <div className="h-[242px] rounded-[8px] p-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center text-[var(--color-accent)]">
        <Icon className="h-12 w-12" />
      </div>

      <div className="mx-auto mt-4 w-full max-w-[310px]">
        <h3 className="type-title text-[#2A2A2A]">
          {title}
        </h3>
        <p className="type-body mt-2 text-[#595853]">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function BookHubTabs({
  bookId,
  trackingMode,
  notes,
  filtersDisabled,
  characters,
  places,
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("notes");
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showAssistantNotice, setShowAssistantNotice] = useState(true);
  const [notesState, setNotesState] = useState(Array.isArray(notes) ? notes : []);
  const [activeNoteActionId, setActiveNoteActionId] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [noteActionError, setNoteActionError] = useState("");
  const normalizedTrackingMode = normalizeTrackingMode(trackingMode);
  const effectiveNoteCount = notesState.length;
  const filtersAreDisabled = effectiveNoteCount === 0;
  const normalizedPlaces = useMemo(
    () => (Array.isArray(places) ? places.map(normalizePlace).filter(Boolean) : []),
    [places],
  );

  useEffect(() => {
    setNotesState(Array.isArray(notes) ? notes : []);
  }, [notes]);

  const activeNoteAction = useMemo(
    () => notesState.find((note) => note.id === activeNoteActionId) ?? null,
    [activeNoteActionId, notesState],
  );

  const handleDeleteNote = async () => {
    if (!activeNoteAction || isDeletingNote) return;

    try {
      setIsDeletingNote(true);
      setNoteActionError("");
      const response = await fetch(`/api/notes/${activeNoteAction.id}`, { method: "DELETE" });
      if (!response.ok) {
        let message = "Unable to delete note.";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string" && payload.error.trim()) {
            message = payload.error;
          }
        } catch {}
        throw new Error(message);
      }

      setNotesState((prev) => prev.filter((note) => note.id !== activeNoteAction.id));
      setActiveNoteActionId("");
      setConfirmingDelete(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete note.";
      setNoteActionError(message);
    } finally {
      setIsDeletingNote(false);
    }
  };

  const closeNoteActions = () => {
    if (isDeletingNote) return;
    setActiveNoteActionId("");
    setConfirmingDelete(false);
    setNoteActionError("");
  };

  return (
    <section>
      <div
        role="tablist"
        className="grid w-full grid-cols-3 border-b border-[var(--color-text-disabled)]"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`type-button relative w-full pb-3 text-center transition ${
                isActive
                  ? "text-[var(--color-text-main)]"
                  : "text-[var(--color-text-disabled)]"
              }`}
            >
              {tab.label}
              <span
                className={`absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full ${
                  isActive ? "bg-[var(--color-text-main)]" : "bg-transparent"
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {activeTab === "notes" && (
        <div className="pt-4">
          {effectiveNoteCount > 0 && showAssistantNotice && (
            <div className="mb-5 rounded-2xl bg-[rgba(229,239,238,0.82)] p-4 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className="type-title text-[var(--color-text-main)]"
                  >
                    Ask your assistant
                  </div>
                  <div className="type-body mt-2 text-[var(--color-secondary)]">
                    Can&apos;t remember something about this book? Ask your AI assistant. It will
                    go over your notes to help you remember.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAssistantNotice(false)}
                  className="rounded-full p-1 text-[var(--color-secondary)] transition hover:text-[var(--color-text-main)]"
                  aria-label="Dismiss assistant tip"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <div className="caption mb-4">
            {formatCount(effectiveNoteCount, "note", "notes")}
          </div>

          {notesState.length === 0 ? (
            <BookHubEmptyState
              icon={EmptyNotesIcon}
              title="Start your reading memory"
              description="Write your first note for this book and Scriba will organize the summary, characters, places, and reflections here."
            />
          ) : (
            <div className="space-y-4">
              {(showAllNotes ? notesState : notesState.slice(0, 3)).map((n) => {
                const href = `/books/${bookId}/chapters/${n.chapter_number}/notes/${n.id}`;
                return (
                  <div key={n.id} className="rounded-2xl bg-[rgba(240,238,229,0.78)] p-4 backdrop-blur">
                    <div className="flex items-start gap-3">
                      <Link href={href} className="min-w-0 flex-1">
                        <div className="type-title">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                        <div className="caption">
                          {formatProgressLabel(normalizedTrackingMode, n.chapter_number)}
                        </div>
                        <div className="type-body mt-2 text-[var(--color-text-main)]">
                          {n.preview ? (
                            n.preview
                          ) : (
                            <span className="text-[var(--color-secondary)]">
                              Open to view full note
                            </span>
                          )}
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveNoteActionId(n.id)}
                        className="rounded-full p-1 text-[var(--color-secondary)] transition hover:bg-[var(--color-page)] hover:text-[var(--color-text-main)]"
                        aria-label="Open note actions"
                      >
                        <KebabIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {notesState.length > 3 && !showAllNotes && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllNotes(true)}
                    className="type-button text-[var(--color-secondary)] underline decoration-[var(--color-text-disabled)]"
                  >
                    Show more
                  </button>
                </div>
              )}
            </div>
          )}
          <ActionBottomSheet
            open={Boolean(activeNoteAction)}
            onClose={closeNoteActions}
            title={confirmingDelete ? "Delete this note?" : noteActionError || "Note actions"}
            actions={
              confirmingDelete
                ? [
                    {
                      id: "confirm-delete-note",
                      label: isDeletingNote ? "Deleting note..." : "Delete permanently",
                      onClick: handleDeleteNote,
                      disabled: isDeletingNote,
                      destructive: true,
                    },
                    {
                      id: "cancel-delete-note",
                      label: "Keep note",
                      onClick: () => {
                        setConfirmingDelete(false);
                        setNoteActionError("");
                      },
                      disabled: isDeletingNote,
                    },
                  ]
                : [
                    {
                      id: "delete-note",
                      label: "Delete note",
                      onClick: () => {
                        setConfirmingDelete(true);
                        setNoteActionError("");
                      },
                      destructive: true,
                    },
                  ]
            }
          />
        </div>
      )}

      {activeTab === "characters" && (
        <div className="pt-4">
          <div className="caption mb-3">
            {formatCount(characters.length, "character", "characters")}
          </div>
          {characters.length === 0 ? (
            <BookHubEmptyState
              icon={EmptyCharactersIcon}
              title="No characters yet"
              description="Characters will appear here once they are mentioned in your notes."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl bg-[rgba(240,238,229,0.78)] backdrop-blur">
              {characters.map((character, index) => {
                const rowClass = `type-title flex items-center justify-between px-4 py-4 ${
                  index < characters.length - 1
                    ? "border-b border-[var(--color-text-disabled)]"
                    : ""
                }`;
                if (character.slug) {
                  return (
                    <Link
                      key={character.slug}
                      href={`/books/${bookId}/characters/${character.slug}`}
                      className={`${rowClass} transition hover:bg-[color:var(--rc-color-text-secondary)/8%]`}
                    >
                      <span>{character.name}</span>
                      <ChevronRight className="h-4 w-4 text-[var(--color-secondary)]" />
                    </Link>
                  );
                }
                return (
                  <div key={character.name} className={rowClass}>
                    <span>{character.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "places" && (
        <div className="pt-4">
          <div className="caption mb-3">
            {formatCount(normalizedPlaces.length, "place", "places")}
          </div>
          {normalizedPlaces.length === 0 ? (
            <BookHubEmptyState
              icon={EmptyPlacesIcon}
              title="No places yet"
              description="Places will appear here once they are mentioned in your notes."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl bg-[rgba(240,238,229,0.78)] backdrop-blur">
              {normalizedPlaces.map((place, index) => {
                const rowClass = `type-title flex items-center justify-between px-4 py-4 ${
                  index < normalizedPlaces.length - 1
                    ? "border-b border-[var(--color-text-disabled)]"
                    : ""
                }`;
                if (place.slug) {
                  return (
                    <Link
                      key={place.slug}
                      href={`/books/${bookId}/places/${place.slug}`}
                      className={`${rowClass} transition hover:bg-[color:var(--rc-color-text-secondary)/8%]`}
                    >
                      <span>{place.name}</span>
                      <ChevronRight className="h-4 w-4 text-[var(--color-secondary)]" />
                    </Link>
                  );
                }
                return (
                  <div key={place.name} className={rowClass}>
                    <span>{place.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
