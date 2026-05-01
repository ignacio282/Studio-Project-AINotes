"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const SLIDES = [
  {
    icon: BookOpen,
    eyebrow: "Read first, organize later",
    title: "Welcome to Scriba",
    body: "Jot anything as you read. Scriba pulls out the characters, places, and events and remembers them in case you forget.",
    details: [
      "Write however you want, no templates",
      "People, places, and events organized for you",
      "Ask questions and get answers from what you actually wrote",
    ],
  },
  {
    icon: PenLine,
    eyebrow: "Capture as you go",
    title: "Write quick chapter notes",
    body: "Drop in names, places, reactions, and small details while they are still fresh.",
    numberedItems: [
      "Add a book",
      "Log the chapter you just read",
      "Let Scriba organize the raw notes",
    ],
  },
  {
    icon: Sparkles,
    eyebrow: "Turn notes into memory",
    title: "See the structure emerge",
    body: "Scriba shapes your notes into summaries, character context, relationships, and reflection prompts.",
    details: [
      "Characters and places stay easy to revisit",
      "Reflections help the story stick",
      "Your chapter history remains connected",
    ],
  },
  {
    icon: ShieldCheck,
    eyebrow: "Reader trust first",
    title: "Ask without spoilers",
    body: "The assistant answers from your captured notes, staying inside the chapters you have logged.",
    details: [
      "No internet lookup",
      "No invented facts",
      "No spoilers beyond your chapter scope",
    ],
  },
];

const slideVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 42 : -42,
    scale: 0.98,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -42 : 42,
    scale: 0.98,
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function LogoLockup({ reduceMotion }) {
  return (
    <motion.div
      className="flex items-center justify-between"
      initial={reduceMotion ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Image
        src="/scriba-logo-green.svg"
        alt="Scriba"
        width={134}
        height={140}
        priority
        className="h-14 w-auto"
      />
    </motion.div>
  );
}

function Dots({ index, count, onSelect }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-label="Onboarding progress">
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === index;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={isActive ? "step" : undefined}
            onClick={() => onSelect(i)}
            className="flex h-7 w-7 items-center justify-center rounded-full"
          >
            <motion.span
              className={
                "block h-2 rounded-full " +
                (isActive ? "bg-[var(--color-accent)]" : "bg-[var(--color-text-disabled)]")
              }
              animate={{ width: isActive ? 24 : 8, opacity: isActive ? 1 : 0.48 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            />
          </button>
        );
      })}
    </div>
  );
}

function NumberedRow({ number, label }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center gap-4 rounded-lg border border-[rgba(90,138,132,0.14)] bg-[rgba(250,249,245,0.66)] p-4 shadow-sm backdrop-blur"
    >
      <span className="type-title flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-text-on-accent)]">
        {number}
      </span>
      <p className="type-body text-[var(--color-text-main)]">{label}</p>
    </motion.div>
  );
}

function DetailRow({ label }) {
  return (
    <motion.li
      variants={itemVariants}
      className="flex items-start gap-3 rounded-lg border border-[rgba(90,138,132,0.12)] bg-[rgba(250,249,245,0.58)] p-4 shadow-sm backdrop-blur"
    >
      <CheckCircle2
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-text-accent)]"
        strokeWidth={1.8}
      />
      <span className="type-body text-[var(--color-text-main)]">{label}</span>
    </motion.li>
  );
}

