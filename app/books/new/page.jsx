"use client";

import Link from "next/link";

export default function NewBookPage() {
  function onSubmit(e) {
    e.preventDefault();
    // Placeholder: API wire-up comes next step
    alert("Book creation will be wired up next.");
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-h1)" }}>
          Create your first book
        </h1>
        <p className="mt-1 text-[var(--color-secondary)]">Add a title and author to get started.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--color-secondary)]">Title</label>
          <input
            type="text"
            name="title"
            placeholder="e.g., Red Rising"
            className="mt-1 w-full rounded-lg border border-[color:var(--rc-color-text-secondary)/25%] bg-white/70 px-3 py-2 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--color-secondary)]">Author</label>
          <input
            type="text"
            name="author"
            placeholder="e.g., Pierce Brown"
            className="mt-1 w-full rounded-lg border border-[color:var(--rc-color-text-secondary)/25%] bg-white/70 px-3 py-2 outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-[var(--color-accent)] px-5 py-3 text-[var(--color-text-on-accent)]"
        >
          Save book
        </button>
      </form>

      <div className="mt-6">
        <Link href="/" className="text-[var(--color-text-accent)] underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

