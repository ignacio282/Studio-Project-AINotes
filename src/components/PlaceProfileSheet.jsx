"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, MapPin, Sparkles, Users } from "lucide-react";
import ActionBottomSheet from "@/components/ui/ActionBottomSheet";
import { formatProgressLabel, normalizeTrackingMode } from "@/lib/books/progress";
import { getFriendlyErrorMessage } from "@/lib/errors/user-facing";

function toStringList(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function normalizeSnapshot(snapshot) {
  const structured = snapshot?.structured && typeof snapshot.structured === "object" ? snapshot.structured : {};
  return {
    ...snapshot,
    structured: {
      overview:
        typeof structured.overview === "string" && structured.overview.trim()
          ? structured.overview.trim()
          : typeof snapshot?.answer === "string"
            ? snapshot.answer.trim()
            : "",
      events: Array.isArray(structured.events) ? structured.events : [],
      charactersPresent: Array.isArray(structured.charactersPresent) ? structured.charactersPresent : [],
      characterActivity: Array.isArray(structured.characterActivity) ? structured.characterActivity : [],
      dynamics: toStringList(structured.dynamics),
      storyRole: typeof structured.storyRole === "string" ? structured.storyRole.trim() : "",
      movement: Array.isArray(structured.movement) ? structured.movement : [],
      evidence: toStringList(structured.evidence),
      openQuestions: toStringList(structured.openQuestions),
      sources: Array.isArray(structured.sources) ? structured.sources : snapshot?.sources ?? [],
    },
  };
}

function Section({ title, icon: Icon, tone = "default", children }) {
  return (
    <section
      className={[
        "rounded-[8px] p-5",
        tone === "accent" ? "bg-[rgba(229,239,238,0.82)] backdrop-blur" : "bg-[rgba(240,238,229,0.78)] backdrop-blur",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(250,249,245,0.72)] text-[var(--color-text-accent)]">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </div>
        <h2 className="type-title text-[var(--color-text-main)]">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlaceLoadingState() {
  return (
    <section className="p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[8px] bg-[var(--color-accent-subtle)] text-[var(--color-text-accent)]">
        <Sparkles className="h-5 w-5 animate-pulse" aria-hidden="true" />
      </div>
      <h2 className="type-title mt-4 text-[var(--color-text-main)]">Building place sheet...</h2>
      <p className="type-body mx-auto mt-2 max-w-[34ch] text-[var(--color-secondary)]">
        Scriba is turning your saved notes into a cleaner story view for this place.
      </p>
    </section>
  );
}

function SparsePlaceState({ placeName, onDelete }) {
  return (
    <section className="rounded-[8px] bg-[rgba(240,238,229,0.78)] p-8 text-center backdrop-blur">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[8px] bg-[rgba(250,249,245,0.72)] text-[var(--color-text-accent)]">
        <MapPin className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="type-title mt-4 text-[var(--color-text-main)]">Not enough information yet</h2>
      <p className="type-body mx-auto mt-2 max-w-[38ch] text-[var(--color-secondary)]">
        Write more about {placeName || "this place"} in your notes if you would like to see its main events, people, and story importance here.
      </p>
      <button
        type="button"
        onClick={onDelete}
        className="type-button mt-5 rounded-[8px] bg-[rgba(250,249,245,0.72)] px-4 py-2 text-[var(--color-secondary)] transition hover:text-[var(--color-text-main)]"
      >
        Delete this place
      </button>
    </section>
  );
}

function EmptyLine({ children = "Not captured clearly yet." }) {
  return <div className="type-body text-[var(--color-text-disabled)]">{children}</div>;
}

function ChapterBadges({ chapters, trackingMode }) {
  const normalized = normalizeTrackingMode(trackingMode);
  const values = Array.from(
    new Set(
      (Array.isArray(chapters) ? chapters : [])
        .map((chapter) => Number(chapter))
        .filter((chapter) => Number.isFinite(chapter) && chapter > 0),
    ),
  ).sort((a, b) => a - b);
  if (!values.length) return <EmptyLine>No source chapters yet.</EmptyLine>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((chapter) => (
        <span
          key={chapter}
          className="type-caption rounded-full bg-[rgba(250,249,245,0.72)] px-3 py-1 text-[var(--color-secondary)]"
        >
          {formatProgressLabel(normalized, chapter)}
        </span>
      ))}
    </div>
  );
}

function EventList({ items, trackingMode }) {
  const normalized = normalizeTrackingMode(trackingMode);
  const values = Array.isArray(items) ? items.filter((item) => item?.text).slice(0, 4) : [];
  if (!values.length) return <EmptyLine />;
  return (
    <ul className="space-y-3">
      {values.map((item, index) => (
        <li key={`${item.chapterNumber}-${index}`} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-accent)]" aria-hidden="true" />
          <div>
            <p className="type-body text-[var(--color-text-main)]">{item.text}</p>
            <div className="type-caption mt-1 text-[var(--color-secondary)]">
              {formatProgressLabel(normalized, item.chapterNumber)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CharactersList({ items }) {
  const values = Array.isArray(items) ? items.filter((item) => item?.name).slice(0, 8) : [];
  if (!values.length) return <EmptyLine>No characters are clearly tied to this place yet.</EmptyLine>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((item) => (
        <span key={item.name} className="type-body rounded-full bg-[rgba(250,249,245,0.72)] px-3 py-1 text-[var(--color-text-main)]">
          {item.name}
        </span>
      ))}
    </div>
  );
}

function TextList({ items, emptyLabel = "Not captured clearly yet." }) {
  const values = toStringList(items);
  if (!values.length) return <EmptyLine>{emptyLabel}</EmptyLine>;
  return (
    <ul className="space-y-3">
      {values.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-accent)]" aria-hidden="true" />
          <p className="type-body text-[var(--color-text-main)]">{item}</p>
        </li>
      ))}
    </ul>
  );
}

