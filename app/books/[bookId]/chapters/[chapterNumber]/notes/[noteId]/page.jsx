import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

export default async function NoteDetailPage({ params }) {
  const { bookId, chapterNumber, noteId } = await params;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("notes")
    .select("id,book_id,chapter_number,content,ai_summary,created_at")
    .eq("id", noteId)
    .single();

  const note = error ? null : data;

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      <header className="space-y-1">
        <div className="caption">Book {bookId} • Chapter {chapterNumber}</div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-title)" }}>
          Note
        </h1>
        <div className="text-sm text-[var(--color-secondary)]">
          {note?.created_at ? formatDateTime(note.created_at) : <Placeholder label="Unknown date" />}
        </div>
      </header>

      <section className="rounded-2xl bg-[var(--color-surface)] p-4">
        <div className="text-base font-semibold">Content</div>
        <div className="mt-2 whitespace-pre-wrap text-[var(--color-text-main)]">
          {note?.content || <Placeholder label="No content" />}
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--color-surface)] p-4">
        <div className="text-base font-semibold">AI Summary</div>
        <div className="mt-2 text-[var(--color-text-main)]">
          {note?.ai_summary ? (
            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(note.ai_summary, null, 2)}</pre>
          ) : (
            <Placeholder label="No summary yet" />
          )}
        </div>
      </section>
    </div>
  );
}

