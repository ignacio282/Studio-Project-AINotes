import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase/server";
import BackArrowIcon from "@/components/BackArrowIcon";
import BookAssistantChat from "@/components/BookAssistantChat";

export const dynamic = "force-dynamic";

export default async function BookAssistantPage({ params }) {
  const { bookId } = await params;
  const supabase = getServiceSupabase();
  const { data: book } = await supabase
    .from("books")
    .select("id,title,author")
    .eq("id", bookId)
    .single();

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      <div className="flex items-center gap-3">
        <Link href={`/books/${bookId}`} className="text-[var(--color-text-main)]">
          <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
        </Link>
        <div>
          <div className="caption">AI assistant</div>
          <div className="text-2xl font-semibold" style={{ fontFamily: "var(--font-h2)" }}>
            {book?.title || "Untitled"}
          </div>
          {book?.author ? (
            <div className="text-sm text-[var(--color-secondary)]">{book.author}</div>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-secondary)]">
        Ask about characters, places, or moments. I answer using only your notes up through the latest chapter you have logged.
      </section>

      <BookAssistantChat bookId={bookId} bookTitle={book?.title || "this book"} />
    </div>
  );
}
