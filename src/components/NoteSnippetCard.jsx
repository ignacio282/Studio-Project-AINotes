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

function NoteBullets({ aiSummary, content }) {
  let bullets = [];
  if (aiSummary && typeof aiSummary === "object") {
    if (Array.isArray(aiSummary?.bullets)) bullets = aiSummary.bullets;
    if (!bullets.length && Array.isArray(aiSummary)) bullets = aiSummary;
  }
  if (!bullets.length && typeof content === "string") {
    const sentences = content.split(/(?<=[.!?])\s+/).slice(0, 2);
    bullets = sentences.filter(Boolean);
  }
  if (!bullets.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-[var(--color-text-main)]">
      {bullets.map((b, i) => (
        <li key={i} className="text-sm leading-6">
          {typeof b === "string" ? b : JSON.stringify(b)}
        </li>
      ))}
    </ul>
  );
}

export default function NoteSnippetCard({ bookId, chapter, note, showLink = true }) {
  const href = note?.id && bookId != null && chapter != null
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
            <NoteBullets aiSummary={note.ai_summary} content={note.content} />
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
          <div className="caption pt-1 text-[var(--color-secondary)]">Populating from your notes…</div>
        </div>
      )}
    </div>
  );
}
