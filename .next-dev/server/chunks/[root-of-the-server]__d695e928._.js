module.exports = [
"[project]/.next-internal/server/app/api/books/[bookId]/assistant/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

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
"[project]/src/lib/ai/client.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PROMPTS_VERSION",
    ()=>PROMPTS_VERSION,
    "getAiConfig",
    ()=>getAiConfig
]);
function intFromEnv(name, fallback) {
    const raw = process.env[name];
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
function getAiConfig(useCase) {
    switch(useCase){
        case "journal":
            return {
                model: process.env.AI_MODEL_JOURNAL || "gpt-5-nano",
                maxOutputTokens: intFromEnv("AI_MAX_TOKENS_JOURNAL", 3000)
            };
        case "reflection":
            return {
                model: process.env.AI_MODEL_REFLECTION || "gpt-5-nano",
                maxOutputTokens: intFromEnv("AI_MAX_TOKENS_REFLECTION", 400)
            };
        case "change":
            return {
                model: process.env.AI_MODEL_CHANGE || "gpt-5-nano",
                maxOutputTokens: intFromEnv("AI_MAX_TOKENS_CHANGE", 1200)
            };
        case "characters":
            return {
                model: process.env.AI_MODEL_CHARACTERS || "gpt-5-nano",
                maxOutputTokens: intFromEnv("AI_MAX_TOKENS_CHARACTERS", 900)
            };
        case "assistant":
            return {
                model: process.env.AI_MODEL_ASSISTANT || "gpt-5-nano",
                maxOutputTokens: intFromEnv("AI_MAX_TOKENS_ASSISTANT", 800)
            };
        default:
            return {
                model: "gpt-5-nano",
                maxOutputTokens: 1000
            };
    }
}
const PROMPTS_VERSION = process.env.AI_PROMPTS_VERSION || "2025-10-25:v1";
}),
"[project]/app/api/books/[bookId]/assistant/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$require$2d$user$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/require-user.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$ai$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/ai/client.ts [app-route] (ecmascript)");
;
;
;
const runtime = "nodejs";
const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "if",
    "then",
    "so",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "at",
    "by",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "it",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "we",
    "they",
    "he",
    "she",
    "who",
    "what",
    "when",
    "where",
    "why",
    "how",
    "again",
    "about",
    "into",
    "over",
    "under",
    "as",
    "up",
    "down",
    "out",
    "off",
    "not",
    "do",
    "does",
    "did",
    "just",
    "like",
    "maybe",
    "really",
    "kind",
    "sort"
]);
function normalizeQuestion(raw) {
    return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
}
function toStringList(value) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? [
            trimmed
        ] : [];
    }
    return Array.isArray(value) ? value.map((item)=>typeof item === "string" ? item.trim() : "").filter(Boolean) : [];
}
function normalizeSummary(summary) {
    if (!summary || typeof summary !== "object") {
        return {
            summary: [],
            characters: [],
            setting: [],
            relationships: [],
            reflections: [],
            extras: []
        };
    }
    const rec = summary;
    const extrasSource = rec.extraSections ?? rec.extras ?? [];
    const extras = Array.isArray(extrasSource) ? extrasSource.map((entry)=>{
        if (!entry || typeof entry !== "object") return null;
        const obj = entry;
        const title = typeof obj.title === "string" ? obj.title.trim() : "";
        if (!title) return null;
        return {
            title,
            items: toStringList(obj.items)
        };
    }).filter((entry)=>Boolean(entry)) : [];
    return {
        summary: toStringList(rec.summary),
        characters: toStringList(rec.characters),
        setting: toStringList(rec.setting),
        relationships: toStringList(rec.relationships),
        reflections: toStringList(rec.reflections),
        extras
    };
}
function tryParseJson(raw) {
    const text = (raw || "").trim();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch  {
        const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
        if (fenced) {
            try {
                return JSON.parse(fenced[1]);
            } catch  {
            // ignore
            }
        }
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end > start) {
            try {
                return JSON.parse(text.slice(start, end + 1));
            } catch  {
            // ignore
            }
        }
    }
    return null;
}
function normalizeStructured(raw) {
    if (!raw || typeof raw !== "object") return null;
    const rec = raw;
    const summary = typeof rec.summary === "string" ? rec.summary.trim() : "";
    const evidence = toStringList(rec.evidence);
    const relationships = toStringList(rec.relationships);
    if (!summary) return null;
    return {
        summary,
        evidence,
        relationships
    };
}
function formatSummaryForPrompt(raw) {
    const summary = normalizeSummary(raw);
    const lines = [];
    if (summary.summary.length > 0) {
        lines.push(`Summary: ${summary.summary.join(" ")}`);
    }
    if (summary.characters.length > 0) {
        lines.push(`Characters: ${summary.characters.join(", ")}`);
    }
    if (summary.setting.length > 0) {
        lines.push(`Setting: ${summary.setting.join(", ")}`);
    }
    if (summary.relationships.length > 0) {
        lines.push(`Relationships: ${summary.relationships.join("; ")}`);
    }
    if (summary.reflections.length > 0) {
        lines.push(`Reflections: ${summary.reflections.join("; ")}`);
    }
    if (Array.isArray(summary.extras)) {
        summary.extras.forEach((section)=>{
            if (!section || !section.title) return;
            const items = Array.isArray(section.items) ? section.items.filter(Boolean) : [];
            if (items.length > 0) {
                lines.push(`${section.title}: ${items.join("; ")}`);
            }
        });
    }
    return lines.join("\n").trim();
}
function buildCharacterPromptQuestions(name) {
    return [
        `Who is ${name}, and what role do they seem to play so far?`,
        `How would you describe ${name}'s attitude or vibe in their scenes?`,
        `Is ${name} helping or opposing anyone? How can you tell?`,
        `What is one detail that made ${name} stand out to you?`
    ];
}
function getDetailScore(entry) {
    return entry.summaryMentions * 2 + entry.relationshipMentions * 2 + entry.reflectionMentions + entry.extraMentions;
}
function buildCharacterPromptContext(name, entry, rowsByChapter) {
    const range = entry.first === entry.last ? `First mentioned in chapter ${entry.first}.` : `First mentioned in chapter ${entry.first}, latest mention in chapter ${entry.last}.`;
    const detailLine = entry.mentions > 1 ? `You have mentioned ${name} a few times, but the notes still do not say much about them.` : `You have only mentioned ${name} once so far.`;
    const tipLine = `Tip: You could revisit chapter ${entry.first} to learn more about who ${name} is.`;
    const lastRow = rowsByChapter.get(entry.last);
    if (!lastRow) {
        return [
            range,
            detailLine,
            tipLine,
            "Try noting things like:"
        ].join(" ");
    }
    const summary = normalizeSummary(lastRow.summary);
    const snippets = summary.summary.length > 0 ? summary.summary : [];
    const relationships = summary.relationships.filter((rel)=>rel.toLowerCase().includes(name.toLowerCase()));
    const bits = [
        range,
        detailLine,
        tipLine
    ];
    if (snippets.length > 0) {
        bits.push(`Latest mention summary: ${snippets[0]}`);
    }
    if (relationships.length > 0) {
        bits.push(`Noted relationships: ${relationships.slice(0, 2).join("; ")}`);
    }
    bits.push("Try noting things like:");
    return bits.join(" ");
}
function parseRelationshipNames(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/([A-Za-z][A-Za-z'\-]+)(?:\s*&\s*|\s*->\s*|\s*<->\s*|\s*=>\s*)([A-Za-z][A-Za-z'\-]+)\s*-\s*(.+)$/);
    if (!match) return null;
    const a = match[1]?.trim() ?? "";
    const b = match[2]?.trim() ?? "";
    if (!a || !b) return null;
    return {
        a,
        b
    };
}
function buildChapterIndex(rows) {
    const characters = new Map();
    const relationships = new Map();
    rows.forEach((row)=>{
        const chapter = row.chapter_number;
        const summary = normalizeSummary(row.summary);
        const summaryText = summary.summary.join(" ").toLowerCase();
        const reflectionText = summary.reflections.join(" ").toLowerCase();
        const extraText = Array.isArray(summary.extras) ? summary.extras.map((section)=>Array.isArray(section.items) ? section.items.join(" ") : "").join(" ").toLowerCase() : "";
        const names = new Set();
        summary.characters.forEach((name)=>{
            if (name) names.add(name);
        });
        summary.relationships.forEach((entry)=>{
            const rel = parseRelationshipNames(entry);
            if (rel) {
                names.add(rel.a);
                names.add(rel.b);
                const key = entry.toLowerCase();
                const existing = relationships.get(key);
                if (!existing || chapter >= existing.chapter) {
                    relationships.set(key, {
                        label: entry,
                        chapter
                    });
                }
            }
        });
        names.forEach((name)=>{
            const key = name.toLowerCase();
            const nameLower = key;
            const summaryHit = summaryText.includes(nameLower) ? 1 : 0;
            const reflectionHit = reflectionText.includes(nameLower) ? 1 : 0;
            const extraHit = extraText.includes(nameLower) ? 1 : 0;
            const relationshipHit = summary.relationships.some((rel)=>rel.toLowerCase().includes(nameLower)) ? 1 : 0;
            const entry = characters.get(key);
            if (!entry) {
                characters.set(key, {
                    name,
                    chapters: new Set([
                        chapter
                    ]),
                    first: chapter,
                    last: chapter,
                    mentions: 1,
                    summaryMentions: summaryHit,
                    relationshipMentions: relationshipHit,
                    reflectionMentions: reflectionHit,
                    extraMentions: extraHit
                });
                return;
            }
            entry.chapters.add(chapter);
            entry.first = Math.min(entry.first, chapter);
            entry.last = Math.max(entry.last, chapter);
            entry.mentions += 1;
            entry.summaryMentions += summaryHit;
            entry.relationshipMentions += relationshipHit;
            entry.reflectionMentions += reflectionHit;
            entry.extraMentions += extraHit;
        });
    });
    return {
        characters,
        relationships
    };
}
function formatChapterList(chapters) {
    const sorted = chapters.filter((n)=>Number.isFinite(n)).sort((a, b)=>a - b);
    if (sorted.length === 0) return "-";
    if (sorted.length <= 6) return sorted.join(", ");
    const head = sorted.slice(0, 4);
    const tail = sorted.slice(-2);
    return `${head.join(", ")}, ..., ${tail.join(", ")}`;
}
function selectRelevantCharacters(index, tokens) {
    const normalizedTokens = tokens.map((t)=>t.toLowerCase());
    const entries = Array.from(index.values());
    const matches = entries.filter((entry)=>{
        const nameLower = entry.name.toLowerCase();
        if (normalizedTokens.includes(nameLower)) return true;
        return normalizedTokens.some((token)=>token.length > 2 && nameLower.includes(token));
    });
    if (matches.length > 0) {
        return matches.slice(0, 6);
    }
    return entries.sort((a, b)=>b.mentions - a.mentions || a.first - b.first).slice(0, 6);
}
function formatCharacterIndex(entries) {
    if (entries.length === 0) return "None";
    return entries.map((entry)=>{
        const chapters = formatChapterList(Array.from(entry.chapters));
        return `- ${entry.name}: chapters ${chapters} (first: ${entry.first}, last: ${entry.last}) details: summary ${entry.summaryMentions}, relationships ${entry.relationshipMentions}, reflections ${entry.reflectionMentions}, extras ${entry.extraMentions}`;
    }).join("\n");
}
function formatRelationshipIndex(index) {
    const entries = Array.from(index.values()).sort((a, b)=>b.chapter - a.chapter).slice(0, 6);
    if (entries.length === 0) return "None";
    return entries.map((entry)=>`- ${entry.label} (latest: chapter ${entry.chapter})`).join("\n");
}
function extractTokens(question) {
    const lower = question.toLowerCase();
    const words = lower.match(/[a-z][a-z'-]{2,}/g) ?? [];
    const proper = Array.from(question.matchAll(/\b[A-Z][A-Za-z'-]{1,}\b/g)).map((match)=>match[0].toLowerCase());
    const all = [
        ...words,
        ...proper
    ];
    const filtered = all.filter((token)=>!STOP_WORDS.has(token));
    return Array.from(new Set(filtered));
}
function scoreRow(row, tokens) {
    if (!tokens.length) return 0;
    const haystack = JSON.stringify(row.summary ?? {}).toLowerCase();
    let score = 0;
    tokens.forEach((token)=>{
        if (haystack.includes(token)) score += 1;
    });
    return score;
}
function selectRelevantMemory(rows, tokens) {
    if (rows.length === 0) return [];
    const scored = rows.map((row)=>({
            row,
            score: scoreRow(row, tokens)
        })).sort((a, b)=>b.score - a.score || a.row.chapter_number - b.row.chapter_number);
    const withHits = scored.filter((entry)=>entry.score > 0);
    if (withHits.length > 0) {
        return withHits.slice(0, 6).map((entry)=>entry.row);
    }
    const tail = Math.min(3, rows.length);
    return rows.slice(rows.length - tail);
}
function mergeMemoryRows(base, extra, limit) {
    const merged = new Map();
    base.forEach((row)=>merged.set(row.chapter_number, row));
    extra.forEach((row)=>merged.set(row.chapter_number, row));
    return Array.from(merged.values()).sort((a, b)=>a.chapter_number - b.chapter_number).slice(-limit);
}
function formatMemoryBlock(row) {
    const detail = formatSummaryForPrompt(row.summary);
    return detail ? `Chapter ${row.chapter_number}:\n${detail}` : `Chapter ${row.chapter_number}: (no structured details yet)`;
}
function parseMaxChapter(raw) {
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
    const parsed = typeof raw === "string" ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function buildPromptActions(question, relevantCharacters, rowsByChapter) {
    const tokens = extractTokens(question);
    const mentioned = relevantCharacters.filter((entry)=>{
        const nameLower = entry.name.toLowerCase();
        return tokens.some((token)=>token === nameLower || nameLower.includes(token));
    });
    const targets = mentioned.length > 0 ? mentioned : relevantCharacters;
    const actions = [];
    targets.forEach((entry)=>{
        const detailScore = getDetailScore(entry);
        const isThin = entry.mentions <= 1 || detailScore < 2;
        if (!isThin) {
            return;
        }
        const context = buildCharacterPromptContext(entry.name, entry, rowsByChapter);
        actions.push({
            id: "prompt-note",
            label: `Write more about ${entry.name} ->`,
            chapterNumber: entry.first,
            topic: entry.name,
            prompt: {
                title: `About ${entry.name}`,
                context,
                questions: buildCharacterPromptQuestions(entry.name)
            }
        });
    });
    return actions.slice(0, 2);
}
async function POST(req, context) {
    try {
        const { bookId } = await context.params;
        if (!bookId) {
            return new Response(JSON.stringify({
                error: "bookId is required"
            }), {
                status: 400
            });
        }
        const body = await req.json();
        const question = normalizeQuestion(body.question);
        if (!question) {
            return new Response(JSON.stringify({
                error: "question is required"
            }), {
                status: 400
            });
        }
        if (!process.env.OPENAI_API_KEY) {
            return new Response(JSON.stringify({
                error: "Missing OPENAI_API_KEY in environment"
            }), {
                status: 500
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
        const explicitMax = parseMaxChapter(body.maxChapter);
        let maxChapter = explicitMax;
        if (!maxChapter) {
            const { data: latestNote, error: latestErr } = await supabase.from("notes").select("chapter_number").eq("book_id", bookId).order("chapter_number", {
                ascending: false
            }).limit(1).single();
            if (latestErr) throw latestErr;
            maxChapter = typeof latestNote?.chapter_number === "number" ? latestNote.chapter_number : null;
        }
        if (!maxChapter || maxChapter <= 0) {
            return new Response(JSON.stringify({
                error: "No notes found for this book yet."
            }), {
                status: 400
            });
        }
        let memoryRows = [];
        let memoryError = null;
        {
            const resp = await supabase.from("book_chapter_memory").select("chapter_number,summary").eq("book_id", bookId).lte("chapter_number", maxChapter).order("chapter_number", {
                ascending: true
            });
            memoryRows = resp.data ?? [];
            memoryError = resp.error;
        }
        if (memoryError) {
            memoryRows = [];
        }
        if (memoryRows.length === 0) {
            const { data: notes } = await supabase.from("notes").select("chapter_number,ai_summary,content,created_at").eq("book_id", bookId).lte("chapter_number", maxChapter).order("chapter_number", {
                ascending: true
            });
            const latestByChapter = new Map();
            (notes ?? []).forEach((note)=>{
                const chapter = typeof note.chapter_number === "number" ? note.chapter_number : null;
                if (!chapter) return;
                latestByChapter.set(chapter, {
                    chapter_number: chapter,
                    ai_summary: note.ai_summary,
                    content: typeof note.content === "string" ? note.content : null
                });
            });
            memoryRows = Array.from(latestByChapter.values()).map((note)=>({
                    chapter_number: note.chapter_number,
                    summary: note.ai_summary || (note.content ? {
                        summary: [
                            note.content
                        ]
                    } : {})
                })).sort((a, b)=>a.chapter_number - b.chapter_number);
        }
        const tokens = extractTokens(question);
        const chapterIndex = buildChapterIndex(memoryRows);
        const relevantCharacters = selectRelevantCharacters(chapterIndex.characters, tokens);
        const rowsByChapter = new Map();
        memoryRows.forEach((row)=>rowsByChapter.set(row.chapter_number, row));
        const ensured = [];
        relevantCharacters.forEach((entry)=>{
            const first = rowsByChapter.get(entry.first);
            const last = rowsByChapter.get(entry.last);
            if (first) ensured.push(first);
            if (last && last.chapter_number !== entry.first) ensured.push(last);
        });
        const maxChapterRow = rowsByChapter.get(maxChapter);
        if (maxChapterRow) {
            ensured.push(maxChapterRow);
        }
        const previousChapterRow = rowsByChapter.get(maxChapter - 1);
        if (previousChapterRow) {
            ensured.push(previousChapterRow);
        }
        const relevant = selectRelevantMemory(memoryRows, tokens);
        const mergedMemory = mergeMemoryRows(relevant, ensured, 8);
        const memoryBlocks = mergedMemory.map(formatMemoryBlock).join("\n\n");
        const characterIndexBlock = formatCharacterIndex(relevantCharacters);
        const relationshipIndexBlock = formatRelationshipIndex(chapterIndex.relationships);
        const actions = buildPromptActions(question, relevantCharacters, rowsByChapter);
        const sourceChapters = mergedMemory.map((row)=>row.chapter_number);
        const systemPrompt = `
You are the reader's chronicler inside a reading companion app. Speak with warmth and clarity, like a scribe who has been following along.

Rules:
- Use only the provided memory; do not invent or assume details.
- Do not spoil beyond the stated chapter limit.
- Do not quote the notes verbatim; paraphrase instead.
- Be conversational and logical, with a gentle narrative voice.
- Keep the summary to 1-2 short paragraphs.
- If the notes do not contain the answer, say so plainly and invite the reader to add it.
- When it helps, mention the knowledge cutoff as "up through chapter X".
- If the reader asks about a first appearance, use the chapter index to cite the earliest noted chapter, and admit if the introduction is not recorded.
- If detail signals are low for a character in question, say the notes are thin and suggest revisiting the first mention.

Output format (JSON only):
{
  "summary": string,
  "evidence": string[],   // short bullets drawn from memory; empty if none
  "relationships": string[] // short bullets naming relevant relationships; empty if none
}
`.trim();
        const userPrompt = `
Knowledge cutoff: chapter ${maxChapter}.

Reader question:
${question}

Character mentions by chapter (derived from notes up to this point):
${characterIndexBlock}

Relationships observed (latest note where seen):
${relationshipIndexBlock}

Relevant chapter memory:
${memoryBlocks || "None available yet."}

Reply now.
`.trim();
        const ai = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$ai$2f$client$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getAiConfig"])("assistant");
        const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
            apiKey: process.env.OPENAI_API_KEY
        });
        const response = await client.responses.create({
            model: process.env.AI_MODEL_ASSISTANT || ai.model,
            reasoning: {
                effort: "low"
            },
            input: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            max_output_tokens: process.env.AI_MAX_TOKENS_ASSISTANT ? parseInt(process.env.AI_MAX_TOKENS_ASSISTANT, 10) : ai.maxOutputTokens
        });
        const raw = (response.output_text ?? "").trim();
        const structured = normalizeStructured(tryParseJson(raw));
        const answer = structured?.summary || raw;
        if (!answer) {
            throw new Error("The assistant did not return a reply.");
        }
        return Response.json({
            answer,
            structured,
            sources: sourceChapters,
            maxChapter,
            actions
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to answer right now.";
        return new Response(JSON.stringify({
            error: message
        }), {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d695e928._.js.map