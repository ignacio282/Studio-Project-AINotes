"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CharacterProfileSheet from "@/components/CharacterProfileSheet";
import ScribaLoadingScreen from "@/components/ui/ScribaLoadingScreen";
import { getFriendlyErrorMessage } from "@/lib/errors/user-facing";

export default function CharacterPrepGate({
  bookId,
  slug,
  character,
  initialSnapshot,
  trackingMode,
  noteLinks,
  profileReadiness,
}) {
  const router = useRouter();
  const [fallbackSnapshot, setFallbackSnapshot] = useState(null);
  const [fallbackReadiness, setFallbackReadiness] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 45000);

    const prepare = async () => {
      try {
        setError("");
        const response = await fetch(
          `/api/books/${encodeURIComponent(bookId)}/characters/${encodeURIComponent(slug)}/snapshot`,
          { method: "POST", signal: controller.signal },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || "Unable to prepare character profile.");
        }
        if (!active) return;
        if (payload?.ready === false) {
          setFallbackSnapshot(payload.snapshot || null);
          setFallbackReadiness(payload.readiness || { ready: false });
          return;
        }
        router.refresh();
      } catch (err) {
        if (active) {
          const message =
            err?.name === "AbortError"
              ? "Scriba is taking too long to prepare this character. Showing the saved details for now."
              : "Unable to prepare this character right now.";
          setError(getFriendlyErrorMessage(err, message));
        }
      }
    };

    void prepare();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [bookId, slug, router]);

  if (fallbackSnapshot || fallbackReadiness?.ready === false || error) {
    return (
      <>
        {error ? (
          <div className="mb-4 rounded-[8px] bg-[rgba(240,238,229,0.78)] px-4 py-3 text-[var(--color-secondary)]">
            <p className="type-body">{error}</p>
          </div>
        ) : null}
        <CharacterProfileSheet
          bookId={bookId}
          slug={slug}
          character={character}
          initialSnapshot={fallbackSnapshot || initialSnapshot}
          trackingMode={trackingMode}
          noteLinks={noteLinks}
          profileReadiness={fallbackReadiness || profileReadiness}
          disableAutoGenerate
        />
      </>
    );
  }

  return (
    <ScribaLoadingScreen
      overlay
      title="Building character memory"
      message={`Scriba is organizing saved notes for ${character?.name || "this character"}...`}
      status="Building character memory"
    />
  );
}
