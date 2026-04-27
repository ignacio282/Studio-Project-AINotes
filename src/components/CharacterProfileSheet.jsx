"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleDot,
  Clock3,
  HeartHandshake,
  ListChecks,
  Route,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import ActionBottomSheet from "@/components/ui/ActionBottomSheet";
import { formatProgressLabel, normalizeTrackingMode } from "@/lib/books/progress";
import { getFriendlyErrorMessage } from "@/lib/errors/user-facing";

function toStringList(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const name = typeof item.name === "string" ? item.name.trim() : "";
        const label = typeof item.label === "string" ? item.label.trim() : "";
        if (name && label) return `${name} - ${label}`;
        return name || label;
      }
      return "";
    })
    .filter(Boolean);
}

function uniqueStringList(items) {
  const seen = new Set();
  const result = [];
  toStringList(items).forEach((item) => {
    const key = item.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

function normalizeLabeledItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { label: text, evidence: "" } : null;
      }
      if (!item || typeof item !== "object") return null;
      const label =
        typeof item.label === "string" && item.label.trim()
          ? item.label.trim()
          : typeof item.text === "string"
            ? item.text.trim()
            : "";
      const evidence = typeof item.evidence === "string" ? item.evidence.trim() : "";
      if (!label) return null;
      return { label, evidence };
    })
    .filter(Boolean);
}

function normalizeRelationshipCards(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const { label, detail } = splitLabelAndDetail(item);
        return label && detail ? { name: label, label: "", summary: detail, beats: [] } : null;
      }
      if (!item || typeof item !== "object") return null;
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const summary =
        typeof item.summary === "string" && item.summary.trim()
          ? item.summary.trim()
          : typeof item.detail === "string"
            ? item.detail.trim()
            : "";
      const beats = uniqueStringList(item.beats);
      if (!name || (!summary && !beats.length)) return null;
      return { name, label, summary, beats };
    })
    .filter(Boolean);
}

function normalizeSnapshot(snapshot) {
  const structured = snapshot?.structured && typeof snapshot.structured === "object" ? snapshot.structured : {};
  const summary =
    typeof structured.summary === "string" && structured.summary.trim()
      ? structured.summary.trim()
      : typeof snapshot?.answer === "string"
        ? snapshot.answer.trim()
        : "";
  return {
    ...snapshot,
    structured: {
      characterSheetVersion: Number(structured.characterSheetVersion) || 0,
      roleLabel: typeof structured.roleLabel === "string" ? structured.roleLabel.trim() : "",
      summary,
      quickMemory: typeof structured.quickMemory === "string" ? structured.quickMemory.trim() : "",
      roleInStory: typeof structured.roleInStory === "string" ? structured.roleInStory.trim() : "",
      developmentArc: typeof structured.developmentArc === "string" ? structured.developmentArc.trim() : "",
      traits: normalizeLabeledItems(structured.traits),
      motivations: normalizeLabeledItems(structured.motivations),
      distinctives: uniqueStringList(structured.distinctives),
      relationships: normalizeRelationshipCards(structured.relationships),
      evidence: uniqueStringList(structured.evidence),
      timeline: Array.isArray(structured.timeline) ? structured.timeline : [],
      openQuestions: uniqueStringList(structured.openQuestions),
    },
  };
}

function isLowValueProfileText(value) {
  const text = typeof value === "string" ? value.toLowerCase() : "";
  if (!text.trim()) return true;
  return [
    "highlighted in chapter",
    "driving the narrative forward",
    "central figure in chapter",
    "provided notes",
    "primary lens for the narrative",
    "character dynamics are described",
  ].some((needle) => text.includes(needle));
}

