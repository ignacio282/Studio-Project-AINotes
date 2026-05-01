"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

function hasCharacterDetail(character) {
  if (character?.ready === false) return false;
  const role = typeof character?.role === "string" ? character.role.trim().toLowerCase() : "";
  const summary = typeof character?.summary === "string" ? character.summary.trim().toLowerCase() : "";
  const subtitle = typeof character?.subtitle === "string" ? character.subtitle.trim().toLowerCase() : "";
  return Boolean(
    (role && !["role still forming", "role not clear yet", "still gathering context"].includes(role)) ||
      (summary && summary !== "mentioned in your notes.") ||
      (subtitle && subtitle !== "mentioned in your notes."),
  );
}

export default function HomeCharactersSection({ bookId, characters = [] }) {
  const router = useRouter();
  const [prepState, setPrepState] = useState("idle");
  const needsPrep = useMemo(
    () => characters.some((character) => character?.needsPrep || character?.prepStatus === "preparing"),
    [characters],
  );
  const prepSlugs = useMemo(
    () => characters.map((character) => character?.slug).filter(Boolean).slice(0, 4),
    [characters],
  );

  useEffect(() => {
    if (!bookId || !needsPrep || prepState !== "idle") return;
    let active = true;

    const prepare = async () => {
      try {
        setPrepState("preparing");
        const response = await fetch(`/api/books/${encodeURIComponent(bookId)}/dashboard-prep`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: prepSlugs }),
        });
        if (!response.ok) throw new Error("Unable to prepare dashboard");
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        const preparedCount = Array.isArray(payload?.prepared) ? payload.prepared.length : 0;
        const errorCount = Array.isArray(payload?.errors) ? payload.errors.length : 0;
        if (preparedCount > 0) {
          setPrepState(errorCount > 0 ? "error" : "done");
          router.refresh();
          return;
        }
        if (errorCount > 0) {
          setPrepState("error");
          return;
        }
        setPrepState("done");
      } catch {
        if (active) setPrepState("error");
      }
    };

    void prepare();
    return () => {
      active = false;
    };
  }, [bookId, needsPrep, prepSlugs, prepState, router]);

  const helperText =
    prepState === "error"
        ? "Some character details are still being prepared."
        : "People shaping the story right now";

  return (
    <section className="px-6 py-4 pb-32">
      <div className="space-y-1">
        <h2 className="type-h3 text-[#2A2A2A]">
          Characters to remember
        </h2>
        <p className="type-caption text-[#A19F99]">
          {helperText}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {characters.length > 0 ? (
          characters.map((character) => {
            const key = character.slug || character.name;
            const hasDetail = hasCharacterDetail(character);
            const tile = (
              <div className="flex items-center gap-3 rounded-[8px] bg-[rgba(240,238,229,0.78)] px-4 py-3 backdrop-blur">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="type-title truncate text-[#2F2F2F]">
                      {character.name}
                    </div>
                    {Number(character.mentions) > 0 ? (
                      <div className="type-caption shrink-0 rounded-full bg-[rgba(250,249,245,0.72)] px-2 py-0.5 text-[#595853]">
                        {character.mentions} mentions
                      </div>
                    ) : null}
                  </div>
                  <p className="type-caption mt-1 text-[#595853]">
                    {hasDetail ? character.role || "Story role" : "Not enough detail yet"}
                  </p>
                  <p className="type-body mt-2 line-clamp-2 text-[#2A2A2A]">
                    {hasDetail
                      ? character.summary || character.subtitle
                      : `Write more about ${character.name} to unlock their role, relationships, and timeline.`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#595853]" aria-hidden="true" />
              </div>
            );

            if (character.slug && bookId) {
              return (
                <Link
                  key={key}
                  href={`/books/${encodeURIComponent(bookId)}/characters/${encodeURIComponent(character.slug)}`}
                  className="block"
                >
                  {tile}
                </Link>
              );
            }

            return (
              <div key={key}>
                {tile}
              </div>
            );
          })
        ) : (
          <div className="type-body rounded-[8px] bg-[rgba(240,238,229,0.78)] px-4 py-5 text-[#595853] backdrop-blur">
            Important characters will show up here once they are mentioned in your notes.
          </div>
        )}
      </div>
    </section>
  );
}
