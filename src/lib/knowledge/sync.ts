import {
  compactText,
  findTextForEntity,
  normalizeEntityKey,
  normalizeKnowledgeSummary,
  slugifyEntityName,
  toStringList,
  uniqueStrings,
} from "./normalize";

type SupabaseClientLike = {
  from: (table: string) => unknown;
};

type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

type QueryBuilderLike = PromiseLike<QueryResult> & {
  select: (...args: unknown[]) => QueryBuilderLike;
  eq: (...args: unknown[]) => QueryBuilderLike;
  in: (...args: unknown[]) => QueryBuilderLike;
  order: (...args: unknown[]) => QueryBuilderLike;
  update: (...args: unknown[]) => QueryBuilderLike;
  upsert: (...args: unknown[]) => QueryBuilderLike;
  delete: (...args: unknown[]) => QueryBuilderLike;
};

function table(supabase: SupabaseClientLike, name: string): QueryBuilderLike {
  return supabase.from(name) as QueryBuilderLike;
}

type SyncNoteInput = {
  supabase: SupabaseClientLike;
  userId: string;
  bookId: string;
  noteId: string;
  chapterNumber: number;
  content?: string | null;
  aiSummary?: unknown;
  metadata?: unknown;
};

type EntityRow = {
  id: string;
  book_id: string;
  type: string;
  slug: string;
  name: string;
  profile?: Record<string, unknown> | null;
  first_chapter?: number | null;
  last_chapter?: number | null;
};

type RelationshipDraft = {
  sourceName: string;
  targetName: string;
  label: string;
  description: string;
  evidence: string;
};

function mergeList(existing: unknown, incoming: string[]): string[] {
  return uniqueStrings([...toStringList(existing), ...incoming]).slice(0, 12);
}

function normalizeMetadataList(metadata: unknown, key: "characters" | "places") {
  if (!metadata || typeof metadata !== "object") return [];
  const value = (metadata as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry === "object") as Record<string, unknown>[];
}

function getMetadataForName(metadataRows: Record<string, unknown>[], name: string) {
  const key = normalizeEntityKey(name);
  return metadataRows.find((entry) => normalizeEntityKey(String(entry.name ?? "")) === key) ?? null;
}

function buildEntityProfile({
  existing,
  metadata,
  sourceText,
}: {
  existing?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  sourceText: string;
}) {
  const profile = { ...(existing ?? {}) };
  if (sourceText) {
    profile.evidence = mergeList(profile.evidence, [sourceText]);
  }
  if (!metadata) return profile;

  profile.traits = mergeList(profile.traits, toStringList(metadata.traits));
  profile.actions = mergeList(profile.actions, toStringList(metadata.actions));
  profile.affiliations = mergeList(profile.affiliations, toStringList(metadata.affiliations));
  profile.motivations = mergeList(
    profile.motivations,
    uniqueStrings([...toStringList(metadata.motives), ...toStringList(metadata.motivations)]),
  );
  profile.relationships = mergeList(profile.relationships, toStringList(metadata.relationships));
  profile.descriptions = mergeList(
    profile.descriptions,
    uniqueStrings([...toStringList(metadata.descriptions), ...toStringList(metadata.notableEvents)]),
  );
  if (!profile.summary) {
    const summary = toStringList(metadata.summary)[0] || toStringList(metadata.description)[0] || "";
    if (summary) profile.summary = summary;
  }
  return profile;
}

