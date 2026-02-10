import { NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/require-user";

export const runtime = "nodejs";

type Book = {
  id: string;
  title: string;
  author?: string | null;
  publisher?: string | null;
  total_chapters?: number | null;
  cover_url?: string | null;
  status?: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    // Try extended fields first; fall back if columns are missing
    let data: any[] | null = null;
    let error: any = null;
    {
      const resp = await supabase
        .from("books")
        .select("id,title,author,publisher,total_chapters,cover_url,status,created_at")
        .order("created_at", { ascending: false });
      data = resp.data as any[] | null;
      error = resp.error;
    }
    if (error) {
      const resp = await supabase
        .from("books")
        .select("id,title,author,created_at")
        .order("created_at", { ascending: false });
      if (resp.error) throw resp.error;
      data = resp.data as any[] | null;
    }
    const books = (data ?? []) as Book[];
    return Response.json({ books });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch books";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      title?: unknown;
      author?: unknown;
      publisher?: unknown;
      totalChapters?: unknown;
      coverUrl?: unknown;
      status?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : null;
    const publisher = typeof body.publisher === "string" ? body.publisher.trim() : null;
    const totalChaptersRaw = typeof body.totalChapters === "number" ? body.totalChapters : Number(body.totalChapters);
    const total_chapters = Number.isFinite(totalChaptersRaw) && totalChaptersRaw > 0 ? Math.floor(totalChaptersRaw) : null;
    const cover_url = typeof body.coverUrl === "string" ? body.coverUrl.trim() : null;
    const status = typeof body.status === "string" ? body.status.trim() : null;
    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 });
    }
    const { supabase, user } = await requireUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    // Attempt insert with extended fields; if it fails due to missing columns, retry with minimal payload.
    const attempt = async () =>
      supabase
        .from("books")
        .insert({ title, author, publisher, total_chapters, cover_url, status, user_id: user.id })
        .select("id,title,author,publisher,total_chapters,cover_url,status,created_at")
        .single();

    let { data, error } = await attempt();
    if (error) {
      const minimal = await supabase
        .from("books")
        .insert({ title, author, user_id: user.id })
        .select("id,title,author,created_at")
        .single();
      if (minimal.error) throw minimal.error;
      data = minimal.data as any;
    }
    return Response.json({ book: data as Book });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create book";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
