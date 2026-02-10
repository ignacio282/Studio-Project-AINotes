import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  const isAuthFreePath =
    path.startsWith("/login") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/public") ||
    path === "/favicon.ico";

  if (isAuthFreePath) {
    return NextResponse.next();
  }

  const isOnboardingPath = path === "/onboarding";
  const isAddBookPath = path === "/books/new";

  const response = NextResponse.next();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  const { count, error: bookCountError } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (bookCountError) {
    return response;
  }

  const hasBooks = typeof count === "number" && count > 0;

  // New users must complete onboarding flow and reach "Add a book" before browsing.
  if (!hasBooks && !isOnboardingPath && !isAddBookPath) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Returning users skip onboarding once they already have at least one book.
  if (hasBooks && isOnboardingPath) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
