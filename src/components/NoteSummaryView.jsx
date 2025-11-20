"use client";

const SUMMARY_ICONS = {
  Summary: "\uD83D\uDCDD",
  Characters: "\uD83D\uDC65",
  Setting: "\uD83D\uDCCD",
  Relationships: "\uD83D\uDD17",
  "User Reflections": "\uD83D\uDCAD",
  Themes: "\u2728",
  Conflicts: "\u26A1",
  Motifs: "\uD83C\uDFA8",
};

const SUMMARY_PLACEHOLDERS = {
  Summary: "You'll see a summary here once you've written more notes.",
  Characters: "You'll see key character notes here once they've shown up.",
  Setting: "Describe where the story is unfolding to see it here.",
  Relationships: "Capture important dynamics or tensions to track them here.",
  "User Reflections": "Add your personal reactions and takeaways to fill this in.",
};

const DEFAULT_EXTRA_PLACEHOLDER =
  "Add a few notes during reflection to fill this in.";

function SummaryCategory({
  title,
  items,
  placeholder,
  showWhenEmpty = false,
}) {
  const sanitizedItems = Array.isArray(items)
    ? items
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];
  const hasItems = sanitizedItems.length > 0;
  if (!hasItems && !showWhenEmpty) {
    return null;
  }

  const icon = SUMMARY_ICONS[title] ?? null;
  const resolvedPlaceholder = placeholder || DEFAULT_EXTRA_PLACEHOLDER;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-base font-semibold text-[var(--color-text-main)]">
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span>{title}</span>
      </div>
      {hasItems ? (
        <div className="mt-4 space-y-2">
          {sanitizedItems.map((item, index) => {
            const key = `${title}-${index}-${item.slice(0, 16)}`;
            if (title === "Summary") {
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-md bg-[var(--color-accent-subtle)]/40 px-3 py-2"
                >
                  <p className="flex-1 text-sm leading-6 text-[var(--color-text-main)]">
                    {item}
                  </p>
                </div>
              );
            }

            const isCharacters = title === "Characters";
            return (
              <div key={key} className="flex items-start gap-2">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-secondary)]"
                  aria-hidden
                />
                <span
                  className={
                    isCharacters
                      ? "flex-1 text-sm leading-6 text-[var(--color-text-accent)] font-medium"
                      : "flex-1 text-sm leading-6 text-[var(--color-text-main)]"
                  }
                >
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 text-sm text-[var(--color-text-disabled)]">
          {resolvedPlaceholder}
        </div>
      )}
    </section>
  );
}

function SummarySectionStack({ summary, showPlaceholders = false }) {
  const extras = Array.isArray(summary?.extras) ? summary.extras : [];

  return (
    <div className="space-y-8">
      <SummaryCategory
        title="Summary"
        items={summary?.summary}
        placeholder={SUMMARY_PLACEHOLDERS.Summary}
        showWhenEmpty={showPlaceholders}
      />
      <SummaryCategory
        title="Characters"
        items={summary?.characters}
        placeholder={SUMMARY_PLACEHOLDERS.Characters}
        showWhenEmpty={showPlaceholders}
      />
      <SummaryCategory
        title="Setting"
        items={summary?.setting}
        placeholder={SUMMARY_PLACEHOLDERS.Setting}
        showWhenEmpty={showPlaceholders}
      />
      <SummaryCategory
        title="Relationships"
        items={summary?.relationships}
        placeholder={SUMMARY_PLACEHOLDERS.Relationships}
        showWhenEmpty={showPlaceholders}
      />
      <SummaryCategory
        title="User Reflections"
        items={summary?.reflections}
        placeholder={SUMMARY_PLACEHOLDERS["User Reflections"]}
        showWhenEmpty={showPlaceholders}
      />
      {extras.map((section, index) => (
        <SummaryCategory
          key={`extra-${section.title}-${index}`}
          title={section.title}
          items={section.items}
          placeholder={DEFAULT_EXTRA_PLACEHOLDER}
          showWhenEmpty={
            showPlaceholders &&
            Array.isArray(section.items) &&
            section.items.length === 0
          }
        />
      ))}
    </div>
  );
}

export default function NoteSummaryView({ summary }) {
  if (!summary || typeof summary !== "object") {
    return (
      <div className="mt-2 text-sm text-[var(--color-text-disabled)]">
        No AI note captured yet.
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-[var(--color-surface)] p-4">
      <div className="text-base font-semibold">AI Note</div>
      <div className="mt-4">
        <SummarySectionStack summary={summary} />
      </div>
    </section>
  );
}

