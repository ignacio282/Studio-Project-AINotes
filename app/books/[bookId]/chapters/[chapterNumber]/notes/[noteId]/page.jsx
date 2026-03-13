import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NoteSummaryView from "@/components/NoteSummaryView";
import BackArrowIcon from "@/components/BackArrowIcon";
import QaLoadingPage from "@/components/qa/QaLoadingPage";
import { resolveQaState } from "@/lib/qa/state";
import { formatProgressLabel, normalizeTrackingMode } from "@/lib/books/progress";

export const dynamic = "force-dynamic";

function Placeholder({ label }) {
  return <span className="type-body text-[var(--color-text-disabled)]">{label}</span>;
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function NoteDetailPage({ params, searchParams }) {
  const { bookId, chapterNumber, noteId } = await params;
  const query = (await searchParams) || {};
  const qaState = resolveQaState(query);
  if (qaState === "loading") return <QaLoadingPage title="Loading note detail preview..." />;
  if (qaState === "error") {
    throw new Error("QA forced error state on Note detail page.");
  }
  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect("/login");
  }
  const { data, error } = await supabase
    .from("notes")
    .select("id,book_id,chapter_number,content,ai_summary,created_at")
    .eq("id", noteId)
    .single();
  const { data: book } = await supabase
    .from("books")
    .select("tracking_mode")
    .eq("id", bookId)
    .single();

  const note = qaState === "empty" ? null : error ? null : data;
  const trackingMode = normalizeTrackingMode(book?.tracking_mode);

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
        <div className="caption">
          {formatProgressLabel(trackingMode, note?.chapter_number ?? chapterNumber)}
        </div>
        <h1 className="type-h2">
          Note
        </h1>
        <div className="type-body text-[var(--color-secondary)]">
          {note?.created_at ? (
            formatDateTime(note.created_at)
          ) : (
            <Placeholder label="Unknown date" />
          )}
        </div>
      </header>

      <section className="rounded-2xl bg-[var(--color-surface)] p-4">
        <div className="type-title">Content</div>
        <div className="type-body mt-2 whitespace-pre-wrap text-[var(--color-text-main)]">
          {note?.content || <Placeholder label="No content" />}
        </div>
      </section>

      <NoteSummaryView summary={note?.ai_summary} />
    </div>
  );
}
