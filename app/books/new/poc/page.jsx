"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackArrowIcon from "@/components/BackArrowIcon";

const SEARCH_DEBOUNCE_MS = 350;

function asValue(value) {
  return typeof value === "string" ? value : "";
}

export default function NewBookSearchPocPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [providerMode, setProviderMode] = useState("auto");
  const [provider, setProvider] = useState("");
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(true);
  const [googleStatus, setGoogleStatus] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    title: "",
    author: "",
    publisher: "",
    chapters: "",
    coverUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdBookId, setCreatedBookId] = useState("");

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setLoading(false);
      setSearchError("");
      setProvider("");
      setFallbackUsed(false);
      setGoogleStatus("");
      setGoogleError("");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setSearchError("");
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query.trim())}&limit=8&provider=${encodeURIComponent(providerMode)}`,
          {
          signal: controller.signal,
          },
        );
        if (!res.ok) {
          let message = "Search failed";
          try {
            const payload = await res.json();
            if (payload?.error) message = payload.error;
          } catch {}
          throw new Error(message);
        }
        const payload = await res.json();
        const list = Array.isArray(payload?.results) ? payload.results : [];
        setResults(list);
        setProvider(asValue(payload?.provider));
        setFallbackUsed(Boolean(payload?.fallbackUsed));
        setGoogleConfigured(payload?.googleConfigured === false ? false : true);
        setGoogleStatus(asValue(payload?.googleStatus));
        setGoogleError(asValue(payload?.googleError));
      } catch (err) {
        if (controller.signal.aborted) return;
        setSearchError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, providerMode, query]);

  const onSelectResult = (result) => {
    setSelectedId(asValue(result?.id));
    setForm((prev) => ({
      ...prev,
      title: asValue(result?.title),
      author: asValue(result?.author),
      publisher: asValue(result?.publisher),
      coverUrl: asValue(result?.coverUrl),
    }));
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function onCreateBook(e) {
    e.preventDefault();
    setSubmitError("");
    setCreatedBookId("");
    const title = form.title.trim();
    if (!title) {
      setSubmitError("Title is required.");
      return;
    }

    setSubmitting(true);
    try {
      const totalChapters = form.chapters ? Number(form.chapters) : undefined;
      const payload = {
        title,
        author: form.author.trim() || undefined,
        publisher: form.publisher.trim() || undefined,
        totalChapters: Number.isFinite(totalChapters) && totalChapters > 0 ? totalChapters : undefined,
        coverUrl: form.coverUrl.trim() || undefined,
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
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {}
        throw new Error(message);
      }
      const data = await res.json();
      const id = asValue(data?.book?.id);
      if (id) {
        setCreatedBookId(id);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to create book");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--color-page)] px-6 py-6 text-[var(--color-text-main)]">
      <header className="mb-6 flex items-center">
        <button
          type="button"
          onClick={() => router.push("/books/new")}
          aria-label="Go back"
          className="mr-2 text-[var(--color-text-main)]"
        >
          <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
        </button>
        <h1 className="type-h2">Add Book Search POC</h1>
      </header>

      <p className="type-caption mb-4 text-[var(--color-secondary)]">
        This is an isolated prototype. Current add-book flow remains unchanged.
      </p>

      <div className="rounded-2xl border border-[color:var(--rc-color-text-secondary)/25%] bg-white/70 p-4">
        <label className="type-body block text-[var(--color-secondary)]">Search title or author</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="The Hobbit, Tolkien..."
          className="type-body mt-2 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
        />
        <p className="type-caption mt-2 text-[var(--color-secondary)]">Type at least 2 characters</p>
        <div className="mt-3">
          <label className="type-caption block text-[var(--color-secondary)]">Provider mode</label>
          <select
            value={providerMode}
            onChange={(e) => setProviderMode(e.target.value)}
            className="type-body mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
          >
            <option value="auto">Auto (Google then fallback)</option>
            <option value="google">Google only</option>
            <option value="openlibrary">Open Library only</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        {loading ? <p className="type-caption text-[var(--color-secondary)]">Searching...</p> : null}
        {searchError ? <p className="type-caption text-red-700">{searchError}</p> : null}
        {!loading && !searchError && provider ? (
          <p className="type-caption text-[var(--color-secondary)]">
            Results from {provider === "google_books" ? "Google Books" : "Open Library"}
            {fallbackUsed ? " (fallback)" : ""}.
          </p>
        ) : null}
        {!loading && !searchError && !googleConfigured ? (
          <p className="type-caption text-[var(--color-secondary)]">
            Google Books API key is not configured, so this search is using Open Library.
          </p>
        ) : null}
        {!loading && !searchError && googleStatus ? (
          <p className="type-caption text-[var(--color-secondary)]">Google status: {googleStatus}.</p>
        ) : null}
        {!loading && !searchError && googleError ? (
          <p className="type-caption text-red-700">Google error: {googleError}</p>
        ) : null}
        {!loading && canSearch && !searchError && results.length === 0 ? (
          <p className="type-caption text-[var(--color-secondary)]">No matches found.</p>
        ) : null}
        <div className="mt-2 space-y-2">
          {results.map((result) => {
            const isSelected = asValue(result?.id) === selectedId;
            return (
              <button
                type="button"
                key={asValue(result?.id)}
                onClick={() => onSelectResult(result)}
                className={`w-full rounded-xl border p-3 text-left ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[color:var(--color-accent)/8%]"
                    : "border-[color:var(--rc-color-text-secondary)/25%] bg-white/60"
                }`}
              >
                <div className="flex gap-3">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-[color:var(--rc-color-text-secondary)/15%]">
                    {asValue(result?.coverUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asValue(result?.coverUrl)} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="type-body truncate text-[var(--color-text-main)]">{asValue(result?.title)}</div>
                    <div className="type-caption truncate text-[var(--color-secondary)]">
                      {asValue(result?.author) || "Unknown author"}
                    </div>
                    <div className="type-caption truncate text-[var(--color-secondary)]">
                      {asValue(result?.publisher) || "Unknown publisher"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={onCreateBook} className="mt-6 space-y-4">
        <h2 className="type-h3">Autofilled Fields</h2>
        <div>
          <label className="type-body block text-[var(--color-secondary)]">Title</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={onFormChange}
            className="type-body mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
            required
          />
        </div>
        <div>
          <label className="type-body block text-[var(--color-secondary)]">Author</label>
          <input
            type="text"
            name="author"
            value={form.author}
            onChange={onFormChange}
            className="type-body mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="type-body block text-[var(--color-secondary)]">Publisher</label>
          <input
            type="text"
            name="publisher"
            value={form.publisher}
            onChange={onFormChange}
            className="type-body mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="type-body block text-[var(--color-secondary)]">Cover URL</label>
          <input
            type="url"
            name="coverUrl"
            value={form.coverUrl}
            onChange={onFormChange}
            placeholder="https://..."
            className="type-body mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
          />
          {form.coverUrl ? (
            <div className="mt-3 h-32 w-24 overflow-hidden rounded-xl bg-white/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.coverUrl} alt="Selected cover preview" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </div>
        <div>
          <label className="type-body block text-[var(--color-secondary)]"># of chapters (optional)</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            name="chapters"
            value={form.chapters}
            onChange={onFormChange}
            className="type-body mt-1 w-full rounded-xl border border-[color:var(--rc-color-text-secondary)/35%] bg-white/80 px-4 py-3 outline-none"
          />
        </div>

        {submitError ? <p className="type-caption text-red-700">{submitError}</p> : null}
        {createdBookId ? (
          <div className="rounded-xl border border-green-600/30 bg-green-50 p-3">
            <p className="type-caption text-green-800">Book created successfully.</p>
            <p className="type-small text-green-800">ID: {createdBookId}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="type-button w-full rounded-2xl bg-[var(--color-accent)] px-5 py-4 text-center text-[var(--color-text-on-accent)] disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create Test Book"}
        </button>
      </form>

      <p className="type-small mt-6 text-[var(--color-secondary)]">
        Search metadata provided by{" "}
        <a
          href="https://developers.google.com/books"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Google Books
        </a>
        {" "}with{" "}
        <a
          href="https://openlibrary.org/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Open Library
        </a>
        {" "}as fallback.
      </p>
    </div>
  );
}

