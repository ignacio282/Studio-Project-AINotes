import Link from "next/link";
import { redirect } from "next/navigation";
import BackArrowIcon from "@/components/BackArrowIcon";
import { requireUser } from "@/lib/supabase/require-user";
import { fetchBooksDashboardData } from "@/lib/books/dashboard-data";
import SwitchBooksClient from "./SwitchBooksClient";

export const dynamic = "force-dynamic";

export default async function SwitchBookPage() {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login");

  const { books, currentBook } = await fetchBooksDashboardData(supabase, user.id);
  if (!books.length) {
    redirect("/library");
  }

  const selectableBooks = books.filter((book) => book.status !== "completed");
  if (selectableBooks.length <= 1) {
    redirect("/library");
  }

  return (
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-main)]">
      <main className="mx-auto max-w-2xl px-6 pb-20 pt-10">
        <header className="mb-10 flex items-center gap-4">
          <Link href="/library" className="text-[var(--color-text-main)]">
            <BackArrowIcon className="h-9 w-9 text-[var(--color-text-main)]" />
          </Link>
          <h1 className="text-[24px] leading-8 font-medium" style={{ fontFamily: "var(--font-h2)" }}>
            Switch book
          </h1>
        </header>

        <SwitchBooksClient currentBookId={currentBook?.id || ""} books={selectableBooks} />
      </main>
    </div>
  );
}