function cleanRelationshipName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`.,;:]+$/g, "")
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
}

function parseRelationship(raw: string): RelationshipDraft | null {
  const text = raw.trim();
  if (!text) return null;

  const linkedMatch = text.match(
    /^([A-Za-z][A-Za-z0-9'\-\s]{0,80}?)(?:\s*(?:&|->|<->|=>|→|↔|⟷|—|–)\s*|\s+and\s+)([A-Za-z][A-Za-z0-9'\-\s]{0,80}?)(?:\s*[-:—–]\s*|\s+are\s+|\s+is\s+)(.+)$/i,
  );
  if (linkedMatch) {
    const sourceName = cleanRelationshipName(linkedMatch[1] ?? "");
    const targetName = cleanRelationshipName(linkedMatch[2] ?? "");
    const description = cleanRelationshipName(linkedMatch[3] ?? "");
    if (sourceName && targetName && description) {
      return {
        sourceName,
        targetName,
        label: compactText(description, 80),
        description,
        evidence: text,
      };
    }
  }

  const ofMatch = text.match(
    /^([A-Za-z][A-Za-z0-9'\-\s]{0,80}?)\s+is\s+(.{1,80}?)\s+of\s+([A-Za-z][A-Za-z0-9'\-\s]{0,80}?)(?:[.;,]|$)/i,
  );
  if (ofMatch) {
    const sourceName = cleanRelationshipName(ofMatch[1] ?? "");
    const targetName = cleanRelationshipName(ofMatch[3] ?? "");
    const description = cleanRelationshipName(`${sourceName} is ${ofMatch[2] ?? ""} of ${targetName}`);
    if (sourceName && targetName && description) {
      return {
        sourceName,
        targetName,
        label: compactText(description, 80),
        description,
        evidence: text,
      };
    }
  }

  const sentenceMatch = text.match(
    /^([A-Z][A-Za-z0-9'\-]+(?:\s+[A-Z][A-Za-z0-9'\-]+)?)\s+(?:and|with|against|helps|trusts|opposes|meets|joins)\s+([A-Z][A-Za-z0-9'\-]+(?:\s+[A-Z][A-Za-z0-9'\-]+)?)\b(.*)$/i,
  );
  if (sentenceMatch) {
    const sourceName = cleanRelationshipName(sentenceMatch[1] ?? "");
    const targetName = cleanRelationshipName(sentenceMatch[2] ?? "");
    if (sourceName && targetName) {
      return {
        sourceName,
        targetName,
        label: compactText(text, 80),
        description: text,
        evidence: text,
      };
    }
  }

  return null;
}

function findEntityForRelationshipName(entityByKey: Map<string, EntityRow>, name: string): EntityRow | null {
  const slug = slugifyEntityName(name);
  const exact = entityByKey.get(`character:${slug}`) ?? entityByKey.get(`place:${slug}`);
  if (exact) return exact;

  const requested = normalizeEntityKey(name);
  if (!requested) return null;
  const candidates = Array.from(entityByKey.values())
    .filter((entity) => {
      const current = normalizeEntityKey(entity.name);
      return current === requested || current.includes(requested) || requested.includes(current);
    })
    .sort((a, b) => a.name.length - b.name.length);
  return candidates[0] ?? null;
}

async function refreshEntityStats(supabase: SupabaseClientLike, entityIds: string[]) {
  const uniqueIds = Array.from(new Set(entityIds.filter(Boolean)));
  await Promise.all(
    uniqueIds.map(async (entityId) => {
      const { data } = await table(supabase, "book_entity_mentions")
        .select("chapter_number")
        .eq("entity_id", entityId);
      const chapters = (Array.isArray(data) ? data : [])
        .map((row) => Number(row.chapter_number))
        .filter((value) => Number.isFinite(value) && value > 0);
      const mentionCount = chapters.length;
      const first = mentionCount > 0 ? Math.min(...chapters) : null;
      const last = mentionCount > 0 ? Math.max(...chapters) : null;
      await table(supabase, "book_entities")
        .update({
          mention_count: mentionCount,
          first_chapter: first,
          last_chapter: last,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entityId);
    }),
  );
}

export async function syncNoteKnowledge(input: SyncNoteInput) {
  const { supabase, userId, bookId, noteId } = input;
  const chapterNumber = Number(input.chapterNumber);
  if (!userId || !bookId || !noteId || !Number.isFinite(chapterNumber) || chapterNumber <= 0) {
    return { entities: 0, mentions: 0, relationships: 0, timelineEvents: 0 };
  }

  const content = typeof input.content === "string" ? input.content : "";
  const summary = normalizeKnowledgeSummary(input.aiSummary);
  const characterMetadata = normalizeMetadataList(input.metadata, "characters");
  const placeMetadata = normalizeMetadataList(input.metadata, "places");
  const entityDrafts = [
    ...summary.characters.map((name) => ({ type: "character", name })),
    ...summary.setting.map((name) => ({ type: "place", name })),
  ]
    .map((entry) => ({ ...entry, slug: slugifyEntityName(entry.name) }))
    .filter((entry) => entry.slug && entry.name.trim());

  const uniqueDrafts = Array.from(
    new Map(entityDrafts.map((entry) => [`${entry.type}:${entry.slug}`, entry])).values(),
  );

  const touchedIds = new Set<string>();
  const { data: previousMentions } = await table(supabase, "book_entity_mentions")
    .select("entity_id")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .eq("note_id", noteId);
  (Array.isArray(previousMentions) ? previousMentions : []).forEach((row) => {
    if (row?.entity_id) touchedIds.add(String(row.entity_id));
  });

  await table(supabase, "book_relationships").delete().eq("user_id", userId).eq("book_id", bookId).eq("note_id", noteId);
  await table(supabase, "book_timeline_events").delete().eq("user_id", userId).eq("book_id", bookId).eq("note_id", noteId);
  await table(supabase, "book_entity_mentions").delete().eq("user_id", userId).eq("book_id", bookId).eq("note_id", noteId);

  if (uniqueDrafts.length === 0) {
    await refreshEntityStats(supabase, Array.from(touchedIds));
    return { entities: 0, mentions: 0, relationships: 0, timelineEvents: 0 };
  }

  const slugs = uniqueDrafts.map((entry) => entry.slug);
  const { data: existingRows } = await table(supabase, "book_entities")
    .select("id,book_id,type,slug,name,profile,first_chapter,last_chapter")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .in("slug", slugs);
  const existingByKey = new Map<string, EntityRow>();
  (Array.isArray(existingRows) ? existingRows : []).forEach((row) => {
    existingByKey.set(`${row.type}:${row.slug}`, row as EntityRow);
  });

  const now = new Date().toISOString();
  const upserts = uniqueDrafts.map((draft) => {
    const key = `${draft.type}:${draft.slug}`;
    const existing = existingByKey.get(key);
    const metadata =
      draft.type === "character"
        ? getMetadataForName(characterMetadata, draft.name)
        : getMetadataForName(placeMetadata, draft.name);
    const sourceText = findTextForEntity(draft.name, summary, content);
    const first = Number(existing?.first_chapter);
    const last = Number(existing?.last_chapter);
    return {
      user_id: userId,
      book_id: bookId,
      type: draft.type,
      slug: draft.slug,
      name: existing?.name || draft.name,
      profile: buildEntityProfile({ existing: existing?.profile, metadata, sourceText }),
      first_chapter: Number.isFinite(first) ? Math.min(first, chapterNumber) : chapterNumber,
      last_chapter: Number.isFinite(last) ? Math.max(last, chapterNumber) : chapterNumber,
      updated_at: now,
    };
  });

  const { data: entityRows, error: entityError } = await table(supabase, "book_entities")
    .upsert(upserts, { onConflict: "book_id,type,slug" })
    .select("id,book_id,type,slug,name,profile,first_chapter,last_chapter");
  if (entityError) throw entityError;

  const entities = (Array.isArray(entityRows) ? entityRows : []) as EntityRow[];
  const entityByKey = new Map<string, EntityRow>();
  entities.forEach((row) => {
    entityByKey.set(`${row.type}:${row.slug}`, row);
    touchedIds.add(row.id);
  });

  const mentionRows = uniqueDrafts
    .map((draft) => {
      const row = entityByKey.get(`${draft.type}:${draft.slug}`);
      if (!row?.id) return null;
      return {
        user_id: userId,
        book_id: bookId,
        entity_id: row.id,
        note_id: noteId,
        chapter_number: chapterNumber,
        source_text: findTextForEntity(row.name, summary, content),
        extracted: {
          source: "note_summary",
          type: row.type,
          summary: summary.summary,
          relationships: summary.relationships.filter((rel) =>
            normalizeEntityKey(rel).includes(normalizeEntityKey(row.name)),
          ),
        },
      };
    })
    .filter(Boolean) as Array<{
    user_id: string;
    book_id: string;
    entity_id: string;
    note_id: string;
    chapter_number: number;
    source_text: string;
    extracted: {
      source: string;
      type: string;
      summary: string[];
      relationships: string[];
    };
  }>;

  if (mentionRows.length > 0) {
    const { error } = await table(supabase, "book_entity_mentions")
      .upsert(mentionRows, { onConflict: "entity_id,note_id" });
    if (error) throw error;
  }

  const timelineRows = mentionRows
    .map((mention) => {
      if (!mention) return null;
      const entity = entities.find((row) => row.id === mention.entity_id);
      const eventText = compactText(mention.source_text, 220);
      if (!entity?.id || !eventText) return null;
      return {
        user_id: userId,
        book_id: bookId,
        entity_id: entity.id,
        note_id: noteId,
        chapter_number: chapterNumber,
        event_type: "note",
        event_text: eventText,
      };
    })
    .filter(Boolean);

  if (timelineRows.length > 0) {
    const { error } = await table(supabase, "book_timeline_events")
      .upsert(timelineRows, { onConflict: "book_id,entity_id,note_id,event_text" });
    if (error) throw error;
  }

  const relationshipRows = summary.relationships
    .map(parseRelationship)
    .filter((relationship): relationship is RelationshipDraft => Boolean(relationship))
    .map((relationship) => {
      const source = findEntityForRelationshipName(entityByKey, relationship.sourceName);
      const target = findEntityForRelationshipName(entityByKey, relationship.targetName);
      if (!source?.id || !target?.id || source.id === target.id) return null;
      touchedIds.add(source.id);
      touchedIds.add(target.id);
      return {
        user_id: userId,
        book_id: bookId,
        source_entity_id: source.id,
        target_entity_id: target.id,
        label: relationship.label || "Relationship",
        description: relationship.description,
        chapter_number: chapterNumber,
        note_id: noteId,
        evidence: relationship.evidence,
        updated_at: now,
      };
    })
    .filter(Boolean);

  if (relationshipRows.length > 0) {
    const { error } = await table(supabase, "book_relationships")
      .upsert(relationshipRows, {
        onConflict: "book_id,source_entity_id,target_entity_id,label,note_id",
      });
    if (error) throw error;
  }

  await refreshEntityStats(supabase, Array.from(touchedIds));

  return {
    entities: entities.length,
    mentions: mentionRows.length,
    relationships: relationshipRows.length,
    timelineEvents: timelineRows.length,
  };
}

export async function backfillBookKnowledge({
  supabase,
  userId,
  bookId,
}: {
  supabase: SupabaseClientLike;
  userId: string;
  bookId: string;
}) {
  const { data: notes, error } = await table(supabase, "notes")
    .select("id,book_id,chapter_number,content,ai_summary,created_at")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  let synced = 0;
  const failed: Array<{ noteId: string; error: string }> = [];
  for (const note of Array.isArray(notes) ? notes : []) {
    try {
      await syncNoteKnowledge({
        supabase,
        userId,
        bookId,
        noteId: note.id,
        chapterNumber: Number(note.chapter_number),
        content: note.content,
        aiSummary: note.ai_summary,
      });
      synced += 1;
    } catch (err) {
      failed.push({
        noteId: String(note.id),
        error: err instanceof Error ? err.message : "Unable to sync note",
      });
    }
  }

  return { synced, failed };
}
