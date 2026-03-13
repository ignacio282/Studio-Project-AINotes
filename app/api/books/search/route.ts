import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";

export const runtime = "nodejs";

type ProviderName = "google_books" | "openlibrary";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  publisher?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  edition_count?: number;
  readinglog_count?: number;
  ratings_count?: number;
};

type GoogleBooksItem = {
  id?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    printType?: string;
    mainCategory?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: GoogleIndustryIdentifier[];
  };
};

type GoogleIndustryIdentifier = {
  type?: string;
  identifier?: string;
};

type SearchResult = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  coverUrl: string | null;
  isbn: string | null;
  openLibraryKey: string | null;
  provider: ProviderName;
  otherEditionsCount?: number;
};

type GoogleRankCandidate = {
  result: SearchResult;
  score: number;
  workKey: string;
};

function pickFirstString(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const found = value.find((entry) => typeof entry === "string" && entry.trim().length > 0);
  return typeof found === "string" ? found.trim() : null;
}

function normalizeForCompare(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeForCompare(value);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

function parsePublishedYear(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function normalizeGoogleCover(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
  return trimmed;
}

function pickGoogleIsbn(identifiers: GoogleIndustryIdentifier[] | undefined): string | null {
  if (!Array.isArray(identifiers)) return null;
  const isbnPreferred = identifiers.find(
    (entry) =>
      typeof entry?.type === "string" &&
      entry.type.startsWith("ISBN_") &&
      typeof entry.identifier === "string" &&
      entry.identifier.trim().length > 0,
  );
  if (isbnPreferred?.identifier) return isbnPreferred.identifier.trim();
  const anyId = identifiers.find((entry) => typeof entry?.identifier === "string" && entry.identifier.trim().length > 0);
  return typeof anyId?.identifier === "string" ? anyId.identifier.trim() : null;
}

function toCoverUrl(doc: OpenLibraryDoc, isbn: string | null): string | null {
  if (typeof doc.cover_i === "number" && Number.isFinite(doc.cover_i) && doc.cover_i > 0) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg?default=false`;
  }
  if (isbn) {
    return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`;
  }
  return null;
}

function normalizeDoc(doc: OpenLibraryDoc): SearchResult | null {
  const title = typeof doc.title === "string" ? doc.title.trim() : "";
  if (!title) return null;

  const author = pickFirstString(doc.author_name);
  const publisher = pickFirstString(doc.publisher);
  const isbn = pickFirstString(doc.isbn);
  const openLibraryKey = typeof doc.key === "string" ? doc.key.trim() : null;
  const publishedYear =
    typeof doc.first_publish_year === "number" && Number.isFinite(doc.first_publish_year)
      ? doc.first_publish_year
      : null;
  const coverUrl = toCoverUrl(doc, isbn);
  const id = openLibraryKey || isbn || `${title}:${author ?? "unknown"}`;

  return {
    id,
    title,
    author,
    publisher,
    publishedYear,
    coverUrl,
    isbn,
    openLibraryKey,
    provider: "openlibrary",
  };
}

function normalizeGoogleItem(item: GoogleBooksItem): SearchResult | null {
  const info = item.volumeInfo;
  const title = typeof info?.title === "string" ? info.title.trim() : "";
  if (!title) return null;

  const author = pickFirstString(info?.authors);
  const publisher = typeof info?.publisher === "string" && info.publisher.trim() ? info.publisher.trim() : null;
  const isbn = pickGoogleIsbn(info?.industryIdentifiers);
  const publishedYear = parsePublishedYear(info?.publishedDate);
  const coverUrl = normalizeGoogleCover(info?.imageLinks?.thumbnail) ?? normalizeGoogleCover(info?.imageLinks?.smallThumbnail);
  const baseId = typeof item.id === "string" && item.id.trim() ? item.id.trim() : null;
  const id = baseId ? `gbooks:${baseId}` : `gbooks:${isbn || `${title}:${author ?? "unknown"}`}`;

  return {
    id,
    title,
    author,
    publisher,
    publishedYear,
    coverUrl,
    isbn,
    openLibraryKey: null,
    provider: "google_books",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function popularityBoost(value: number | null | undefined, multiplier: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return clamp(Math.log10(value + 1) * multiplier, 0, max);
}

function escapeGoogleQueryTerm(value: string): string {
  return value.replace(/["\\]/g, "").trim();
}

function buildGoogleQueries(query: string): string[] {
  const escaped = escapeGoogleQueryTerm(query);
  if (!escaped) return [query];

  const exactTitleQuery = `intitle:"${escaped}"`;
  if (normalizeForCompare(escaped).includes(" ")) {
    return [exactTitleQuery, `"${escaped}"`, escaped];
  }
  return [exactTitleQuery, escaped];
}

function scoreGoogleItem(item: GoogleBooksItem, result: SearchResult, query: string): number {
  const info = item.volumeInfo;
  const title = (typeof info?.title === "string" ? info.title : "").trim();
  const subtitle = (typeof info?.subtitle === "string" ? info.subtitle : "").trim();
  const pageCount = typeof info?.pageCount === "number" && Number.isFinite(info.pageCount) ? info.pageCount : null;
  const ratingsCount =
    typeof info?.ratingsCount === "number" && Number.isFinite(info.ratingsCount) ? info.ratingsCount : null;
  const averageRating =
    typeof info?.averageRating === "number" && Number.isFinite(info.averageRating) ? info.averageRating : null;
  const language = typeof info?.language === "string" ? info.language.trim().toLowerCase() : "";
  const printType = typeof info?.printType === "string" ? info.printType.trim().toUpperCase() : "";
  const mainCategory = typeof info?.mainCategory === "string" ? info.mainCategory : "";
  const categories = Array.isArray(info?.categories) ? info.categories : [];
  const queryNorm = normalizeForCompare(query);
  const titleNorm = normalizeForCompare(title);
  const combinedNorm = normalizeForCompare(`${title} ${subtitle}`);

  let score = 0;
  if (queryNorm && titleNorm === queryNorm) score += 120;
  else if (queryNorm && titleNorm.startsWith(queryNorm)) score += 80;
  else if (queryNorm && titleNorm.includes(queryNorm)) score += 45;
  else if (queryNorm && combinedNorm.includes(queryNorm)) score += 20;

  const exclusionTerms = [
    "bundle",
    "box set",
    "collection set",
    "collection",
    "slipcase",
    "deluxe",
    "sampler",
    "omnibus",
    "book bundle",
  ];
  for (const term of exclusionTerms) {
    if (combinedNorm.includes(term)) score -= 85;
  }

  if (combinedNorm.includes("sons of ares")) score -= 60;
  if (combinedNorm.includes("philosophy")) score -= 50;

  if (!result.author) score -= 45;
  if (language === "en") score += 24;
  else if (language) score -= 18;

  if (printType === "BOOK") score += 8;
  else if (printType) score -= 25;

  if (pageCount !== null) {
    if (pageCount > 900) score -= 30;
    if (pageCount >= 120 && pageCount <= 850) score += 20;
  }

  score += popularityBoost(ratingsCount, 14, 56);
  if (averageRating !== null && averageRating >= 3) {
    score += clamp((averageRating - 3) * 8, 0, 16);
  }

  if (result.isbn) score += 10;
  if (result.coverUrl) score += 8;
  if (result.publishedYear !== null && result.publishedYear > 0 && result.publishedYear <= new Date().getFullYear()) {
    score += 6;
  }

  const categoryNorm = [mainCategory, ...categories].map((entry) => normalizeForCompare(entry)).filter(Boolean);
  if (categoryNorm.some((entry) => entry.includes("comics") || entry.includes("graphic novel"))) {
    score -= 25;
  }
  if (categoryNorm.some((entry) => entry.includes("fiction") || entry.includes("science fiction"))) {
    score += 6;
  }

  const queryTokens = tokenize(query);
  const authorNorm = normalizeForCompare(result.author ?? "");
  const authorHits = queryTokens.filter((token) => token.length > 2 && authorNorm.includes(token)).length;
  if (authorHits > 0) score += Math.min(authorHits * 8, 24);

  return score;
}

function getWorkKey(result: SearchResult): string {
  const titleNorm = normalizeForCompare(result.title).replace(/\b(deluxe|slipcase|bundle|collection|omnibus)\b/g, "").trim();
  const authorNorm = normalizeForCompare(result.author ?? "unknown");
  return `${titleNorm}|${authorNorm}`;
}

function compareCandidates(a: GoogleRankCandidate, b: GoogleRankCandidate): number {
  if (b.score !== a.score) return b.score - a.score;
  const aHasAuthor = a.result.author ? 1 : 0;
  const bHasAuthor = b.result.author ? 1 : 0;
  if (bHasAuthor !== aHasAuthor) return bHasAuthor - aHasAuthor;
  const aHasCover = a.result.coverUrl ? 1 : 0;
  const bHasCover = b.result.coverUrl ? 1 : 0;
  if (bHasCover !== aHasCover) return bHasCover - aHasCover;
  const aYear = a.result.publishedYear ?? 0;
  const bYear = b.result.publishedYear ?? 0;
  if (bYear !== aYear) return bYear - aYear;
  return a.result.title.localeCompare(b.result.title);
}

function rankAndCollapseGoogleItems(items: GoogleBooksItem[], query: string, limit: number): SearchResult[] {
  const byWork = new Map<string, GoogleRankCandidate[]>();

  for (const item of items) {
    const result = normalizeGoogleItem(item);
    if (!result) continue;
    const score = scoreGoogleItem(item, result, query);
    const workKey = getWorkKey(result);
    const existing = byWork.get(workKey) ?? [];
    existing.push({ result, score, workKey });
    byWork.set(workKey, existing);
  }

  const collapsed: GoogleRankCandidate[] = [];
  for (const candidates of byWork.values()) {
    candidates.sort(compareCandidates);
    const best = candidates[0];
    best.result.otherEditionsCount = Math.max(0, candidates.length - 1);
    collapsed.push(best);
  }

  collapsed.sort(compareCandidates);

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const entry of collapsed) {
    if (seen.has(entry.result.id)) continue;
    seen.add(entry.result.id);
    results.push(entry.result);
    if (results.length >= limit) break;
  }

  return results;
}

function scoreOpenLibraryDoc(doc: OpenLibraryDoc, result: SearchResult, query: string): number {
  const titleNorm = normalizeForCompare(result.title);
  const queryNorm = normalizeForCompare(query);
  const editionCount =
    typeof doc.edition_count === "number" && Number.isFinite(doc.edition_count) ? doc.edition_count : null;
  const readinglogCount =
    typeof doc.readinglog_count === "number" && Number.isFinite(doc.readinglog_count) ? doc.readinglog_count : null;
  const ratingsCount =
    typeof doc.ratings_count === "number" && Number.isFinite(doc.ratings_count) ? doc.ratings_count : null;

  let score = 0;
  if (queryNorm && titleNorm === queryNorm) score += 100;
  else if (queryNorm && titleNorm.startsWith(queryNorm)) score += 70;
  else if (queryNorm && titleNorm.includes(queryNorm)) score += 35;

  if (!result.author) score -= 35;
  if (result.coverUrl) score += 8;
  if (result.isbn) score += 8;

  score += popularityBoost(editionCount, 10, 32);
  score += popularityBoost(readinglogCount, 12, 36);
  score += popularityBoost(ratingsCount, 10, 28);

  return score;
}

function getOpenLibraryUserAgent() {
  const contactEmail = (process.env.OPEN_LIBRARY_CONTACT_EMAIL ?? "").trim();
  if (contactEmail) {
    return `Scriba/1.0 (+mailto:${contactEmail})`;
  }
  return "Scriba/1.0";
}

async function searchOpenLibrary(query: string, limit: number): Promise<SearchResult[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "key,title,author_name,publisher,cover_i,first_publish_year,isbn,edition_count,readinglog_count,ratings_count",
  );

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": getOpenLibraryUserAgent(),
    },
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    throw new Error(`Open Library request failed (${response.status})`);
  }

  const json = (await response.json()) as { docs?: OpenLibraryDoc[] };
  const docs = Array.isArray(json.docs) ? json.docs : [];
  const candidates: Array<{ result: SearchResult; score: number }> = [];

  for (const doc of docs) {
    const normalized = normalizeDoc(doc);
    if (!normalized) continue;
    candidates.push({
      result: normalized,
      score: scoreOpenLibraryDoc(doc, normalized, query),
    });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aHasAuthor = a.result.author ? 1 : 0;
    const bHasAuthor = b.result.author ? 1 : 0;
    if (bHasAuthor !== aHasAuthor) return bHasAuthor - aHasAuthor;
    const aHasCover = a.result.coverUrl ? 1 : 0;
    const bHasCover = b.result.coverUrl ? 1 : 0;
    if (bHasCover !== aHasCover) return bHasCover - aHasCover;
    return a.result.title.localeCompare(b.result.title);
  });

  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.result.id)) continue;
    seen.add(candidate.result.id);
    results.push(candidate.result);
    if (results.length >= limit) break;
  }
  return results;
}