function cleanRoleLabel(value, characterName) {
  const label = typeof value === "string" ? value.trim() : "";
  if (!label) return "";
  const lower = label.toLowerCase();
  const nameLower = typeof characterName === "string" ? characterName.toLowerCase() : "";
  if (lower === nameLower || lower === "character" || lower === "connected character") return "";
  return label;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EmptyLine({ label = "Not captured yet" }) {
  return <div className="type-body text-[var(--color-text-disabled)]">{label}</div>;
}

function StatChip({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[8px] bg-[var(--color-page)] px-3 py-3">
      <div className="flex items-center gap-2 text-[var(--color-secondary)]">
        {Icon ? <Icon className="h-3.5 w-3.5 text-[var(--color-text-accent)]" aria-hidden="true" /> : null}
        <div className="type-caption">{label}</div>
      </div>
      <div className="type-title mt-1 text-[var(--color-text-main)]">{value || "-"}</div>
    </div>
  );
}

function ProfileSection({ title, icon: Icon, tone = "default", children }) {
  return (
    <section
      className={[
        "rounded-[8px] p-5",
        tone === "accent"
          ? "bg-[var(--color-accent-subtle)]"
          : "bg-[var(--color-surface)]",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-page)] text-[var(--color-text-accent)]">
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
        ) : null}
        <h2 className="type-title text-[var(--color-text-main)]">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EntityLoadingState({ title = "Building profile..." }) {
  return (
    <section className="p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[8px] bg-[var(--color-accent-subtle)] text-[var(--color-text-accent)]">
        <Sparkles className="h-5 w-5 animate-pulse" aria-hidden="true" />
      </div>
      <h2 className="type-title mt-4 text-[var(--color-text-main)]">{title}</h2>
      <p className="type-body mx-auto mt-2 max-w-[34ch] text-[var(--color-secondary)]">
        Scriba is reading your saved notes and preparing a cleaner profile.
      </p>
    </section>
  );
}

function SparseProfileState({ characterName, onDelete }) {
  return (
    <section className="rounded-[8px] bg-[var(--color-surface)] p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[8px] bg-[var(--color-page)] text-[var(--color-text-accent)]">
        <BookOpen className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="type-title mt-4 text-[var(--color-text-main)]">Not enough information yet</h2>
      <p className="type-body mx-auto mt-2 max-w-[38ch] text-[var(--color-secondary)]">
        Write more about {characterName || "this character"} in your notes if you would like to see their role, relationships, motivations, and timeline here.
      </p>
      <button
        type="button"
        onClick={onDelete}
        className="type-button mt-5 rounded-[8px] bg-[var(--color-page)] px-4 py-2 text-[var(--color-secondary)] transition hover:text-[var(--color-text-main)]"
      >
        Delete this character
      </button>
    </section>
  );
}

function TextBlock({ text, emptyLabel = "Not captured yet" }) {
  const value = typeof text === "string" ? text.trim() : "";
  if (!value) return <EmptyLine label={emptyLabel} />;
  return <p className="type-body max-w-[62ch] text-[var(--color-text-main)]">{value}</p>;
}

function LabeledList({ items }) {
  if (!items.length) return <EmptyLine />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="rounded-[8px] bg-[var(--color-page)] px-4 py-3"
        >
          <div className="flex items-start gap-2">
            <CircleDot className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--color-text-accent)]" aria-hidden="true" />
            <div className="type-title text-[var(--color-text-main)]">{item.label}</div>
          </div>
          {item.evidence ? (
            <div className="type-body mt-2 text-[var(--color-secondary)]">{item.evidence}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function splitLabelAndDetail(item) {
  const text = typeof item === "string" ? item.trim() : "";
  const match = text.match(/^([^:]{1,48}):\s*(.+)$/);
  if (!match) return { label: "", detail: text };
  return { label: match[1].trim(), detail: match[2].trim() };
}

function RelationshipCards({ items, fallbackItems }) {
  const cards = Array.isArray(items) ? items : [];
  if (!cards.length) return <RelationshipList items={fallbackItems || []} />;
  return (
    <div className="space-y-3">
      {cards.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="rounded-[8px] bg-[var(--color-page)] px-4 py-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="type-title text-[var(--color-text-main)]">{item.name}</div>
            {item.label ? (
              <div className="type-caption rounded-full bg-[var(--color-accent-subtle)] px-2.5 py-1 text-[var(--color-text-accent)]">
                {item.label}
              </div>
            ) : null}
          </div>
          {item.summary ? <div className="type-body mt-2 text-[var(--color-text-main)]">{item.summary}</div> : null}
          {item.beats?.length ? (
            <div className="mt-3 space-y-2 border-l border-[var(--color-accent-subtle)] pl-3">
              {item.beats.map((beat, beatIndex) => (
                <div key={`${beat}-${beatIndex}`} className="type-body text-[var(--color-secondary)]">
                  {beat}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function RelationshipList({ items }) {
  const list = uniqueStringList(items);
  if (!list.length) return <EmptyLine />;
  return (
    <div className="space-y-3">
      {list.map((item, index) => {
        const { label, detail } = splitLabelAndDetail(item);
        const details = detail.split(/;\s+/).map((entry) => entry.trim()).filter(Boolean);
        return (
          <div key={`${item}-${index}`} className="rounded-[8px] bg-[var(--color-page)] px-4 py-3">
            {label ? <div className="type-title text-[var(--color-text-main)]">{label}</div> : null}
            <div className={label ? "mt-1 space-y-1" : "space-y-1"}>
              {(details.length ? details : [detail]).map((entry, detailIndex) => (
                <div key={`${entry}-${detailIndex}`} className="type-body text-[var(--color-text-main)]">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SourceLinks({ chapters, noteLinks, trackingMode }) {
  const list = Array.isArray(chapters)
    ? Array.from(new Set(chapters.map((chapter) => Number(chapter)).filter((chapter) => Number.isFinite(chapter) && chapter > 0)))
    : [];
  if (!list.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {list.map((chapter) => {
        const label = formatProgressLabel(trackingMode, chapter);
        const href = noteLinks?.[String(chapter)] || "";
        return href ? (
          <Link
            key={chapter}
            href={href}
            className="type-caption inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-subtle)] px-3 py-1 text-[var(--color-text-accent)]"
          >
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            {label}
          </Link>
        ) : (
          <span key={chapter} className="type-caption rounded-full bg-[var(--color-page)] px-3 py-1 text-[var(--color-secondary)]">
            {label}
          </span>
        );
      })}
    </div>
  );
}

function SourceDisclosure({ chapters, noteLinks, trackingMode, open, onToggle }) {
  const list = Array.isArray(chapters)
    ? chapters.map((chapter) => Number(chapter)).filter((chapter) => Number.isFinite(chapter) && chapter > 0)
    : [];
  if (!list.length) return null;
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="type-button inline-flex items-center gap-1.5 text-[var(--color-text-accent)]"
      >
        See sources
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <SourceLinks chapters={chapters} noteLinks={noteLinks} trackingMode={trackingMode} />
      ) : null}
    </div>
  );
}

function Timeline({ items, fallbackItems, noteLinks, trackingMode }) {
  const source = items.length ? items : fallbackItems;
  if (!source.length) return <EmptyLine />;
  return (
    <div className="space-y-3">
      {source.map((item, index) => {
        const chapter = Number(item.chapterNumber ?? item.chapter ?? item.first_chapter);
        const event =
          typeof item.event === "string"
            ? item.event.trim()
            : typeof item.snippet === "string"
              ? item.snippet.trim()
              : "";
        const href = Number.isFinite(chapter) ? noteLinks?.[String(chapter)] : "";
        return (
          <div key={`${chapter}-${event}-${index}`} className="rounded-[8px] bg-[var(--color-page)] px-4 py-3">
            <div className="type-caption text-[var(--color-text-accent)]">
              {Number.isFinite(chapter) ? formatProgressLabel(trackingMode, chapter) : "Unknown point"}
            </div>
            <div className="type-body mt-1 text-[var(--color-text-main)]">
              {event || "Not captured yet"}
            </div>
            {href ? (
              <div className="mt-2">
                <Link href={href} className="type-caption text-[var(--color-text-accent)] underline">
                  Open note
                </Link>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function CharacterProfileSheet({
  bookId,
  slug,
  character,
  initialSnapshot,
  trackingMode,
  noteLinks,
}) {
  const router = useRouter();
  const normalizedTrackingMode = normalizeTrackingMode(trackingMode);
  const [snapshot, setSnapshot] = useState(() => normalizeSnapshot(initialSnapshot));
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const requestedSnapshotRef = useRef(false);

  const structured = snapshot?.structured ?? {};
  const firstLabel = formatProgressLabel(normalizedTrackingMode, character?.first_chapter);
  const lastLabel = formatProgressLabel(normalizedTrackingMode, character?.last_chapter);
  const fallbackSources = [character?.first_chapter, character?.last_chapter]
    .map((value) => Number(value))
    .filter((value, index, list) => Number.isFinite(value) && value > 0 && list.indexOf(value) === index);
  const effectiveSources = Array.isArray(snapshot?.sources) && snapshot.sources.length > 0 ? snapshot.sources : fallbackSources;
  const sourceCount = effectiveSources.length;
  const baseRelationships = uniqueStringList(character?.relationships);
  const fallbackTimeline = Array.isArray(character?.timeline) ? character.timeline : [];
  const fallbackSummary = [character?.short_bio, character?.full_bio]
    .filter((value) => typeof value === "string" && value.trim() && !isLowValueProfileText(value))
    .map((value) => value.trim())[0];
  const summary =
    (!isLowValueProfileText(structured.summary) ? structured.summary : "") ||
    fallbackSummary ||
    "Scriba has noticed this character, but your notes have not captured a clear profile yet.";
  const role =
    cleanRoleLabel(structured.roleLabel, character?.name) ||
    cleanRoleLabel(character?.role, character?.name) ||
    "Role not clear yet";
  const showProfileLoading = isUpdating;
  const hasUsefulProfile =
    Boolean(structured.roleInStory || structured.developmentArc) ||
    (structured.traits?.length || 0) > 0 ||
    (structured.motivations?.length || 0) > 0 ||
    (structured.relationships?.length || 0) > 0 ||
    (baseRelationships.length || 0) > 0 ||
    (structured.timeline?.length || fallbackTimeline.length || 0) > 1;
  const shouldGenerate = useMemo(() => {
    if (!bookId || !slug) return false;
    if (structured.characterSheetVersion < 5) return true;
    const hasRichSnapshot =
      (structured.traits?.length || 0) +
        (structured.motivations?.length || 0) +
        (structured.distinctives?.length || 0) +
        (structured.relationships?.length || 0) +
        (structured.roleInStory ? 1 : 0) +
        (structured.developmentArc ? 1 : 0) +
        (structured.timeline?.length || 0) +
        (structured.evidence?.length || 0) >
      1;
    if (snapshot?.id && !hasRichSnapshot) return true;
    if (!snapshot?.id) return true;
    const snapshotTime = new Date(snapshot.created_at || "").getTime();
    const characterTime = new Date(character?.updated_at || "").getTime();
    return Number.isFinite(snapshotTime) && Number.isFinite(characterTime) && characterTime > snapshotTime;
  }, [
    bookId,
    slug,
    snapshot?.id,
    snapshot?.created_at,
    character?.updated_at,
    structured.traits?.length,
    structured.motivations?.length,
    structured.distinctives?.length,
    structured.relationships?.length,
    structured.roleInStory,
    structured.developmentArc,
    structured.timeline?.length,
    structured.evidence?.length,
    structured.characterSheetVersion,
  ]);

  useEffect(() => {
    if (!shouldGenerate || requestedSnapshotRef.current) return;
    let active = true;
    requestedSnapshotRef.current = true;
    const generate = async () => {
      try {
        setIsUpdating(true);
        setUpdateError("");
        const response = await fetch(
          `/api/books/${encodeURIComponent(bookId)}/characters/${encodeURIComponent(slug)}/snapshot`,
          { method: "POST" },
        );
        if (!response.ok) {
          let message = "Unable to update character profile.";
          try {
            const payload = await response.json();
            if (payload?.error) message = getFriendlyErrorMessage(payload.error, message);
          } catch {}
          throw new Error(message);
        }
        const payload = await response.json();
        if (active && payload?.snapshot) {
          setSnapshot(normalizeSnapshot(payload.snapshot));
          requestedSnapshotRef.current = false;
        }
      } catch (error) {
        if (active) {
          setUpdateError(getFriendlyErrorMessage(error, "Unable to update character profile right now."));
        }
      } finally {
        if (active) {
          setIsUpdating(false);
        }
      }
    };
    void generate();
    return () => {
      active = false;
    };
  }, [bookId, slug, shouldGenerate]);

  const handleDeleteCharacter = async () => {
    if (!bookId || !slug || isDeleting) return;

    try {
      setIsDeleting(true);
      setDeleteError("");
      const response = await fetch(
        `/api/characters/${encodeURIComponent(bookId)}/${encodeURIComponent(slug)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        let message = "Unable to delete this character.";
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
      setDeleteError(getFriendlyErrorMessage(error, "Unable to delete this character right now."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-[8px] bg-[var(--color-surface)]">
        <div className="h-1.5 bg-[var(--color-accent)]" aria-hidden="true" />
        <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="type-caption flex items-center gap-2 text-[var(--color-secondary)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-text-accent)]" aria-hidden="true" />
              Character sheet
            </div>
            <h1 className="type-h2 mt-1 text-[var(--color-text-main)]">{character?.name || "Unknown"}</h1>
            <div className="type-caption mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-subtle)] px-3 py-1 text-[var(--color-text-accent)]">
              <Shield className="h-3 w-3" aria-hidden="true" />
              {role}
            </div>
          </div>
        </div>

        <p className="type-body mt-5 max-w-[62ch] text-[var(--color-text-main)]">{summary}</p>
        {updateError ? (
          <div className="type-caption mt-3 text-[var(--color-secondary)]">
            Using saved character details for now.
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <StatChip label="First seen" value={firstLabel} icon={CalendarDays} />
          <StatChip label="Last seen" value={lastLabel} icon={Clock3} />
          <StatChip label="Appearances" value={sourceCount ? String(sourceCount) : "-"} icon={ListChecks} />
        </div>
        <SourceDisclosure
          chapters={effectiveSources}
          noteLinks={noteLinks}
          trackingMode={normalizedTrackingMode}
          open={sourcesOpen}
          onToggle={() => setSourcesOpen((value) => !value)}
        />
        {snapshot?.created_at ? (
          <div className="type-caption mt-4 text-[var(--color-secondary)]">
            Snapshot updated {formatDate(snapshot.created_at)}
          </div>
        ) : null}
        </div>
      </section>

      {showProfileLoading ? <EntityLoadingState title="Building character profile..." /> : null}

      {!showProfileLoading && !hasUsefulProfile ? (
        <SparseProfileState characterName={character?.name} onDelete={() => setConfirmingDelete(true)} />
      ) : null}

      {!showProfileLoading && hasUsefulProfile ? (
        <>
      <ProfileSection title="Role in the story" icon={BookOpen} tone="accent">
        <TextBlock text={structured.roleInStory} />
      </ProfileSection>

      <ProfileSection title="Key relationships" icon={HeartHandshake}>
        <RelationshipCards items={structured.relationships || []} fallbackItems={baseRelationships} />
      </ProfileSection>

      <ProfileSection title="How they're changing" icon={TrendingUp} tone="accent">
        <TextBlock text={structured.developmentArc} />
      </ProfileSection>

      <ProfileSection title="Traits" icon={Sparkles}>
        <LabeledList items={structured.traits || []} />
      </ProfileSection>

      <ProfileSection title="Motivations" icon={Shield}>
        <LabeledList items={structured.motivations || []} />
      </ProfileSection>

      <ProfileSection title="What they've been doing" icon={Route}>
        <Timeline
          items={structured.timeline || []}
          fallbackItems={fallbackTimeline}
          noteLinks={noteLinks}
          trackingMode={normalizedTrackingMode}
        />
      </ProfileSection>
        </>
      ) : null}

      <ActionBottomSheet
        open={confirmingDelete || Boolean(deleteError)}
        onClose={() => {
          if (isDeleting) return;
          setConfirmingDelete(false);
          setDeleteError("");
        }}
        title={deleteError || `Delete ${character?.name || "this character"}?`}
        actions={[
          {
            id: "confirm-delete-character",
            label: isDeleting ? "Deleting character..." : "Delete permanently",
            onClick: handleDeleteCharacter,
            disabled: isDeleting,
            destructive: true,
          },
          {
            id: "keep-character",
            label: "Keep character",
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
