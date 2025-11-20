"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import BackArrowIcon from "@/components/BackArrowIcon";

export default function NewBookPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    author: "",
    publisher: "",
    chapters: "",
    coverUrl: "",
  });
  const [coverFile, setCoverFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCoverFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, coverUrl: "" }));
      setCoverFile(null);
      return;
    }
    // Lightweight guard to avoid very large inline images
    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxBytes) {
      setError("Cover image is too large. Please pick a file under 2MB.");
      return;
    }
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
      let uploadedCoverUrl;
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
        title: form.title,
        author: form.author,
        publisher: form.publisher || undefined,
        totalChapters: Number.isFinite(totalChapters) && totalChapters > 0 ? totalChapters : undefined,
        coverUrl: uploadedCoverUrl || undefined,
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
        router.push("/home");
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
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="mr-2 text-[var(--color-text-main)]"
        >
          <BackArrowIcon className="h-6 w-6 text-[var(--color-text-main)]" />
        </button>
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
            <label className="block text-sm text-[var(--color-secondary)]">Cover image</label>
            <input
              type="file"
              accept="image/*"
              onChange={onCoverFileChange}
              className="mt-1 block w-full text-sm text-[var(--color-secondary)] file:mr-3 file:rounded-xl file:border file:border-[color:var(--rc-color-text-secondary)/35%] file:bg-white/80 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--color-text-main)]"
            />
            {form.coverUrl ? (
              <div className="mt-3 h-32 w-24 overflow-hidden rounded-xl bg-white/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.coverUrl} alt="Book cover preview" className="h-full w-full object-cover" />
              </div>
            ) : null}
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

