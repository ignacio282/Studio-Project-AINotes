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
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type?: string;
      identifier?: string;
    }>;
  };
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

function pickGoogleIsbn(identifiers: GoogleBooksItem["volumeInfo"]["industryIdentifiers"]): string | null {
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

function scoreGoogleItem(item: GoogleBooksItem, result: SearchResult, query: string): number {
  const info = item.volumeInfo;
  const title = (typeof info?.title === "string" ? info.title : "").trim();
  const subtitle = (typeof info?.subtitle === "string" ? info.subtitle : "").trim();
  const pageCount = typeof info?.pageCount === "number" && Number.isFinite(info.pageCount) ? info.pageCount : null;
  const categories = Array.isArray(info?.categories) ? info.categories : [];
  const queryNorm = normalizeForCompare(query);
  const titleNorm = normalizeForCompare(title);
  const combinedNorm = normalizeForCompare(`${title} ${subtitle}`);

  let score = 0;
  if (queryNorm && titleNorm === queryNorm) score += 120;
  else if (queryNorm && titleNorm.startsWith(queryNorm)) score += 80;
  else if (queryNorm && titleNorm.includes(queryNorm)) score += 45;

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

  if (pageCount !== null) {
    if (pageCount > 900) score -= 30;
    if (pageCount >= 120 && pageCount <= 850) score += 20;
  }

  if (result.isbn) score += 10;
  if (result.coverUrl) score += 8;
  if (result.publishedYear !== null && result.publishedYear > 0 && result.publishedYear <= new Date().getFullYear()) {
    score += 6;
  }

  const categoryNorm = categories.map((entry) => normalizeForCompare(entry));
  if (categoryNorm.some((entry) => entry.includes("comics") || entry.includes("graphic novel"))) {
    score -= 25;
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
  const aYear = a.result.publishedYear ?? 9999;
  const bYear = b.result.publishedYear ?? 9999;
  if (aYear !== bYear) return aYear - bYear;
  const aHasPages = a.result.coverUrl ? 1 : 0;
  const bHasPages = b.result.coverUrl ? 1 : 0;
  if (bHasPages !== aHasPages) return bHasPages - aHasPages;
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
  url.searchParams.set("fields", "key,title,author_name,publisher,cover_i,first_publish_year,isbn");

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
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const doc of docs) {
    const normalized = normalizeDoc(doc);
    if (!normalized) continue;
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    results.push(normalized);
  }

  return results;
}

async function searchGoogleBooks(query: string, limit: number): Promise<SearchResult[]> {
  const apiKey = (process.env.GOOGLE_BOOKS_API_KEY ?? "").trim();
  if (!apiKey) return [];

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(Math.min(Math.max(limit * 3, 20), 40)));
  url.searchParams.set("printType", "books");
  url.searchParams.set("projection", "full");
  url.searchParams.set("orderBy", "relevance");
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
  return rankAndCollapseGoogleItems(items, query, limit);
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