function ActivitySentences({ items }) {
  const values = Array.isArray(items)
    ? items
        .filter((item) => item?.name && item?.summary)
        .slice(0, 3)
        .map((item) => `${item.name}: ${item.summary}`)
    : [];
  return <TextList items={values} emptyLabel="No distinct character actions are captured for this place yet." />;
}

export default function PlaceProfileSheet({ bookId, slug, initialSnapshot, trackingMode }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(() => normalizeSnapshot(initialSnapshot));
  const [status, setStatus] = useState("loading");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const structured = useMemo(() => normalizeSnapshot(snapshot).structured, [snapshot]);
  const placeName = snapshot?.place_name || "this place";
  const hasUsefulPlaceProfile =
    (structured.events?.length || 0) > 1 ||
    (structured.charactersPresent?.length || 0) > 1 ||
    (structured.dynamics?.length || 0) > 0;
  const showLoadingState = status === "loading";

  useEffect(() => {
    let cancelled = false;
    async function loadSnapshot() {
      try {
        const response = await fetch(`/api/books/${bookId}/places/${slug}/snapshot`, { method: "POST" });
        if (!response.ok) throw new Error("Unable to refresh place summary.");
        const payload = await response.json();
        if (!cancelled && payload?.snapshot) {
          setSnapshot(normalizeSnapshot(payload.snapshot));
          setStatus(payload?.generated === false ? "fallback" : "ready");
        } else if (!cancelled) {
          setStatus("fallback");
        }
      } catch {
        if (!cancelled) setStatus("fallback");
      }
    }
    loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [bookId, slug]);

  const handleDeletePlace = async () => {
    if (!bookId || !slug || isDeleting) return;
    try {
      setIsDeleting(true);
      setDeleteError("");
      const response = await fetch(`/api/books/${encodeURIComponent(bookId)}/places/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        let message = "Unable to delete this place.";
        try {
          const payload = await response.json();
          if (typeof payload?.error === "string" && payload.error.trim()) message = payload.error;
        } catch {}
        throw new Error(message);
      }
      setConfirmingDelete(false);
      router.push(`/books/${bookId}`);
      router.refresh();
    } catch (error) {
      setDeleteError(getFriendlyErrorMessage(error, "Unable to delete this place right now."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Overview" icon={MapPin} tone="accent">
        <p className="type-body max-w-[62ch] text-[var(--color-text-main)]">
          {structured.overview || "This place appears in your notes, but Scriba needs more saved detail before it can summarize it."}
        </p>
        <div className="mt-4">
          <ChapterBadges chapters={structured.sources ?? snapshot?.sources} trackingMode={trackingMode} />
        </div>
        {status === "fallback" ? (
          <div className="type-caption mt-3 text-[var(--color-secondary)]">Showing saved-note summary.</div>
        ) : null}
      </Section>

      {showLoadingState ? <PlaceLoadingState /> : null}

      {!showLoadingState && !hasUsefulPlaceProfile ? (
        <SparsePlaceState placeName={placeName} onDelete={() => setConfirmingDelete(true)} />
      ) : null}

      {!showLoadingState && hasUsefulPlaceProfile ? (
        <>
          <Section title="Main events" icon={Sparkles}>
            <EventList items={structured.events} trackingMode={trackingMode} />
          </Section>

          <Section title="Why it matters" icon={MapPin}>
            <p className="type-body max-w-[62ch] text-[var(--color-text-main)]">
              {structured.storyRole || "Scriba needs more saved notes before it can explain why this place matters."}
            </p>
          </Section>

          <Section title="People involved" icon={Users}>
            <CharactersList items={structured.charactersPresent} />
          </Section>

          {(structured.dynamics.length || structured.characterActivity.length) ? (
            <Section title="Character dynamics" icon={HeartHandshake}>
              {structured.dynamics.length ? <TextList items={structured.dynamics} /> : null}
              {structured.characterActivity.length ? (
                <div className={structured.dynamics.length ? "mt-4" : ""}>
                  <ActivitySentences items={structured.characterActivity} />
                </div>
              ) : null}
            </Section>
          ) : null}
        </>
      ) : null}

      <ActionBottomSheet
        open={confirmingDelete || Boolean(deleteError)}
        onClose={() => {
          if (isDeleting) return;
          setConfirmingDelete(false);
          setDeleteError("");
        }}
        title={deleteError || `Delete ${placeName || "this place"}?`}
        actions={[
          {
            id: "confirm-delete-place",
            label: isDeleting ? "Deleting place..." : "Delete permanently",
            onClick: handleDeletePlace,
            disabled: isDeleting,
            destructive: true,
          },
          {
            id: "keep-place",
            label: "Keep place",
            onClick: () => {
              setConfirmingDelete(false);
              setDeleteError("");
            },
            disabled: isDeleting,
          },
        ]}
      />
    </div>
  );
}
