"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function BackArrow({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Go back" className="mr-2 text-[var(--color-text-main)]">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default function NewBookPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", author: "", publisher: "", chapters: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const totalChapters = form.chapters ? Number(form.chapters) : undefined;
      const payload = {
        title: form.title,
        author: form.author,
        publisher: form.publisher || undefined,
        totalChapters: Number.isFinite(totalChapters) && totalChapters > 0 ? totalChapters : undefined,
        status: "reading",
      };
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let message = "Unable to create book";
        try {
          const err = await res.json();
          if (err?.error) message = err.error;
        } catch {}
        throw new Error(message);
      }
      const data = await res.json();
      const id = data?.book?.id;
      if (id) {
        try {
          localStorage.setItem("rc.currentBookId", id);
        } catch {}
        router.push(`/books/${encodeURIComponent(id)}/journal`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[var(--color-page)] px-6 py-6 text-[var(--color-text-main)]">
      <header className="mb-6 flex items-center">
        <BackArrow onClick={() => router.back()} />
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-h1)" }}>
          Add a book
        </h1>
      </header>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-[var(--color-secondary)]">Title</label>
            <input
              type="text"
              name="title"
              placeholder="Red Rising"
              value={form.title}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-secondary)]">Author</label>
            <input
              type="text"
              name="author"
              placeholder="Pierce Brown"
              value={form.author}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-secondary)]">Publisher</label>
            <input
              type="text"
              name="publisher"
              placeholder="Penguin Random House"
              value={form.publisher}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-secondary)]"># of chapters</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              name="chapters"
              placeholder="21"
              value={form.chapters}
              onChange={onChange}
              className="mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
            />
          </div>
        </div>

        {error ? <div className="mt-4 text-sm text-red-700">{error}</div> : null}

        <div className="mt-auto pt-6">
          <button
            type="submit"
            disabled={submitting || !form.title.trim()}
            className="w-full rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-center text-[var(--color-text-on-accent)] disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Start reading"}
          </button>
        </div>
      </form>
    </div>
  );
}

