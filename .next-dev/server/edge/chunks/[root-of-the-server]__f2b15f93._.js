(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__f2b15f93._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
;
;
async function middleware(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const skipOnboardingParam = url.searchParams.get("skipOnboarding") === "1";
    const hasSkipOnboardingCookie = request.cookies.get("rc_onboarding_skipped")?.value === "1";
    const shouldSkipOnboarding = skipOnboardingParam || hasSkipOnboardingCookie;
    const isAuthFreePath = path.startsWith("/login") || path.startsWith("/api") || path.startsWith("/_next") || path.startsWith("/public") || path === "/favicon.ico";
    if (isAuthFreePath) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    const isOnboardingPath = path === "/onboarding";
    const isAddBookPath = path === "/books/new";
    const isHomePath = path === "/home";
    const isLibraryPath = path === "/library";
    const isRootPath = path === "/";
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    if (skipOnboardingParam) {
        response.cookies.set({
            name: "rc_onboarding_skipped",
            value: "1",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
            sameSite: "lax"
        });
    }
    const supabaseUrl = ("TURBOPACK compile-time value", "https://aqqhogamlsdhwcdkxico.supabase.co") || "";
    const supabaseKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcWhvZ2FtbHNkaHdjZGt4aWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjQ1ODgsImV4cCI6MjA3Njk0MDU4OH0.Kz3W-hVrMg-wH42bXgb2puUyW3zFzB6Oolf0UVj7qwI") || "";
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(supabaseUrl, supabaseKey, {
        cookies: {
            get (name) {
                return request.cookies.get(name)?.value;
            },
            set (name, value, options) {
                response.cookies.set({
                    name,
                    value,
                    ...options
                });
            },
            remove (name, options) {
                response.cookies.set({
                    name,
                    value: "",
                    ...options,
                    maxAge: 0
                });
            }
        }
    });
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
        const redirect = new URL("/login", request.url);
        redirect.searchParams.set("next", path);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(redirect);
    }
    const { count, error: bookCountError } = await supabase.from("books").select("id", {
        count: "exact",
        head: true
    }).limit(1);
    if (bookCountError) {
        return response;
    }
    const hasBooks = typeof count === "number" && count > 0;
    if (hasBooks && hasSkipOnboardingCookie) {
        response.cookies.set({
            name: "rc_onboarding_skipped",
            value: "",
            path: "/",
            maxAge: 0,
            sameSite: "lax"
        });
    }
    // New users must complete onboarding flow and reach "Add a book" before browsing.
    if (!hasBooks && !isOnboardingPath && !isAddBookPath && !(shouldSkipOnboarding && (isHomePath || isLibraryPath || isRootPath))) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/onboarding", request.url));
    }
    // Returning users skip onboarding once they already have at least one book.
    if (hasBooks && isOnboardingPath) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/home", request.url));
    }
    return response;
}
const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__f2b15f93._.js.map