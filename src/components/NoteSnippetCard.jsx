import Link from "next/link";

function Placeholder({ label }) {
  return <span className="text-[var(--color-text-disabled)]">{label}</span>;
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function buildNotePreview(aiSummary, content, maxLength = 150) {
  let text =
    typeof content === "string" ? content.replace(/\s+/g, " ").trim() : "";

  if (!text && aiSummary) {
    if (typeof aiSummary === "string") {
      text = aiSummary;
    } else if (typeof aiSummary === "object") {
      const blocks = [];
      if (Array.isArray(aiSummary.summary)) blocks.push(...aiSummary.summary);
      if (Array.isArray(aiSummary.bullets)) blocks.push(...aiSummary.bullets);
      if (!blocks.length && Array.isArray(aiSummary)) blocks.push(...aiSummary);
      text = blocks
        .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
        .join(" ");
    }
    text = (text || "").replace(/\s+/g, " ").trim();
  }

  if (!text) return "";
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const withoutPartial = sliced.replace(/\s+\S*$/, "");
  const base = withoutPartial.trim() || sliced.trim();
  return `${base} (...)`;
}

function NotePreview({ aiSummary, content }) {
  const preview = buildNotePreview(aiSummary, content);
  if (!preview) return <Placeholder label="No content yet" />;
  return (
    <p className="text-sm leading-6 text-[var(--color-text-main)]">{preview}</p>
  );
}

export default function NoteSnippetCard({ bookId, chapter, note, showLink = true }) {
  const href =
    note?.id && bookId != null && chapter != null
      ? `/books/${bookId}/chapters/${chapter}/notes/${note.id}`
      : undefined;

  return (
    <div className="rounded-xl bg-[var(--color-page)] p-4">
      {note ? (
        <>
          <div className="text-lg font-medium text-[var(--color-text-main)]">
            {formatDateTime(note.created_at)}
          </div>
          <div className="mt-1 text-sm text-[var(--color-secondary)]">Note captured</div>
          <div className="mt-3">
            <NotePreview aiSummary={note.ai_summary} content={note.content} />
          </div>
          {showLink && href ? (
            <div className="mt-3">
              <Link
                href={href}
                className="inline-flex items-center gap-2 text-[var(--color-text-accent)] underline"
              >
                View full note
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-2">
          <div className="h-5 w-2/3 animate-pulse rounded bg-[color:var(--rc-color-text-secondary)/20%]" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-[color:var(--rc-color-text-secondary)/15%]" />
          <div className="mt-2 space-y-2">
            <div className="h-4 w-11/12 animate-pulse rounded bg-[color:var(--rc-color-text-secondary)/15%]" />
            <div className="h-4 w-10/12 animate-pulse rounded bg-[color:var(--rc-color-text-secondary)/15%]" />
          </div>
          <div className="caption pt-1 text-[var(--color-secondary)]">Populating from your notes...</div>
        </div>
      )}
    </div>
  );
}
