export type NormalizedKnowledgeSummary = {
  summary: string[];
  characters: string[];
  setting: string[];
  relationships: string[];
  reflections: string[];
  extras: { title: string; items: string[] }[];
};

export function toStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "name" in item) {
        const name = (item as { name?: unknown }).name;
        return typeof name === "string" ? name.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

export function normalizeKnowledgeSummary(summary: unknown): NormalizedKnowledgeSummary {
  if (!summary || typeof summary !== "object") {
    return {
      summary: [],
      characters: [],
      setting: [],
      relationships: [],
      reflections: [],
      extras: [],
    };
  }

  const rec = summary as {
    summary?: unknown;
    bullets?: unknown;
    characters?: unknown;
    setting?: unknown;
    relationships?: unknown;
    reflections?: unknown;
    extras?: unknown;
    extraSections?: unknown;
  };
  const extrasSource = rec.extraSections ?? rec.extras ?? [];
  const extras = Array.isArray(extrasSource)
    ? extrasSource
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const obj = entry as { title?: unknown; items?: unknown };
          const title = typeof obj.title === "string" ? obj.title.trim() : "";
          if (!title) return null;
          return { title, items: toStringList(obj.items) };
        })
        .filter((entry): entry is { title: string; items: string[] } => Boolean(entry))
    : [];

  return {
    summary: toStringList(rec.summary).concat(toStringList(rec.bullets)),
    characters: uniqueStrings(toStringList(rec.characters)),
    setting: uniqueStrings(toStringList(rec.setting)),
    relationships: uniqueStrings(toStringList(rec.relationships)),
    reflections: toStringList(rec.reflections),
    extras,
  };
}

export function slugifyEntityName(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function normalizeEntityKey(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const text = value.trim();
    const key = normalizeEntityKey(text);
    if (!text || !key || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result;
}

export function getFirstMeaningfulText(summary: NormalizedKnowledgeSummary, content: string): string {
  const fromSummary = summary.summary.find(Boolean);
  if (fromSummary) return compactText(fromSummary, 320);
  const fromRelationships = summary.relationships.find(Boolean);
  if (fromRelationships) return compactText(fromRelationships, 320);
  const fromReflections = summary.reflections.find(Boolean);
  if (fromReflections) return compactText(fromReflections, 320);
  return compactText(content, 320);
}

export function compactText(value: unknown, maxLength = 220): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  return sliced.replace(/\s+\S*$/, "").trim() || sliced.trim();
}

export function findTextForEntity(name: string, summary: NormalizedKnowledgeSummary, content: string): string {
  const key = normalizeEntityKey(name);
  const sections = [
    ...summary.summary,
    ...summary.relationships,
    ...summary.reflections,
    ...summary.extras.flatMap((section) => section.items),
  ];
  const hit = sections.find((item) => normalizeEntityKey(item).includes(key));
  if (hit) return compactText(hit, 320);

  const sentences = content
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const contentHit = sentences.find((sentence) => normalizeEntityKey(sentence).includes(key));
  if (contentHit) return compactText(contentHit, 320);

  return getFirstMeaningfulText(summary, content);
}
