"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SLIDES = [
  {
    title: "Welcome to Your AI Reading Assistant",
    subtitle: "Your reading companion to make stories easier to follow, remember, and enjoy.",
  },
  {
    title: "Stay on top of your books",
    subtitle: "Your reading companion for better understanding and retention",
    bullets: ["Track your sessions.", "Capture notes.", "Organize them in one place."],
  },
  {
    title: "Ready to begin?",
    subtitle: "Add a book, start your first reading session and see how it works",
  },
];

function Dots({ index, count }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === index;
        return (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className={
              "h-2.5 w-2.5 rounded-full " +
              (isActive ? "bg-[var(--color-text-accent)]" : "bg-[var(--color-text-disabled)]")
            }
          />
        );
      })}
    </div>
  );
}

function BulletRow({ label }) {
  return (
    <div className="flex items-center gap-4">
      <span
        className="h-10 w-10 rounded-2xl bg-[var(--color-surface)]"
        aria-hidden
      />
      <span className="text-[var(--color-text-main)]">{label}</span>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const scrollerRef = useRef(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i) => {
    const el = scrollerRef.current;
    if (!el) return;
    const width = el.clientWidth;
    el.scrollTo({ left: i * width, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onScroll() {
      const width = el.clientWidth || 1;
      const i = Math.round(el.scrollLeft / width);
      if (i !== index) setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [index]);

  const onNext = () => {
    if (index < SLIDES.length - 1) {
      goTo(index + 1);
    } else {
      // mark onboarding as completed (best-effort)
      try {
        localStorage.setItem("rc.onboarding", "done");
      } catch {
        // ignore
      }
      router.push("/books/new");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[var(--color-page)] px-6 py-10 text-[var(--color-text-main)]">
      {/* Slides (swipe with scroll snap) */}
      <div
        ref={scrollerRef}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {SLIDES.map((slide, i) => (
          <section key={slide.title} className="w-full shrink-0 snap-center px-1">
            <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4">
              <h1 className="text-center text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-h1)" }}>
                {slide.title}
              </h1>
              {slide.subtitle ? (
                <p className="mx-auto max-w-sm text-center text-[var(--color-secondary)]">{slide.subtitle}</p>
              ) : null}

              {Array.isArray(slide.bullets) ? (
                <div className="mt-4 flex w-full max-w-sm flex-col gap-5">
                  {slide.bullets.map((b, bi) => (
                    <BulletRow // eslint-disable-next-line react/no-array-index-key
                      key={bi}
                      label={b}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {/* Footer controls (dots + CTA) */}
      <div className="mt-6 flex flex-col items-center gap-6 pb-6">
        <Dots index={index} count={SLIDES.length} />

        <div className="flex w-full items-center justify-center">
          {index < SLIDES.length - 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="h-12 w-full max-w-[160px] rounded-xl bg-transparent text-center text-[var(--color-text-accent)]"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="h-12 w-full rounded-xl bg-[var(--color-accent)] px-5 text-center text-[var(--color-text-on-accent)]"
            >
              Let's begin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
