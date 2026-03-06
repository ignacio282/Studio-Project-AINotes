module.exports = [
"[project]/.next-internal/server/app/api/notes/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/punycode [external] (punycode, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("punycode", () => require("punycode"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/supabase/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getServerSupabase",
    ()=>getServerSupabase,
    "getServiceSupabase",
    ()=>getServiceSupabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
;
;
;
let serviceClient = null;
function getServiceSupabase() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Add them to .env.local");
    }
    if (serviceClient) return serviceClient;
    serviceClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, serviceKey, {
        auth: {
            persistSession: false
        }
    });
    return serviceClient;
}
async function getServerSupabase() {
    const url = ("TURBOPACK compile-time value", "https://aqqhogamlsdhwcdkxico.supabase.co");
    const anonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxcWhvZ2FtbHNkaHdjZGt4aWNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNjQ1ODgsImV4cCI6MjA3Njk0MDU4OH0.Kz3W-hVrMg-wH42bXgb2puUyW3zFzB6Oolf0UVj7qwI");
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createServerClient"])(url, anonKey, {
        cookies: {
            get (name) {
                return cookieStore.get(name)?.value;
            },
            set (name, value, options) {
                cookieStore.set({
                    name,
                    value,
                    ...options
                });
            },
            remove (name, options) {
                cookieStore.set({
                    name,
                    value: "",
                    ...options,
                    maxAge: 0
                });
            }
        }
    });
}
}),
"[project]/src/lib/supabase/require-user.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "requireUser",
    ()=>requireUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-route] (ecmascript)");
;
async function requireUser() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getServerSupabase"])();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        return {
            supabase,
            user: null
        };
    }
    return {
        supabase,
        user: data.user
    };
}
}),
"[project]/app/api/notes/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$require$2d$user$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/require-user.ts [app-route] (ecmascript)");
;
const runtime = "nodejs";
async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const bookId = searchParams.get("bookId") || "";
        const chapterNumberRaw = searchParams.get("chapterNumber");
        const chapterNumber = chapterNumberRaw ? Number(chapterNumberRaw) : undefined;
        if (!bookId) {
            return new Response(JSON.stringify({
                error: "bookId is required"
            }), {
                status: 400
            });
        }
        const { supabase, user } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$require$2d$user$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUser"])();
        if (!user) {
            return new Response(JSON.stringify({
                error: "Unauthorized"
            }), {
                status: 401
            });
        }
        let query = supabase.from("notes").select("id,book_id,chapter_number,content,ai_summary,created_at").eq("book_id", bookId).order("created_at", {
            ascending: true
        });
        if (typeof chapterNumber === "number" && !Number.isNaN(chapterNumber)) {
            query = query.eq("chapter_number", chapterNumber);
        }
        const { data, error } = await query;
        if (error) throw error;
        const notes = data ?? [];
        return Response.json({
            notes
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to fetch notes";
        return new Response(JSON.stringify({
            error: message
        }), {
            status: 500
        });
    }
}
async function POST(req) {
    try {
        const body = await req.json();
        const bookId = typeof body.bookId === "string" ? body.bookId.trim() : "";
        const chapterNumber = typeof body.chapterNumber === "number" ? body.chapterNumber : Number(body.chapterNumber);
        const content = typeof body.content === "string" ? body.content.trim() : "";
        const createdAt = typeof body.createdAt === "string" ? body.createdAt : new Date().toISOString();
        if (!bookId) {
            return new Response(JSON.stringify({
                error: "bookId is required"
            }), {
                status: 400
            });
        }
        if (!Number.isInteger(chapterNumber) || chapterNumber < 0) {
            return new Response(JSON.stringify({
                error: "chapterNumber must be a non-negative integer"
            }), {
                status: 400
            });
        }
        if (!content) {
            return new Response(JSON.stringify({
                error: "content is required"
            }), {
                status: 400
            });
        }
        const { supabase, user } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$require$2d$user$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireUser"])();
        if (!user) {
            return new Response(JSON.stringify({
                error: "Unauthorized"
            }), {
                status: 401
            });
        }
        const { data, error } = await supabase.from("notes").insert({
            book_id: bookId,
            chapter_number: chapterNumber,
            content,
            created_at: createdAt,
            user_id: user.id
        }).select("id").single();
        if (error) throw error;
        return Response.json({
            id: data?.id
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to create note";
        return new Response(JSON.stringify({
            error: message
        }), {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7c5b67e4._.js.map