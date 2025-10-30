import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Book = {
  id: string;
  title: string;
  author?: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("books")
      .select("id,title,author,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const books = (data ?? []) as Book[];
    return Response.json({ books });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch books";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { title?: unknown; author?: unknown };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : null;
    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("books")
      .insert({ title, author })
      .select("id,title,author,created_at")
      .single();
    if (error) throw error;
    return Response.json({ book: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create book";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