async function searchGoogleBooks(query: string, limit: number): Promise<SearchResult[]> {
  const apiKey = (process.env.GOOGLE_BOOKS_API_KEY ?? "").trim();
  if (!apiKey) return [];

  const collected: GoogleBooksItem[] = [];
  const seenIds = new Set<string>();
  const queries = buildGoogleQueries(query);

  for (const googleQuery of queries) {
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", googleQuery);
    url.searchParams.set("maxResults", String(Math.min(Math.max(limit * 3, 20), 40)));
    url.searchParams.set("printType", "books");
    url.searchParams.set("projection", "full");
    url.searchParams.set("orderBy", "relevance");
    url.searchParams.set("langRestrict", "en");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      throw new Error(`Google Books request failed (${response.status})`);
    }

    const json = (await response.json()) as { items?: GoogleBooksItem[] };
    const items = Array.isArray(json.items) ? json.items : [];
    for (const item of items) {
      const id = typeof item?.id === "string" ? item.id.trim() : "";
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      collected.push(item);
    }
  }

  return rankAndCollapseGoogleItems(collected, query, limit);
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return new Response(JSON.stringify({ error: "q must be at least 2 characters" }), { status: 400 });
    }

    const rawLimit = Number(req.nextUrl.searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 12) : 8;
    const providerParam = (req.nextUrl.searchParams.get("provider") ?? "auto").trim().toLowerCase();
    const googleConfigured = Boolean((process.env.GOOGLE_BOOKS_API_KEY ?? "").trim());

    if (providerParam === "openlibrary") {
      const results = await searchOpenLibrary(q, limit);
      return Response.json({ results, provider: "openlibrary", fallbackUsed: false });
    }

    if (providerParam === "google") {
      if (!googleConfigured) {
        return new Response(JSON.stringify({ error: "Google Books API key is not configured" }), { status: 400 });
      }
      const results = await searchGoogleBooks(q, limit);
      return Response.json({
        results,
        provider: "google_books",
        fallbackUsed: false,
        googleConfigured: true,
        googleStatus: results.length > 0 ? "ok" : "empty",
      });
    }

    let googleError = "";
    let googleStatus: "ok" | "empty" | "error" | "unconfigured" = "unconfigured";
    try {
      if (googleConfigured) {
        const googleResults = await searchGoogleBooks(q, limit);
        if (googleResults.length > 0) {
          return Response.json({
            results: googleResults,
            provider: "google_books",
            fallbackUsed: false,
            googleConfigured: true,
            googleStatus: "ok",
          });
        }
        googleStatus = "empty";
      } else {
        googleStatus = "unconfigured";
      }
    } catch (err) {
      googleError = err instanceof Error ? err.message : "Google Books failed";
      googleStatus = "error";
    }

    const openLibraryResults = await searchOpenLibrary(q, limit);
    return Response.json({
      results: openLibraryResults,
      provider: "openlibrary",
      fallbackUsed: true,
      googleError: googleError || undefined,
      googleConfigured,
      googleStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to search books";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
