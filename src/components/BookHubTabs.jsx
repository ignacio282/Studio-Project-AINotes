"use client";

import { useState } from "react";
import Link from "next/link";

const TABS = [
  { id: "notes", label: "Notes" },
  { id: "characters", label: "Characters" },
  { id: "places", label: "Places" },
];

function formatCount(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function ChevronRightIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7.22 4.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L10.94 10 7.22 6.28a.75.75 0 0 1 0-1.06Z"
      />
    </svg>
  );
}

function CaretDownIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M5.47 7.97a.75.75 0 0 1 1.06 0L10 11.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06Z"
      />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M16.7 5.3a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L3.3 8.52a.75.75 0 1 1 1.06-1.06l4.03 4.03 6.72-6.72a.75.75 0 0 1 1.06 0Z"
      />
    </svg>
  );
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

export default function BookHubTabs({
  bookId,
  noteCount,
  notes,
  filtersDisabled,
  characters,
  places,
}) {
  const [activeTab, setActiveTab] = useState("notes");
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showAssistantNotice, setShowAssistantNotice] = useState(true);
  const chipBase = "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap";

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
              className={`relative w-full pb-3 text-center text-sm transition ${
                isActive
                  ? "text-[var(--color-text-main)] font-semibold"
                  : "text-[var(--color-text-disabled)] font-medium"
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
          {showAssistantNotice && (
            <div className="mb-5 rounded-2xl bg-[var(--color-accent-subtle)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className="text-base font-medium text-[var(--color-text-main)]"
                    style={{ fontFamily: "var(--font-title)" }}
                  >
                    Ask your assistant
                  </div>
                  <div className="mt-2 text-sm text-[var(--color-secondary)]">
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
            {formatCount(noteCount, "note", "notes")}
          </div>

          <div className="mb-4 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar">
            <span
              className={`${chipBase} flex-shrink-0 ${
                filtersDisabled
                  ? "bg-[color:var(--color-text-disabled)/20%] text-[var(--color-text-disabled)]"
                  : "bg-[var(--color-accent-subtle)] text-[var(--color-text-main)]"
              }`}
            >
              <CheckIcon className="h-4 w-4" />
              All
            </span>
            <span
              className={`${chipBase} flex-shrink-0 border ${
                filtersDisabled
                  ? "border-[var(--color-text-disabled)] text-[var(--color-text-disabled)]"
                  : "border-[var(--color-secondary)] text-[var(--color-text-main)]"
              }`}
            >
              <span>Chapter</span>
              <CaretDownIcon className="h-3 w-3" />
            </span>
            <span
              className={`${chipBase} flex-shrink-0 border ${
                filtersDisabled
                  ? "border-[var(--color-text-disabled)] text-[var(--color-text-disabled)]"
                  : "border-[var(--color-secondary)] text-[var(--color-text-main)]"
              }`}
            >
              <span>Date</span>
              <CaretDownIcon className="h-3 w-3" />
            </span>
            <span
              className={`${chipBase} flex-shrink-0 border ${
                filtersDisabled
                  ? "border-[var(--color-text-disabled)] text-[var(--color-text-disabled)]"
                  : "border-[var(--color-secondary)] text-[var(--color-text-main)]"
              }`}
            >
              <span>Character</span>
              <CaretDownIcon className="h-3 w-3" />
            </span>
            <span
              className={`${chipBase} flex-shrink-0 border ${
                filtersDisabled
                  ? "border-[var(--color-text-disabled)] text-[var(--color-text-disabled)]"
                  : "border-[var(--color-secondary)] text-[var(--color-text-main)]"
              }`}
            >
              <span>Place</span>
              <CaretDownIcon className="h-3 w-3" />
            </span>
          </div>

          {notes.length === 0 ? (
            <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">
              Start taking notes to see them here.
            </div>
          ) : (
            <div className="space-y-4">
              {(showAllNotes ? notes : notes.slice(0, 3)).map((n) => {
                const href = `/books/${bookId}/chapters/${n.chapter_number}/notes/${n.id}`;
                return (
                  <Link
                    key={n.id}
                    href={href}
                    className="block rounded-2xl bg-[var(--color-surface)] p-4"
                  >
                    <div
                      className="text-base font-medium"
                      style={{ fontFamily: "var(--font-title)" }}
                    >
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                    <div className="caption">Chapter {n.chapter_number}</div>
                    <div
                      className="mt-2 text-sm font-normal text-[var(--color-text-main)]"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {n.preview ? (
                        n.preview
                      ) : (
                        <span className="text-[var(--color-secondary)]">
                          Open to view full note
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
              {notes.length > 3 && !showAllNotes && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllNotes(true)}
                    className="text-sm font-medium text-[var(--color-secondary)] underline decoration-[var(--color-text-disabled)]"
                  >
                    Show more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "characters" && (
        <div className="pt-4">
          <div className="caption mb-3">
            {formatCount(characters.length, "character", "characters")}
          </div>
          {characters.length === 0 ? (
            <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">
              Characters will appear once they are mentioned in your notes.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)]">
              {characters.map((character, index) => {
                const rowClass = `flex items-center justify-between px-4 py-4 text-base ${
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
                      <ChevronRightIcon className="h-4 w-4 text-[var(--color-secondary)]" />
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
            {formatCount(places.length, "place", "places")}
          </div>
          {places.length === 0 ? (
            <div className="rounded-2xl bg-[var(--color-surface)] p-6 text-[var(--color-secondary)]">
              Places will appear once they are mentioned in your notes.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-[var(--color-surface)]">
              {places.map((place, index) => (
                <div
                  key={place}
                  className={`flex items-center justify-between px-4 py-4 text-base ${
                    index < places.length - 1
                      ? "border-b border-[var(--color-text-disabled)]"
                      : ""
                  }`}
                >
                  <span>{place}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
