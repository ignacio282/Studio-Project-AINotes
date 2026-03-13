"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SLIDES = [
  {
    title: "Welcome to Scriba",
    body: "Your reading companion to make stories easier to follow, remember, and enjoy.",
  },
  {
    title: "How it works",
    body: "Use Scriba while you read to remember what matters.",
    numberedItems: [
      "Add a book.",
      "Write down details you do not want to forget.",
      "Let your AI assistant organize and connect your notes.",
    ],
  },
  {
    title: "What can the AI help with",
    body: "Scriba extracts characters and places, builds summaries and reflections, and answers questions using only your notes.",
    accentLabel: "The AI will not:",
    items: [
      "Search the internet for answers.",
      "Invent facts. It only uses what you captured.",
      "Reveal spoilers beyond your logged chapters.",
    ],
  },
  {
    title: "How to make the most of it",
    body: "Write with as much detail as you can when taking notes.",
    accentLabel: "What does that mean?",
    items: [
      "Include names of the characters you meet.",
      "Write about the places where things are happening.",
      "Note relationships between characters.",
      "Include your own reactions and thoughts.",
    ],
  },
];

function Dots({ index, count }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === index;
        return (
          <span
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

function NumberedRow({ number, label }) {
  return (
    <div className="flex items-center gap-4">
      <span className="type-h1 text-[var(--color-text-accent)]">
        {number}
      </span>
      <p className="type-body text-[var(--color-text-main)]">{label}</p>
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
      router.push("/books/new?from=onboarding");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[var(--color-page)] px-6 py-8 text-[var(--color-text-main)]">
      <div
        ref={scrollerRef}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {SLIDES.map((slide, i) => (
          <section key={slide.title} className="w-full shrink-0 snap-center">
            <div className="flex h-full min-h-[70vh] flex-col justify-start pt-24">
              <h1 className="type-h1">
                {slide.title}
              </h1>

              <p className="type-body mt-5 max-w-[336px] text-[var(--color-text-main)]">
                {i === 1 ? (
                  <>
                    Use <span className="type-button text-[var(--color-text-accent)]">Scriba</span> while you read to
                    remember what matters.
                  </>
                ) : (
                  slide.body
                )}
              </p>

              {Array.isArray(slide.numberedItems) ? (
                <div className="mt-10 flex w-full flex-col gap-6">
                  {slide.numberedItems.map((item, idx) => (
                    <NumberedRow
                      key={idx}
                      number={idx + 1}
                      label={item}
                    />
                  ))}
                </div>
              ) : null}

              {slide.accentLabel ? (
                <p className="type-h1 mt-8 text-[var(--color-text-accent)]">
                  {slide.accentLabel}
                </p>
              ) : null}

              {Array.isArray(slide.items) ? (
                <div className="mt-6 flex max-w-[336px] flex-col gap-5">
                  {slide.items.map((item, idx) => (
                    <p
                      key={idx}
                      className="type-body text-[var(--color-text-main)]"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-6 pb-8">
        <Dots index={index} count={SLIDES.length} />

        <div className="flex w-full items-center justify-center">
          {index < SLIDES.length - 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="type-button h-12 w-full max-w-[160px] rounded-xl bg-transparent text-center text-[var(--color-text-accent)]"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="type-button h-12 w-full rounded-xl bg-[var(--color-accent)] px-5 text-center text-[var(--color-text-on-accent)]"
            >
              Let&apos;s begin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