function Slide({ slide, direction, reduceMotion }) {
  const Icon = slide.icon;

  return (
    <motion.section
      key={slide.title}
      custom={direction}
      variants={slideVariants}
      initial={reduceMotion ? false : "enter"}
      animate="center"
      exit={reduceMotion ? undefined : "exit"}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[62vh] flex-col justify-center"
    >
      <motion.div
        className="mb-7 flex h-14 w-14 items-center justify-start text-[var(--color-text-accent)]"
        initial={reduceMotion ? false : { opacity: 0, rotate: -4, y: 10 }}
        animate={{ opacity: 1, rotate: 0, y: 0 }}
        transition={{ duration: 0.42, delay: 0.08, ease: "easeOut" }}
      >
        <Icon aria-hidden="true" className="h-10 w-10" strokeWidth={1.55} />
      </motion.div>

      <motion.p
        className="type-caption mb-3 text-[var(--color-text-accent)]"
        variants={itemVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        transition={{ duration: 0.32, delay: 0.08 }}
      >
        {slide.eyebrow}
      </motion.p>
      <motion.h1
        className="type-h1 max-w-[340px] text-[var(--color-text-main)]"
        variants={itemVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        transition={{ duration: 0.34, delay: 0.14 }}
      >
        {slide.title}
      </motion.h1>
      <motion.p
        className="type-body mt-5 max-w-[344px] text-[var(--color-secondary)]"
        variants={itemVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        transition={{ duration: 0.34, delay: 0.2 }}
      >
        {slide.body}
      </motion.p>

      <motion.div
        className="mt-9 flex flex-col gap-3"
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        transition={{ staggerChildren: 0.07, delayChildren: 0.28 }}
      >
        {Array.isArray(slide.numberedItems)
          ? slide.numberedItems.map((item, idx) => (
              <NumberedRow key={item} number={idx + 1} label={item} />
            ))
          : slide.details.map((item) => <DetailRow key={item} label={item} />)}
      </motion.div>
    </motion.section>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showSplash, setShowSplash] = useState(true);
  const isPreview = searchParams.get("preview") === "1";

  const goTo = useCallback(
    (nextIndex) => {
      const boundedIndex = Math.max(0, Math.min(SLIDES.length - 1, nextIndex));
      setDirection(boundedIndex >= index ? 1 : -1);
      setIndex(boundedIndex);
    },
    [index],
  );

  const onNext = () => {
    if (index < SLIDES.length - 1) {
      goTo(index + 1);
    } else {
      router.push(isPreview ? "/home" : "/books/new?from=onboarding");
    }
  };

  const onDragEnd = (_, info) => {
    if (Math.abs(info.offset.x) < 60) return;
    if (info.offset.x < 0 && index < SLIDES.length - 1) goTo(index + 1);
    if (info.offset.x > 0 && index > 0) goTo(index - 1);
  };

  const isLastSlide = index === SLIDES.length - 1;

  if (showSplash) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-accent)] px-8">
        <motion.div
          className="flex flex-col items-center gap-10"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src="/scriba-logo-white.svg"
            alt="Scriba"
            width={136}
            height={142}
            priority
            className="h-40 w-auto"
          />
          <motion.button
            type="button"
            onClick={() => setShowSplash(false)}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className="type-button h-12 rounded-lg bg-[var(--rc-color-page)] px-6 text-[var(--color-text-accent)]"
          >
            Let&apos;s begin
          </motion.button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-transparent text-[var(--color-text-main)]">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-7">
        <LogoLockup reduceMotion={reduceMotion} />

        <motion.div
          className="flex flex-1 touch-pan-y flex-col"
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={onDragEnd}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <Slide
              key={SLIDES[index].title}
              slide={SLIDES[index]}
              direction={direction}
              reduceMotion={reduceMotion}
            />
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-5 pb-6"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.15 }}
        >
          <Dots index={index} count={SLIDES.length} onSelect={goTo} />

          <div className="grid w-full grid-cols-[1fr_auto] items-center gap-3">
            <button
              type="button"
              onClick={() => goTo(Math.max(0, index - 1))}
              disabled={index === 0}
              className="type-button h-12 rounded-lg text-left text-[var(--color-text-accent)] transition disabled:pointer-events-none disabled:opacity-0"
            >
              Back
            </button>

            <motion.button
              type="button"
              onClick={onNext}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className={
                "type-button inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-center shadow-sm transition " +
                (isLastSlide
                  ? "bg-[var(--color-accent)] text-[var(--color-text-on-accent)]"
                  : "bg-[rgba(250,249,245,0.72)] text-[var(--color-text-accent)] ring-1 ring-[rgba(90,138,132,0.2)] backdrop-blur")
              }
            >
              {isLastSlide ? "Let\u2019s begin" : "Next"}
              <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
