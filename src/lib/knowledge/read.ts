type SupabaseClientLike = {
  from: (table: string) => unknown;
};

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

type QueryBuilderLike = PromiseLike<QueryResult> & {
  select: (...args: unknown[]) => QueryBuilderLike;
  eq: (...args: unknown[]) => QueryBuilderLike;
  in: (...args: unknown[]) => QueryBuilderLike;
  order: (...args: unknown[]) => QueryBuilderLike;
  limit: (...args: unknown[]) => QueryBuilderLike;
  maybeSingle: (...args: unknown[]) => QueryBuilderLike;
  or: (...args: unknown[]) => QueryBuilderLike;
};

function table(supabase: SupabaseClientLike, name: string): QueryBuilderLike {
  return supabase.from(name) as QueryBuilderLike;
}

export type KnowledgeEntity = {
  id: string;
  user_id: string;
  book_id: string;
  type: string;
  slug: string;
  name: string;
  aliases?: string[];
  profile?: Record<string, unknown> | null;
  first_chapter?: number | null;
  last_chapter?: number | null;
  mention_count?: number | null;
  updated_at?: string | null;
};

type KnowledgeMention = {
  id: string;
  note_id: string | null;
  chapter_number: number;
  source_text: string | null;
  extracted?: Record<string, unknown> | null;
  created_at?: string | null;
};

type KnowledgeRelationship = {
  id: string;
  source_entity_id: string | null;
  target_entity_id: string | null;
  label: string | null;
  description: string | null;
  chapter_number: number | null;
  note_id: string | null;
  evidence: string | null;
  created_at?: string | null;
};

type KnowledgeTimelineEvent = {
  id: string;
  entity_id: string | null;
  note_id: string | null;
  chapter_number: number;
  event_type: string;
  event_text: string;
  created_at?: string | null;
};

type CharacterKnowledge = {
  entity: KnowledgeEntity;
  mentions: KnowledgeMention[];
  relationships: Array<KnowledgeRelationship & { otherName: string; otherSlug: string; otherType: string }>;
  timeline: KnowledgeTimelineEvent[];
};

