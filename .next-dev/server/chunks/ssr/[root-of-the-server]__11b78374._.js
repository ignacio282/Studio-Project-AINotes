module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

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
"[project]/src/components/BookAssistantChat.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>BookAssistantChat
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
;
function safeId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 11);
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function renderEntityLinks(text, entities, bookId) {
    if (!text || !Array.isArray(entities) || entities.length === 0 || !bookId) {
        return text;
    }
    const entries = entities.map((entry)=>({
            name: typeof entry?.name === "string" ? entry.name.trim() : "",
            slug: typeof entry?.slug === "string" ? entry.slug.trim() : ""
        })).filter((entry)=>entry.name && entry.slug).sort((a, b)=>b.name.length - a.name.length);
    if (entries.length === 0) return text;
    const nameMap = new Map(entries.map((entry)=>[
            entry.name.toLowerCase(),
            entry
        ]));
    const pattern = new RegExp(`\\b(${entries.map((e)=>escapeRegExp(e.name)).join("|")})\\b`, "gi");
    const parts = text.split(pattern);
    return parts.map((part, idx)=>{
        const match = nameMap.get(part.toLowerCase());
        if (!match) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            children: part
        }, `${part}-${idx}`, false, {
            fileName: "[project]/src/components/BookAssistantChat.jsx",
            lineNumber: 34,
            columnNumber: 24
        }, this);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
            href: `/books/${bookId}/characters/${match.slug}`,
            className: "assistant-entity-link",
            children: part
        }, `${match.slug}-${idx}`, false, {
            fileName: "[project]/src/components/BookAssistantChat.jsx",
            lineNumber: 36,
            columnNumber: 7
        }, this);
    });
}
function formatSources(raw) {
    const list = Array.isArray(raw) ? Array.from(new Set(raw.filter((n)=>Number.isFinite(n)).map((n)=>Number(n)))) : [];
    const sorted = list.sort((a, b)=>a - b);
    if (sorted.length === 0) return "";
    return `Sources: chapters ${sorted.join(", ")}`;
}
function ChatMessage({ message, onAction, entities, bookId }) {
    const isAssistant = message.role === "assistant";
    const fullWidth = message.fullWidth === true;
    const sourcesLabel = formatSources(message.sources);
    const actions = Array.isArray(message.actions) ? message.actions.filter((action)=>action && typeof action.label === "string") : [];
    const content = typeof message.content === "string" ? message.content : "";
    const linkedContent = isAssistant ? renderEntityLinks(content, entities, bookId) : content;
    const sections = message.sections || null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `assistant-message-row ${isAssistant ? "" : "assistant-align-end"}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `assistant-message ${isAssistant ? "assistant-message--assistant" : "assistant-message--user"} ${fullWidth ? "assistant-message--full" : ""}`,
            children: [
                sections ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "assistant-section",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "assistant-section-title",
                                    children: "Summary"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 77,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "assistant-section-body whitespace-pre-wrap",
                                    children: linkedContent
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 78,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 76,
                            columnNumber: 13
                        }, this),
                        Array.isArray(sections.evidence) && sections.evidence.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "assistant-section",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "assistant-section-title",
                                    children: "Evidence"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 82,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "assistant-section-list",
                                    children: sections.evidence.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: renderEntityLinks(item, entities, bookId)
                                        }, `${item}-${index}`, false, {
                                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                                            lineNumber: 85,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 83,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 81,
                            columnNumber: 15
                        }, this) : null,
                        Array.isArray(sections.relationships) && sections.relationships.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "assistant-section",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "assistant-section-title",
                                    children: "Relationships"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 92,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "assistant-section-list",
                                    children: sections.relationships.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: renderEntityLinks(item, entities, bookId)
                                        }, `${item}-${index}`, false, {
                                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                                            lineNumber: 95,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 93,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 91,
                            columnNumber: 15
                        }, this) : null
                    ]
                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "whitespace-pre-wrap",
                    children: linkedContent
                }, void 0, false, {
                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                    lineNumber: 102,
                    columnNumber: 11
                }, this),
                sourcesLabel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "assistant-sources",
                    children: sourcesLabel
                }, void 0, false, {
                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                    lineNumber: 104,
                    columnNumber: 25
                }, this) : null,
                isAssistant && actions.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "assistant-actions",
                    children: actions.map((action)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: ()=>onAction && onAction(action),
                            className: "assistant-action-button",
                            children: action.label
                        }, action.id || action.label, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 108,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                    lineNumber: 106,
                    columnNumber: 11
                }, this) : null
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/BookAssistantChat.jsx",
            lineNumber: 69,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/BookAssistantChat.jsx",
        lineNumber: 68,
        columnNumber: 5
    }, this);
}
function TypingIndicator() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex justify-start",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "assistant-message assistant-message--user type-body text-[var(--color-secondary)]",
            children: "Thinking..."
        }, void 0, false, {
            fileName: "[project]/src/components/BookAssistantChat.jsx",
            lineNumber: 127,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/BookAssistantChat.jsx",
        lineNumber: 126,
        columnNumber: 5
    }, this);
}
function BookAssistantChat({ bookId, qaState = null }) {
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>[
            {
                id: safeId(),
                role: "assistant",
                fullWidth: true,
                content: `Hi! I am your Scriba assistant. I answer using only the notes you have saved for this book, up through your latest logged chapter.\n\nTry questions like:\n- Who is [character] again?\n- How are [character A] and [character B] connected?\n- Can you summarize what I have captured so far?\n\nIf your notes are thin, I will say that clearly and suggest what to capture next.`
            }
        ]);
    const [inputValue, setInputValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [promptOpen, setPromptOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [promptDraft, setPromptDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [promptResponse, setPromptResponse] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [promptError, setPromptError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [promptSaving, setPromptSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [entities, setEntities] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [scopeChapter, setScopeChapter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const scrollRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!scrollRef.current) return;
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [
        messages,
        isLoading
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let active = true;
        const loadEntities = async ()=>{
            try {
                const res = await fetch(`/api/characters?bookId=${encodeURIComponent(bookId)}`);
                if (!res.ok) return;
                const payload = await res.json();
                const list = Array.isArray(payload?.characters) ? payload.characters : [];
                if (active) {
                    setEntities(list);
                }
            } catch  {
            // ignore
            }
        };
        const loadScope = async ()=>{
            try {
                const res = await fetch(`/api/notes?bookId=${encodeURIComponent(bookId)}`);
                if (!res.ok) return;
                const payload = await res.json();
                const notes = Array.isArray(payload?.notes) ? payload.notes : [];
                const max = notes.reduce((acc, note)=>{
                    const chapter = Number(note?.chapter_number);
                    if (Number.isFinite(chapter) && chapter > acc) return chapter;
                    return acc;
                }, 0);
                if (active && max > 0) setScopeChapter(max);
            } catch  {
            // ignore
            }
        };
        if (bookId && qaState !== "empty") {
            loadEntities();
            loadScope();
        }
        return ()=>{
            active = false;
        };
    }, [
        bookId,
        qaState
    ]);
    const createEmptySummary = ()=>({
            summary: [],
            characters: [],
            setting: [],
            relationships: [],
            reflections: [],
            extras: []
        });
    const findLatestSummary = (notes, excludeId)=>{
        if (!Array.isArray(notes)) return createEmptySummary();
        for(let idx = notes.length - 1; idx >= 0; idx -= 1){
            const note = notes[idx];
            if (!note || note.id === excludeId) continue;
            const ai = note.ai_summary;
            if (ai && typeof ai === "object") {
                return ai;
            }
        }
        return createEmptySummary();
    };
    const upsertSummaryForPromptedNote = async (noteId, content, chapterNumber)=>{
        const listRes = await fetch(`/api/notes?bookId=${encodeURIComponent(bookId)}&chapterNumber=${encodeURIComponent(chapterNumber)}`);
        if (!listRes.ok) return;
        const listPayload = await listRes.json();
        const notes = Array.isArray(listPayload?.notes) ? listPayload.notes : [];
        const previousSummary = findLatestSummary(notes, noteId);
        const aiRes = await fetch("/api/ai-reply", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content,
                summary: previousSummary,
                notes: notes.map((note)=>({
                        id: note.id,
                        content: note.content,
                        createdAt: note.created_at
                    }))
            })
        });
        if (!aiRes.ok) return;
        const aiPayload = await aiRes.json();
        if (!aiPayload?.summary) return;
        await fetch(`/api/notes/${noteId}/summary`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                aiSummary: aiPayload.summary
            })
        });
    };
    const sendMessage = async ()=>{
        const trimmed = inputValue.trim();
        if (!trimmed || isLoading) return;
        const userMessage = {
            id: safeId(),
            role: "user",
            content: trimmed
        };
        setMessages((prev)=>[
                ...prev,
                userMessage
            ]);
        setInputValue("");
        if (qaState === "empty") {
            setMessages((prev)=>[
                    ...prev,
                    {
                        id: safeId(),
                        role: "assistant",
                        fullWidth: true,
                        content: "I do not have any chapter notes for this book yet. Add your first note and I can help right away."
                    }
                ]);
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/assistant`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: trimmed
                })
            });
            if (!res.ok) {
                let message = "Unable to reach the assistant right now.";
                try {
                    const payload = await res.json();
                    if (payload?.error) message = payload.error;
                } catch  {
                // ignore
                }
                throw new Error(message);
            }
            const payload = await res.json();
            const answer = typeof payload?.answer === "string" ? payload.answer.trim() : "";
            const actions = Array.isArray(payload?.actions) ? payload.actions : [];
            const structured = payload?.structured && typeof payload.structured === "object" ? payload.structured : null;
            if (!answer && !(structured && typeof structured.summary === "string")) {
                throw new Error("The assistant did not return a reply.");
            }
            setMessages((prev)=>[
                    ...prev,
                    {
                        id: safeId(),
                        role: "assistant",
                        fullWidth: true,
                        content: typeof structured?.summary === "string" ? structured.summary : answer,
                        actions,
                        sources: Array.isArray(payload?.sources) ? payload.sources : [],
                        sections: structured ? {
                            evidence: Array.isArray(structured?.evidence) ? structured.evidence : [],
                            relationships: Array.isArray(structured?.relationships) ? structured.relationships : []
                        } : null
                    }
                ]);
            if (Number.isFinite(payload?.maxChapter)) {
                setScopeChapter(payload.maxChapter);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Something went wrong.";
            setError(message);
            setMessages((prev)=>[
                    ...prev,
                    {
                        id: safeId(),
                        role: "assistant",
                        fullWidth: true,
                        content: "I hit a snag while checking your notes. Try again in a moment."
                    }
                ]);
        } finally{
            setIsLoading(false);
        }
    };
    const handleSubmit = (event)=>{
        event.preventDefault();
        void sendMessage();
    };
    const handleKeyDown = (event)=>{
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void sendMessage();
        }
    };
    const handleAction = (action)=>{
        if (!action || action.id !== "prompt-note") return;
        setPromptDraft(action);
        setPromptResponse("");
        setPromptError("");
        setPromptOpen(true);
    };
    const handlePromptSave = async ()=>{
        if (!promptDraft) return;
        const trimmed = promptResponse.trim();
        if (!trimmed) {
            setPromptError("Please add a quick note before saving.");
            return;
        }
        setPromptSaving(true);
        setPromptError("");
        try {
            const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/prompted-notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chapterNumber: promptDraft.chapterNumber,
                    content: trimmed,
                    prompt: {
                        title: promptDraft?.prompt?.title,
                        context: promptDraft?.prompt?.context,
                        questions: promptDraft?.prompt?.questions,
                        topic: promptDraft?.topic
                    }
                })
            });
            if (!res.ok) {
                let message = "Unable to save that note.";
                try {
                    const payload = await res.json();
                    if (payload?.error) message = payload.error;
                } catch  {
                // ignore
                }
                throw new Error(message);
            }
            const payload = await res.json();
            if (payload?.noteId) {
                await upsertSummaryForPromptedNote(payload.noteId, trimmed, promptDraft.chapterNumber);
            }
            setMessages((prev)=>[
                    ...prev,
                    {
                        id: safeId(),
                        role: "assistant",
                        fullWidth: true,
                        content: "Got it. I added that to your notes and folded it into the book memory."
                    }
                ]);
            setPromptOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to save that note.";
            setPromptError(message);
        } finally{
            setPromptSaving(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "assistant-chat",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: scrollRef,
                className: "assistant-scroll",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "assistant-scroll-inner",
                    children: [
                        scopeChapter ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "assistant-scope",
                            children: [
                                "Using notes up through chapter ",
                                scopeChapter
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 422,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "assistant-scope",
                            children: "No chapter notes yet. Add a note and I can help you review it."
                        }, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 424,
                            columnNumber: 13
                        }, this),
                        messages.map((message)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ChatMessage, {
                                message: message,
                                onAction: handleAction,
                                entities: entities,
                                bookId: bookId
                            }, message.id, false, {
                                fileName: "[project]/src/components/BookAssistantChat.jsx",
                                lineNumber: 427,
                                columnNumber: 13
                            }, this)),
                        isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TypingIndicator, {}, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 435,
                            columnNumber: 24
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                    lineNumber: 420,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/BookAssistantChat.jsx",
                lineNumber: 419,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                onSubmit: handleSubmit,
                className: "assistant-input-bar",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "assistant-input-inner",
                    children: [
                        error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "type-caption mb-2 text-red-500",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 440,
                            columnNumber: 20
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "assistant-input-row",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                    value: inputValue,
                                    onChange: (event)=>setInputValue(event.target.value),
                                    onKeyDown: handleKeyDown,
                                    rows: 1,
                                    placeholder: "Ask about your notes, characters, places, or moments",
                                    className: "assistant-textarea",
                                    disabled: isLoading
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 442,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "assistant-send",
                                    disabled: isLoading || !inputValue.trim(),
                                    "aria-label": "Send question",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "h-4 w-4",
                                        viewBox: "0 0 20 20",
                                        fill: "none",
                                        xmlns: "http://www.w3.org/2000/svg",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M3.75 3.75l12.5 6.25-12.5 6.25 2.5-6.25-2.5-6.25z",
                                            stroke: "currentColor",
                                            strokeWidth: "1.4",
                                            strokeLinejoin: "round"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                                            lineNumber: 458,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/BookAssistantChat.jsx",
                                        lineNumber: 457,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 451,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 441,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                    lineNumber: 439,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/BookAssistantChat.jsx",
                lineNumber: 438,
                columnNumber: 7
            }, this),
            promptOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full max-w-lg rounded-2xl bg-[var(--color-page)] p-5 text-[var(--color-text-main)] shadow-xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "type-body text-[var(--color-secondary)]",
                            children: "Prompted note"
                        }, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 473,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "type-h3 mt-1",
                            children: promptDraft?.prompt?.title || "Add a note"
                        }, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 474,
                            columnNumber: 13
                        }, this),
                        promptDraft?.chapterNumber ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "type-caption mt-1 text-[var(--color-secondary)]",
                            children: [
                                "Chapter ",
                                promptDraft.chapterNumber
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 478,
                            columnNumber: 15
                        }, this) : null,
                        promptDraft?.prompt?.context ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "type-body mt-3 rounded-xl bg-[var(--color-surface)] p-3 text-[var(--color-secondary)]",
                            children: promptDraft.prompt.context
                        }, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 484,
                            columnNumber: 15
                        }, this) : null,
                        Array.isArray(promptDraft?.prompt?.questions) && promptDraft.prompt.questions.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "type-body mt-4 space-y-2",
                            children: promptDraft.prompt.questions.map((question, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                                            lineNumber: 493,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: question
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                                            lineNumber: 494,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, `${question}-${index}`, true, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 492,
                                    columnNumber: 19
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 490,
                            columnNumber: 15
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 rounded-xl bg-[var(--color-surface)] px-3 py-2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                value: promptResponse,
                                onChange: (event)=>setPromptResponse(event.target.value),
                                rows: 4,
                                placeholder: "Write a few lines...",
                                className: "type-body w-full resize-none bg-transparent text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-disabled)]"
                            }, void 0, false, {
                                fileName: "[project]/src/components/BookAssistantChat.jsx",
                                lineNumber: 501,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 500,
                            columnNumber: 13
                        }, this),
                        promptError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "type-caption mt-2 text-red-500",
                            children: promptError
                        }, void 0, false, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 510,
                            columnNumber: 28
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 flex items-center justify-end gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setPromptOpen(false),
                                    className: "type-button rounded-full px-4 py-2 text-[var(--color-secondary)]",
                                    disabled: promptSaving,
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 513,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: handlePromptSave,
                                    className: "type-button rounded-full bg-[var(--color-accent)] px-4 py-2 text-[var(--color-text-on-accent)] transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60",
                                    disabled: promptSaving,
                                    children: promptSaving ? "Saving..." : "Save note"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                                    lineNumber: 521,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/BookAssistantChat.jsx",
                            lineNumber: 512,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/BookAssistantChat.jsx",
                    lineNumber: 472,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/BookAssistantChat.jsx",
                lineNumber: 471,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/BookAssistantChat.jsx",
        lineNumber: 418,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__11b78374._.js.map