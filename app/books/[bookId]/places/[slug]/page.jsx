import Link from "next/link";
import { redirect } from "next/navigation";
import BackArrowIcon from "@/components/BackArrowIcon";
import MissingResourcePage from "@/components/errors/MissingResourcePage";
import PlaceProfileSheet from "@/components/PlaceProfileSheet";
import QaLoadingPage from "@/components/qa/QaLoadingPage";
import { normalizeTrackingMode } from "@/lib/books/progress";
import { buildPlaceSnapshotFromKnowledge, fetchPlaceKnowledge } from "@/lib/knowledge/read";
import { resolveQaState } from "@/lib/qa/state";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlaceProfilePage({ params, searchParams }) {
  const { bookId, slug } = await params;
  const query = (await searchParams) || {};
  const qaState = resolveQaState(query);
  if (qaState === "loading") return <QaLoadingPage title="Loading place profile preview..." />;
  if (qaState === "error") {
    throw new Error("QA forced error state on Place page.");
  }

  const supabase = await getServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) {
    redirect("/login");
  }

  const { data: book } = await supabase
    .from("books")
    .select("id,title,tracking_mode")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (qaState !== "empty" && !book) {
    return (
      <MissingResourcePage
        title="Book not found"
        message="This place page can only open books from the signed-in account."
        actionHref="/library"
        actionLabel="Back to library"
      />
    );
  }

  const knowledge =
    qaState === "empty"
      ? null
      : await fetchPlaceKnowledge(supabase, user.id, bookId, slug).catch((error) => {
          console.error("Failed to read place knowledge:", error);
          return null;
        });
  const snapshot = buildPlaceSnapshotFromKnowledge(knowledge);

  if (!snapshot) {
    return (
      <MissingResourcePage
        title="Place not found"
        message="This place is not in your saved notes yet, or Scriba needs more context before building a place sheet."
        actionHref={`/books/${bookId}`}
        actionLabel="Back to book"
      />
    );
  }

  const trackingMode = normalizeTrackingMode(book?.tracking_mode);

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-surface)] bg-[var(--color-page)]">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
          <Link href={`/books/${bookId}`} className="text-[var(--color-text-main)]" aria-label="Back to book">
            <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
          </Link>
          <div className="min-w-0">
            <div className="type-caption text-[var(--color-secondary)]">{book?.title || "Book"}</div>
            <h1 className="type-title truncate text-[var(--color-text-main)]">{snapshot.place_name}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-6 py-6 pb-16">
        <section className="rounded-[8px] bg-[var(--color-surface)] p-5">
          <div className="type-caption text-[var(--color-secondary)]">Place sheet</div>
          <h2 className="type-h2 mt-1 text-[var(--color-text-main)]">{snapshot.place_name}</h2>
          <p className="type-body mt-3 max-w-[62ch] text-[var(--color-secondary)]">
            A short memory card built only from your saved notes.
          </p>
        </section>

        <PlaceProfileSheet
          bookId={bookId}
          slug={slug}
          initialSnapshot={snapshot}
          trackingMode={trackingMode}
        />
      </main>
    </div>
  );
}
