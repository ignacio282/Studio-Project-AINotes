export const TRACKING_MODES = Object.freeze({
  CHAPTER: "chapter",
  PAGE: "page",
  PERCENT: "percent",
});

export function normalizeTrackingMode(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === TRACKING_MODES.PAGE) return TRACKING_MODES.PAGE;
  if (raw === TRACKING_MODES.PERCENT) return TRACKING_MODES.PERCENT;
  return TRACKING_MODES.CHAPTER;
}

export function getTrackingModeLabel(mode) {
  switch (normalizeTrackingMode(mode)) {
    case TRACKING_MODES.PAGE:
      return "Page number";
    case TRACKING_MODES.PERCENT:
      return "Percentage";
    default:
      return "Chapter";
  }
}

export function getProgressUnit(mode) {
  switch (normalizeTrackingMode(mode)) {
    case TRACKING_MODES.PAGE:
      return "page";
    case TRACKING_MODES.PERCENT:
      return "percentage";
    default:
      return "chapter";
  }
}

export function getProgressUnitPlural(mode) {
  switch (normalizeTrackingMode(mode)) {
    case TRACKING_MODES.PAGE:
      return "pages";
    case TRACKING_MODES.PERCENT:
      return "percent";
    default:
      return "chapters";
  }
}

export function formatProgressLabel(mode, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const rounded = Math.floor(numeric);
  switch (normalizeTrackingMode(mode)) {
    case TRACKING_MODES.PAGE:
      return `Page ${rounded}`;
    case TRACKING_MODES.PERCENT:
      return `${rounded}%`;
    default:
      return `Chapter ${rounded}`;
  }
}

export function formatProgressSources(mode, values) {
  const list = Array.isArray(values)
    ? Array.from(
        new Set(
          values
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0),
        ),
      )
    : [];
  if (list.length === 0) return "";
  return `Sources: ${list.map((value) => formatProgressLabel(mode, value)).join(", ")}`;
}

export function getProgressSetupTotalLabel(mode) {
  return normalizeTrackingMode(mode) === TRACKING_MODES.PAGE
    ? "Max page"
    : "Max chapter";
}

export function getProgressSetupTotalPlaceholder(mode) {
  return normalizeTrackingMode(mode) === TRACKING_MODES.PAGE
    ? "Enter the last page number"
    : "Enter the last chapter number";
}

export function getProgressSessionFieldLabel(mode) {
  switch (normalizeTrackingMode(mode)) {
    case TRACKING_MODES.PAGE:
      return "Latest page reached";
    case TRACKING_MODES.PERCENT:
      return "Latest percentage reached";
    default:
      return "Latest chapter reached";
  }
}

export function getProgressSessionHelper(mode) {
  switch (normalizeTrackingMode(mode)) {
    case TRACKING_MODES.PAGE:
      return "Save this note up through the latest page you reached.";
    case TRACKING_MODES.PERCENT:
      return "Save this note up through the latest percentage you reached.";
    default:
      return "Save this note up through the latest chapter you reached.";
  }
}

export function getProgressSessionPlaceholder(mode) {
  switch (normalizeTrackingMode(mode)) {
    case TRACKING_MODES.PAGE:
      return "Enter page number";
    case TRACKING_MODES.PERCENT:
      return "Enter percentage";
    default:
      return "Enter chapter number";
  }
}

export function getProgressProgressText(mode, currentValue, totalValue) {
  const current = Number(currentValue);
  if (!Number.isFinite(current) || current <= 0) {
    return "";
  }

  const normalizedMode = normalizeTrackingMode(mode);
  if (normalizedMode === TRACKING_MODES.PERCENT) {
    return `Currently at ${formatProgressLabel(normalizedMode, current)}`;
  }

  const total = Number(totalValue);
  if (!Number.isFinite(total) || total <= 0) {
    return "";
  }

  return `On ${getProgressUnit(normalizedMode)} ${Math.floor(current)} of ${Math.floor(total)}`;
}

export function getProgressLastReadText(mode, currentValue) {
  const label = formatProgressLabel(mode, currentValue);
  if (!label) {
    return "";
  }
  const normalizedMode = normalizeTrackingMode(mode);
  if (normalizedMode === TRACKING_MODES.PERCENT) {
    return `Latest progress saved: ${label}`;
  }
  return `Last ${getProgressUnit(normalizedMode)} logged: ${label}`;
}

export function getProgressEmptyText(mode) {
  const normalizedMode = normalizeTrackingMode(mode);
  if (normalizedMode === TRACKING_MODES.PERCENT) {
    return "Progress will appear after you log a percentage-based reading note.";
  }
  return `Progress will appear after you log ${getProgressUnit(normalizedMode)} notes.`;
}

export function getProgressRange(mode) {
  if (normalizeTrackingMode(mode) === TRACKING_MODES.PERCENT) {
    return { min: 1, max: 100 };
  }
  return { min: 1, max: undefined };
}

export function getProgressTotalValue(mode, book) {
  const normalizedMode = normalizeTrackingMode(mode);
  if (normalizedMode === TRACKING_MODES.PERCENT) {
    return 100;
  }
  if (normalizedMode === TRACKING_MODES.PAGE) {
    const pages = Number(book?.total_pages);
    return Number.isFinite(pages) && pages > 0 ? Math.floor(pages) : null;
  }
  const chapters = Number(book?.total_chapters);
  return Number.isFinite(chapters) && chapters > 0 ? Math.floor(chapters) : null;
}
