import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NoteSummaryView from "@/components/NoteSummaryView";
import BackArrowIcon from "@/components/BackArrowIcon";

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
  const supabase = getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect("/login");
  }
  const { data, error } = await supabase
    .from("notes")
    .select("id,book_id,chapter_number,content,ai_summary,created_at")
    .eq("id", noteId)
    .single();

  const note = error ? null : data;

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      {/* Top bar / back */}
      <div className="pt-2">
        <Link
          href={`/books/${bookId}`}
          className="inline-flex items-center gap-2 text-[var(--color-text-main)]"
        >
          <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
          <span className="sr-only">Back to book</span>
        </Link>
      </div>

      <header className="space-y-1">
        <div className="caption">Chapter {chapterNumber}</div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-title)" }}
        >
          Note
        </h1>
        <div className="text-sm text-[var(--color-secondary)]">
          {note?.created_at ? (
            formatDateTime(note.created_at)
          ) : (
            <Placeholder label="Unknown date" />
          )}
        </div>
      </header>

      <section className="rounded-2xl bg-[var(--color-surface)] p-4">
        <div className="text-base font-semibold">Content</div>
        <div className="mt-2 whitespace-pre-wrap text-[var(--color-text-main)]">
          {note?.content || <Placeholder label="No content" />}
        </div>
      </section>

      <NoteSummaryView summary={note?.ai_summary} />
    </div>
  );
}
