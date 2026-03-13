import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackArrowIcon from "@/components/BackArrowIcon";
import BookAssistantChat from "@/components/BookAssistantChat";
import QaLoadingPage from "@/components/qa/QaLoadingPage";
import { resolveQaState } from "@/lib/qa/state";

export const dynamic = "force-dynamic";

export default async function BookAssistantPage({ params, searchParams }) {
  const { bookId } = await params;
  const query = (await searchParams) || {};
  const qaState = resolveQaState(query);
  if (qaState === "loading") return <QaLoadingPage title="Loading assistant preview..." />;
  if (qaState === "error") {
    throw new Error("QA forced error state on Assistant page.");
  }
  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    redirect("/login");
  }
  const { data: book } = await supabase
    .from("books")
    .select("id,title,author,tracking_mode")
    .eq("id", bookId)
    .single();

  return (
    <div className="assistant-page">
      <header className="assistant-header">
        <div className="assistant-header-inner">
          <Link href={`/books/${bookId}`} className="text-[var(--color-text-main)]">
            <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
          </Link>
          <div>
            <div className="assistant-title">{book?.title || "Untitled"}</div>
            <div className="assistant-subtitle">AI Review</div>
          </div>
        </div>
      </header>

      <main className="assistant-body">
        <BookAssistantChat
          bookId={bookId}
          bookTitle={book?.title || "this book"}
          trackingMode={book?.tracking_mode || "chapter"}
          qaState={qaState}
        />
      </main>
    </div>
  );
}