export async function fetchBookKnowledgeEntities(
  supabase: SupabaseClientLike,
  userId: string,
  bookId: string,
): Promise<KnowledgeEntity[]> {
  const { data, error } = await table(supabase, "book_entities")
    .select("id,user_id,book_id,type,slug,name,aliases,profile,first_chapter,last_chapter,mention_count,updated_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return Array.isArray(data) ? (data as KnowledgeEntity[]) : [];
}

export async function fetchKnowledgeEntitiesForBooks(
  supabase: SupabaseClientLike,
  userId: string,
  bookIds: string[],
): Promise<KnowledgeEntity[]> {
  if (bookIds.length === 0) return [];
  const { data, error } = await table(supabase, "book_entities")
    .select("id,user_id,book_id,type,slug,name,aliases,profile,first_chapter,last_chapter,mention_count,updated_at")
    .eq("user_id", userId)
    .in("book_id", bookIds)
    .order("mention_count", { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? (data as KnowledgeEntity[]) : [];
}

export async function fetchCharacterKnowledge(
  supabase: SupabaseClientLike,
  userId: string,
  bookId: string,
  slug: string,
) {
  const { data: entity, error: entityError } = await table(supabase, "book_entities")
    .select("id,user_id,book_id,type,slug,name,aliases,profile,first_chapter,last_chapter,mention_count,updated_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("type", "character")
    .eq("slug", slug)
    .maybeSingle();
  if (entityError) throw entityError;
  if (!entity) return null;
  const entityRow = entity as KnowledgeEntity;

  const [mentionsResponse, relationshipsResponse, timelineResponse] = await Promise.all([
    table(supabase, "book_entity_mentions")
      .select("id,note_id,chapter_number,source_text,extracted,created_at")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .eq("entity_id", entityRow.id)
      .order("chapter_number", { ascending: true }),
    table(supabase, "book_relationships")
      .select("id,source_entity_id,target_entity_id,label,description,chapter_number,note_id,evidence,created_at")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .or(`source_entity_id.eq.${entityRow.id},target_entity_id.eq.${entityRow.id}`)
      .order("chapter_number", { ascending: true }),
    table(supabase, "book_timeline_events")
      .select("id,entity_id,note_id,chapter_number,event_type,event_text,created_at")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .eq("entity_id", entityRow.id)
      .order("chapter_number", { ascending: true }),
  ]);

  if (mentionsResponse.error) throw mentionsResponse.error;
  if (relationshipsResponse.error) throw relationshipsResponse.error;
  if (timelineResponse.error) throw timelineResponse.error;

  const relationships = Array.isArray(relationshipsResponse.data)
    ? (relationshipsResponse.data as KnowledgeRelationship[])
    : [];
  const relatedIds = Array.from(
    new Set(
      relationships
        .flatMap((row) => [row.source_entity_id, row.target_entity_id])
        .filter((id): id is string => Boolean(id && id !== entityRow.id)),
    ),
  );
  let relatedEntities: KnowledgeEntity[] = [];
  if (relatedIds.length > 0) {
    const { data } = await table(supabase, "book_entities")
      .select("id,type,slug,name")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .in("id", relatedIds);
    relatedEntities = Array.isArray(data) ? (data as KnowledgeEntity[]) : [];
  }

  const relatedById = new Map(relatedEntities.map((row) => [row.id, row]));
  return {
    entity: entityRow,
    mentions: Array.isArray(mentionsResponse.data) ? (mentionsResponse.data as KnowledgeMention[]) : [],
    relationships: relationships.map((row) => {
      const otherId = row.source_entity_id === entityRow.id ? row.target_entity_id : row.source_entity_id;
      const other = otherId ? relatedById.get(otherId) : null;
      return {
        ...row,
        otherName: other?.name ?? "",
        otherSlug: other?.slug ?? "",
        otherType: other?.type ?? "",
      };
    }),
    timeline: Array.isArray(timelineResponse.data) ? (timelineResponse.data as KnowledgeTimelineEvent[]) : [],
  } satisfies CharacterKnowledge;
}

function toStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const text = value.replace(/\s+/g, " ").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    result.push(text);
  });
  return result;
}

function formatChapterLabel(chapter: number): string {
  return `Chapter ${chapter}`;
}

function inferRoleLabel(entity: KnowledgeEntity, relationships: Array<KnowledgeRelationship & { otherName: string }>) {
  const profile = entity.profile ?? {};
  const explicit = String(profile.role ?? "").trim();
  if (explicit && explicit.toLowerCase() !== entity.name.toLowerCase() && explicit.toLowerCase() !== "character") {
    return explicit;
  }
  const evidenceText = toStringList(profile.evidence).join(" ").toLowerCase();
  if (evidenceText.includes("main character") || evidenceText.includes("central character")) {
    return "Main character";
  }
  if (Number(entity.mention_count ?? 0) >= 3) {
    return "Recurring character";
  }
  if (relationships.some((row) => /guide|teacher|mentor/i.test(`${row.label ?? ""} ${row.description ?? ""}`))) {
    return "Guide";
  }
  return "Role not clear yet";
}

function buildFallbackSummary(
  entity: KnowledgeEntity,
  mentions: KnowledgeMention[],
  relationships: Array<KnowledgeRelationship & { otherName: string }>,
) {
  const profileSummary = String(entity.profile?.summary ?? "").trim();
  if (profileSummary) return profileSummary;

  const chapters = Array.from(
    new Set(
      mentions
        .map((mention) => Number(mention.chapter_number))
        .filter((chapter) => Number.isFinite(chapter) && chapter > 0),
    ),
  ).sort((a, b) => a - b);
  const first = chapters[0] ?? entity.first_chapter;
  const last = chapters[chapters.length - 1] ?? entity.last_chapter;
  const relatedNames = uniqueStrings(relationships.map((row) => row.otherName).filter(Boolean)).slice(0, 3);
  const range =
    Number.isFinite(Number(first)) && Number.isFinite(Number(last)) && first !== last
      ? `from ${formatChapterLabel(Number(first))} through ${formatChapterLabel(Number(last))}`
      : Number.isFinite(Number(first))
        ? `in ${formatChapterLabel(Number(first))}`
        : "in your notes";
  const roleText =
    Number(entity.mention_count ?? 0) >= 3
      ? `${entity.name} is a recurring character in your notes ${range}.`
      : `${entity.name} appears ${range}.`;
  const relationText = relatedNames.length > 0 ? ` Your notes connect ${entity.name} with ${relatedNames.join(", ")}.` : "";
  return `${roleText}${relationText}`.trim();
}

function normalizeRelationshipPersonName(value: string): string {
  return value
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function relationshipKey(value: string): string {
  return normalizeRelationshipPersonName(value).toLowerCase();
}

function stripRelationshipPrefix(raw: string, characterName: string, otherName: string): string {
  let text = raw.replace(/\s+/g, " ").trim();
  const names = [characterName, otherName, normalizeRelationshipPersonName(otherName)]
    .filter(Boolean)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  names.forEach((name) => {
    text = text
      .replace(new RegExp(`^${name}\\s*[:\\-—–]\\s*`, "i"), "")
      .replace(new RegExp(`^${name}\\s*(?:&|and|->|→|↔|—|–)\\s*`, "i"), "")
      .replace(new RegExp(`\\s*(?:&|and|->|→|↔|—|–)\\s*${name}\\s*[:\\-—–]?\\s*`, "i"), " ");
  });
  return text.replace(/\s+/g, " ").trim();
}

function groupedRelationshipsForDisplay(
  relationships: Array<KnowledgeRelationship & { otherName: string }>,
  mentions: KnowledgeMention[],
  characterName: string,
): string[] {
  const groups = new Map<string, { name: string; details: string[] }>();
  const addDetail = (otherName: string, rawDetail: string) => {
    const cleanName = normalizeRelationshipPersonName(otherName);
    const key = relationshipKey(cleanName);
    const detail = stripRelationshipPrefix(rawDetail, characterName, cleanName);
    if (!key || !detail) return;
    const group = groups.get(key) ?? { name: cleanName, details: [] };
    const detailKey = detail.toLowerCase();
    if (!group.details.some((existing) => existing.toLowerCase() === detailKey || existing.toLowerCase().includes(detailKey) || detailKey.includes(existing.toLowerCase()))) {
      group.details.push(detail);
    }
    groups.set(key, group);
  };

  relationships.forEach((row) => {
    const detail = String(row.description || row.label || row.evidence || "").replace(/\s+/g, " ").trim();
    if (row.otherName && detail) addDetail(row.otherName, detail);
  });

  if (groups.size === 0) {
    extractedRelationshipsFromMentions(mentions).forEach((entry) => {
      const match = entry.match(/^(.+?)(?:\s*(?:&|and|->|→|↔|—|–)\s*|:\s*)(.+?)(?:\s*[-:—–]\s*|\s+are\s+|\s+is\s+)(.+)$/i);
      if (!match) return;
      const left = match[1]?.trim() ?? "";
      const right = match[2]?.trim() ?? "";
      const detail = match[3]?.trim() ?? entry;
      const other = relationshipKey(left) === relationshipKey(characterName) ? right : left;
      addDetail(other, detail);
    });
  }

  return Array.from(groups.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => `${group.name}: ${group.details.slice(0, 3).join("; ")}`)
    .slice(0, 8);
}

function extractedRelationshipsFromMentions(mentions: KnowledgeMention[]): string[] {
  return uniqueStrings(
    mentions.flatMap((mention) => {
      const relationships = mention.extracted?.relationships;
      return Array.isArray(relationships)
        ? relationships.map((entry) => (typeof entry === "string" ? entry : "")).filter(Boolean)
        : [];
    }),
  );
}

export function buildCharacterSnapshotFromKnowledge(knowledge: Awaited<ReturnType<typeof fetchCharacterKnowledge>>) {
  if (!knowledge) return null;
  const profile = knowledge.entity.profile ?? {};
  const mentions = Array.isArray(knowledge.mentions) ? knowledge.mentions : [];
  const relationships = Array.isArray(knowledge.relationships) ? knowledge.relationships : [];
  const timeline = Array.isArray(knowledge.timeline) ? knowledge.timeline : [];
  const fallbackSummary = buildFallbackSummary(knowledge.entity, mentions, relationships);
  const evidence = mentions
    .map((mention) => {
      const chapter = Number(mention.chapter_number);
      const sourceText = String(mention.source_text || "").replace(/\s+/g, " ").trim();
      return sourceText && Number.isFinite(chapter) ? `${formatChapterLabel(chapter)}: ${sourceText}` : sourceText;
    })
    .filter(Boolean)
    .slice(0, 8);
  const sourceChapters = Array.from(
    new Set(
      mentions
        .map((mention) => Number(mention.chapter_number))
        .filter((chapter) => Number.isFinite(chapter) && chapter > 0),
    ),
  ).sort((a, b) => a - b);

  return {
    id: `knowledge:${knowledge.entity.id}`,
    user_id: knowledge.entity.user_id,
    book_id: knowledge.entity.book_id,
    character_slug: knowledge.entity.slug,
    question: "Generated from book knowledge",
    answer: fallbackSummary,
    structured: {
      characterSheetVersion: 3,
      roleLabel: inferRoleLabel(knowledge.entity, relationships),
      summary: fallbackSummary,
      traits: toStringList(profile.traits),
      motivations: toStringList(profile.motivations),
      distinctives: [
        ...toStringList(profile.actions),
        ...toStringList(profile.descriptions),
        ...toStringList(profile.affiliations),
        ...toStringList(profile.evidence),
      ].slice(0, 8),
      relationships: groupedRelationshipsForDisplay(relationships, mentions, knowledge.entity.name),
      timeline: timeline
        .map((row) => ({
          chapterNumber: row.chapter_number,
          event: String(row.event_text || "").replace(/\s+/g, " ").trim(),
          text: String(row.event_text || "").replace(/\s+/g, " ").trim(),
          noteId: row.note_id,
        }))
        .filter((row) => row.event)
        .slice(0, 10),
      evidence,
    },
    sources: sourceChapters,
    max_chapter: sourceChapters.length ? sourceChapters[sourceChapters.length - 1] : null,
    created_at: knowledge.entity.updated_at ?? null,
  };
}
