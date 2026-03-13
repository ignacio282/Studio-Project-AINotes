"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import BackArrowIcon from "@/components/BackArrowIcon";

const SEARCH_DEBOUNCE_MS = 350;

const STEPS = {
  search: "search",
  results: "results",
  confirm: "confirm",
};

function asValue(value) {
  return typeof value === "string" ? value : "";
}

function createEmptyForm() {
  return {
    title: "",
    author: "",
    publisher: "",
    chapters: "",
    coverUrl: "",
  };
}

function SearchIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M15.5 15.5L20 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SearchField({ value, onChange, placeholder, autoFocus = false }) {
  return (
    <div className="flex h-14 items-center gap-2 rounded-lg border border-[#a19f99] bg-[#f0eee5] px-4">
      <SearchIcon className="h-6 w-6 shrink-0 text-[var(--color-secondary)]" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="type-body w-full bg-transparent text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)]"
      />
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="type-caption block text-[var(--color-text-disabled)]">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function NewBookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coverInputRef = useRef(null);
  const [step, setStep] = useState(STEPS.search);
  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [form, setForm] = useState(createEmptyForm());
  const [coverFile, setCoverFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const showSkipForNow = searchParams.get("from") === "onboarding";
  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    if (step !== STEPS.results) return undefined;
    if (!canSearch) {
      setResults([]);
      setLoading(false);
      setSearchError("");
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setSearchError("");
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(query.trim())}&limit=8`, {
          signal: controller.signal,
        });
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
  }, [canSearch, query, step]);

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetConfirmationState = (nextForm) => {
    setCoverFile(null);
    setError("");
    setForm(nextForm);
  };

  const goToResults = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setQueryError("Enter at least 2 characters to search.");
      return;
    }
    setQuery(trimmed);
    setQueryError("");
    setStep(STEPS.results);
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    goToResults();
  };

  const onSelectResult = (result) => {
    setCoverFile(null);
    setError("");
    setForm({
      title: asValue(result?.title),
      author: asValue(result?.author),
      publisher: asValue(result?.publisher),
      chapters: "",
      coverUrl: asValue(result?.coverUrl),
    });
    setStep(STEPS.confirm);
  };

  const onManualEntry = () => {
    resetConfirmationState({
      ...createEmptyForm(),
      title: query.trim(),
    });
    setStep(STEPS.confirm);
  };

  const onBack = () => {
    if (step === STEPS.confirm) {
      setStep(query.trim() ? STEPS.results : STEPS.search);
      return;
    }
    if (step === STEPS.results) {
      setStep(STEPS.search);
      setSearchError("");
      return;
    }
    router.back();
  };

  const onCancelResults = () => {
    setQuery("");
    setQueryError("");
    setResults([]);
    setSearchError("");
    setStep(STEPS.search);
  };

  const onCoverFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) {
      return;
    }
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("Cover image is too large. Please pick a file under 2MB.");
      return;
    }

    setError("");
    setCoverFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, coverUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      let uploadedCoverUrl = form.coverUrl.trim() || undefined;
      if (coverFile) {
        const supabase = getBrowserSupabase();
        const ext =
          typeof coverFile.name === "string" && coverFile.name.includes(".")
            ? coverFile.name.split(".").pop().toLowerCase()
            : "jpg";
        const idPart =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2, 11);
        const filePath = `covers/${idPart}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("book-covers")
          .upload(filePath, coverFile, {
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from("book-covers").getPublicUrl(filePath);
        uploadedCoverUrl = data?.publicUrl || undefined;
      }

      const totalChapters = form.chapters ? Number(form.chapters) : undefined;
      const payload = {
        title: form.title.trim(),
        author: form.author.trim() || undefined,
        publisher: form.publisher.trim() || undefined,
        totalChapters: Number.isFinite(totalChapters) && totalChapters > 0 ? totalChapters : undefined,
        coverUrl: uploadedCoverUrl,
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
        try {
          localStorage.setItem("rc.currentBookId", id);
        } catch {}
        router.push("/home");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create book");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--color-page)] text-[var(--color-text-main)]">
      <header className="flex items-center px-4 pb-2 pt-8">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="mr-2 text-[var(--color-text-main)]"
        >
          <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
        </button>
      </header>

      {step === STEPS.search ? (
        <div className="flex flex-1 flex-col px-6 pb-6">
          <section className="pb-8 pt-8">
            <h1 className="type-h1 font-normal">Search a book</h1>
            <p className="type-caption mt-3 max-w-[342px] text-[var(--color-secondary)]">
              Search first to fill in the basics, then adjust anything before you start reading.
            </p>
          </section>

          <form onSubmit={onSearchSubmit} className="flex flex-1 flex-col">
            <SearchField
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setQueryError("");
              }}
              placeholder="Enter a book title"
              autoFocus
            />
            {queryError ? <p className="type-caption mt-2 text-red-700">{queryError}</p> : null}

            <div className="mt-auto space-y-3 pt-6">
              <button
                type="submit"
                className="type-button w-full rounded-lg bg-[var(--color-accent)] px-5 py-3 text-center text-[var(--color-text-on-accent)]"
              >
                Search books
              </button>
              {showSkipForNow ? (
                <button
                  type="button"
                  onClick={() => router.push("/home?skipOnboarding=1")}
                  className="type-button w-full text-center text-[var(--color-text-accent)]"
                >
                  Skip for now
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {step === STEPS.results ? (
        <div className="flex flex-1 flex-col px-6 pb-6">
          <section className="pb-6 pt-8">
            <h1 className="type-h1 font-normal">Search a book</h1>
            <p className="type-caption mt-3 max-w-[342px] text-[var(--color-secondary)]">
              Search first to fill in the basics, then adjust anything before you start reading.
            </p>
          </section>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <SearchField
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a book title"
              />
            </div>
            <button
              type="button"
              onClick={onCancelResults}
              className="type-button text-[var(--color-text-accent)]"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 rounded-lg bg-[#f0eee5] p-2">
            <p className="type-body text-[var(--color-secondary)]">Can&apos;t find the book you are looking for?</p>
            <button
              type="button"
              onClick={onManualEntry}
              className="type-button mt-2 inline-flex items-center text-[var(--color-text-accent)]"
            >
              Input manually
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            {loading ? <p className="type-caption text-[var(--color-secondary)]">Searching...</p> : null}
            {!loading && !canSearch ? (
              <p className="type-caption text-[var(--color-secondary)]">Enter at least 2 characters to search.</p>
            ) : null}
            {searchError ? <p className="type-caption text-red-700">{searchError}</p> : null}
            {!loading && canSearch && !searchError && results.length === 0 ? (
              <p className="type-caption text-[var(--color-secondary)]">No matches found.</p>
            ) : null}

            <div className="space-y-3 pb-6 pt-2">
              {results.map((result) => {
                const otherEditionsCount = Number(result?.otherEditionsCount) || 0;

                return (
                  <button
                    type="button"
                    key={asValue(result?.id)}
                    onClick={() => onSelectResult(result)}
                    className="w-full rounded-lg bg-[#f0eee5] px-4 py-2 text-left"
                  >
                    <div className="flex gap-4">
                      <div className="h-[71px] w-[48px] shrink-0 overflow-hidden rounded-lg bg-[#d8d2c5]">
                        {asValue(result?.coverUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asValue(result?.coverUrl)} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="type-title truncate font-normal text-[var(--color-text-main)]">
                          {asValue(result?.title)}
                        </div>
                        <div className="type-body mt-1 truncate text-[var(--color-secondary)]">
                          {asValue(result?.author) || "Unknown author"}
                        </div>
                        {otherEditionsCount > 0 ? (
                          <div className="type-small mt-2 text-[var(--color-text-accent)]">
                            {otherEditionsCount} other edition{otherEditionsCount === 1 ? "" : "s"} grouped
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {step === STEPS.confirm ? (
        <form onSubmit={onSubmit} className="flex min-h-screen flex-col">
          <div className="flex-1 px-6 pb-6">
            <section className="pb-8 pt-8">
              <h1 className="type-h1 font-normal">New book</h1>
            </section>

            <div className="h-[132px] w-[89px] overflow-hidden rounded-xl bg-[#d8d2c5]">
              {form.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.coverUrl} alt="Book cover preview" className="h-full w-full object-cover" />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="type-button mt-4 text-[var(--color-text-accent)]"
            >
              Change cover
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={onCoverFileChange}
              className="hidden"
            />

            <div className="mt-6 space-y-4">
              <FormField label="Title">
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={onFormChange}
                  className="type-body h-[52px] w-full rounded-lg border border-[#a19f99] bg-[#f7f6f3] px-2 text-[var(--color-text-main)] outline-none"
                  required
                />
              </FormField>

              <FormField label="Author">
                <input
                  type="text"
                  name="author"
                  value={form.author}
                  onChange={onFormChange}
                  className="type-body h-[52px] w-full rounded-lg border border-[#a19f99] bg-[#f7f6f3] px-2 text-[var(--color-text-main)] outline-none"
                />
              </FormField>

              <FormField label="# Chapters">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  name="chapters"
                  value={form.chapters}
                  onChange={onFormChange}
                  placeholder="Enter the number of chapters"
                  className="type-body h-[54px] w-full rounded-lg border border-[#a19f99] bg-[#f7f6f3] px-2 text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)]"
                />
              </FormField>
            </div>

            {error ? <p className="type-caption mt-4 text-red-700">{error}</p> : null}
          </div>

          <div className="border-t border-[color:var(--rc-color-text-secondary)/15%] bg-[#f7f6f3] px-6 pb-6 pt-4">
            <button
              type="submit"
              disabled={submitting || !form.title.trim()}
              className="type-button w-full rounded-lg bg-[var(--color-accent)] px-5 py-3 text-center text-[var(--color-text-on-accent)] disabled:opacity-60"
            >
              {submitting ? "Adding..." : "Add book"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
