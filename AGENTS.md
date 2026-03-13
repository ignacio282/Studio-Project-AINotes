# AGENTS.md

## Purpose
This file defines how agents should work in this repository so changes are consistent, safe, and easy to review.

## Project Snapshot
- Framework: Next.js App Router (`app/`), React 19.
- Backend style: Route handlers in `app/api/**/route.ts`.
- Data store: Supabase (`books`, `notes`, `book_chapter_memory`, `characters`, `note_prompts`).
- AI SDK: OpenAI Responses API (`openai` package).
- Key UI entry points:
  - Journaling + reflection flow: `app/page.jsx`
  - Book assistant UI: `src/components/BookAssistantChat.jsx`

## Product Context
- Product name in UI: `Scriba`.
- Core promise: help readers remember and understand what they read by turning raw notes into structured memory, reflection prompts, and chapter-scoped Q&A.
- AI boundary: assistant answers are based only on user notes/memory, with no internet lookup and no spoilers beyond captured chapter scope.
- Primary unit of work: a user reads a chapter, writes notes, then uses reflection and assistant tools to reinforce understanding.

## Feature Map (User-Facing)
- Authentication and entry
  - Login screen: `app/login/page.jsx`
  - Onboarding flow for new users: `app/onboarding/page.jsx`
- Book setup and library
  - Add new book (title, metadata, optional cover upload): `app/books/new/page.jsx`
  - Library overview and sections (currently reading, to be read, finished): `app/library/page.jsx`
  - Switch current book: `app/library/switch/page.jsx`, `app/library/switch/SwitchBooksClient.jsx`
- Home dashboard
  - Current book card, story-so-far summary, progress, top characters, quick navigation: `app/home/page.jsx`
- Book workspace
  - Book hub with tabs for notes, characters, places and quick entry points: `app/books/[bookId]/page.jsx`, `src/components/BookHubTabs.jsx`
  - Start-note sheet and deep link into journaling: `src/components/BookChapterStartSheet.jsx`
- Journaling and reflection
  - Main journaling + structured summary + reflection loop: `app/page.jsx`
  - Book-scoped journaling route wrapper: `app/books/[bookId]/journal/page.jsx`
- Assistant and memory retrieval
  - Chapter-scoped assistant chat, evidence sections, source chapters, follow-up prompt-note actions: `app/books/[bookId]/assistant/page.jsx`, `src/components/BookAssistantChat.jsx`
- Entities and note drill-down
  - Character profile (bio, first/last appearance, timeline): `app/books/[bookId]/characters/[slug]/page.jsx`
  - Note detail with AI summary breakdown: `app/books/[bookId]/chapters/[chapterNumber]/notes/[noteId]/page.jsx`, `src/components/NoteSummaryView.jsx`
- Known product constraints (current behavior)
  - Bottom-nav `Stats` and `You` are present but disabled (coming soon): `src/components/navigation/AppBottomNav.jsx`
  - Note filter chips in book hub are currently mostly visual and not full filtering logic yet.

## Primary User Journeys
- Journey 1: First-time setup
  - User logs in.
  - User completes onboarding slides.
  - User adds first book.
  - User lands in Home with that book as current context.
- Journey 2: Capture and structure a chapter
  - User starts a note from book hub or quick actions.
  - User writes freeform notes in journaling.
  - AI updates structured summary (`characters`, `setting`, `relationships`, `reflections`, extras) and chapter memory.
  - User can review generated note sections in note detail and book hub.
- Journey 3: Reflect to deepen retention
  - User enters reflection flow after journaling.
  - AI asks focused follow-up questions based on existing structured notes.
  - Reflection responses update structured summary and produce a short "what changed" recap.
- Journey 4: Ask assistant with spoiler-safe scope
  - User asks assistant about characters/moments.
  - Assistant uses memory up through latest logged chapter (or explicit max chapter).
  - Assistant returns concise answer plus evidence/relationships and source chapters.
  - If memory is thin, assistant suggests prompt-notes to capture missing detail.
- Journey 5: Explore entities and history
  - User opens character list/place list from book hub.
  - User opens character profiles to see role, bios, first/last appearance, timeline snippets.
  - User opens note detail pages for full content and AI-extracted structure.

## Product-First Change Rules
- Always anchor implementation decisions to a specific user journey and screen impact.
- For any change, document user-visible behavior first, then technical implementation.
- Prefer preserving flow continuity over strict technical elegance:
  - journaling must remain fast and resilient,
  - assistant answers must stay spoiler-safe and understandable,
  - navigation context (current book/chapter) must remain intact.
- Avoid backend-only changes that degrade UX copy, interaction timing, or screen state behavior.
- When requirements are ambiguous, choose the option that keeps reader trust:
  - no invented facts,
  - clear uncertainty language,
  - explicit chapter scope.

## Product Acceptance Checks
- Before finishing a task, verify the affected user journey end-to-end, not only the endpoint.
- Confirm empty/loading/error states remain understandable on affected screens.
- Confirm app state continuity:
  - current book context remains correct,
  - chapter context remains correct,
  - newly created/updated content appears where users expect it.
- If a change affects AI output shape, verify the corresponding UI renderer still presents it correctly.

## Repository Map
- `app/`: Pages and API routes.
- `app/api/`: Server endpoints. Keep route logic local to each domain.
- `src/components/`: Reusable UI.
- `src/lib/ai/`: AI config and reusable prompts.
- `src/lib/supabase/`: Supabase server/client helpers and auth helper.
- `src/lib/entities/`: Entity normalization and name matching utilities.
- `db/`: SQL migrations and maintenance scripts.
- `public/`: Static assets.

## Core Engineering Rules
- Keep changes scoped and behavior-preserving unless the task explicitly requests behavior changes.
- Prefer small composable helpers over inlining repeated logic.
- Do not silently change request/response contracts.
- Preserve current style: TypeScript in API layers, existing JS/JSX where already used.
- Do not introduce new dependencies unless necessary and justified.

## API Design Rules
- Validate inputs at the boundary of each route.
- Return consistent error shape:
  - `{"error":"..."}`
- Use meaningful status codes:
  - `400` bad input
  - `401` unauthorized
  - `404` not found
  - `500` unexpected failure
- Keep successful payloads minimal and explicit.
- If route contract changes, update all call sites in the same PR.

## Auth and Data Access Policy
- `middleware.ts` currently allows `/api/*` without redirect; API routes must enforce auth themselves.
- For user-scoped data, call `requireUser()` inside the route.
- Never use `getServiceSupabase()` in client code.
- Do not trust `bookId`/`noteId` alone; ensure user ownership on reads/writes.

## AI Endpoint Contract Map
Keep these contracts stable unless all callers are updated together.

- `POST /api/ai-reply`
  - Input: `{ content, summary?, notes? }`
  - Output: `{ summary, metadata }`
- `POST /api/reflection-question`
  - Input: `{ summary?, topic?, questionIndex?, userResponses?, askedQuestions? }`
  - Output: `{ question }`
- `POST /api/reflection-change`
  - Input: `{ before?, after?, highlights?, responses? }`
  - Output: `{ summary }`
- `POST /api/books/[bookId]/assistant`
  - Input: `{ question, maxChapter? }`
  - Output: `{ answer, structured?, sources, maxChapter, actions }`
- `POST /api/characters/generate`
  - Input: `{ bookId, names? }`
  - Output: `{ updated }`

## AI Implementation Rules
- Use OpenAI Responses API with explicit `input` role messages.
- Prefer centralized model/token defaults from `src/lib/ai/client.ts` (`getAiConfig`) for new endpoints.
- Enforce anti-hallucination behavior:
  - Use only user notes/memory context.
  - No spoilers beyond cutoff chapter.
  - If unknown, say unknown.
- Keep robust JSON parsing fallbacks for model output.
- Maintain `mock=1` compatibility for AI routes and preserve deterministic mock responses.
- Any prompt behavior change must include:
  - clear intent,
  - one before/after example,
  - manual verification notes.

## Data Invariants
- `notes.ai_summary` is the canonical structured summary snapshot per note.
- `book_chapter_memory.summary` should remain aligned with latest chapter summary state.
- Character extraction and typo-resolution flows should keep `characters` synchronized with note summaries.
- `user_id` ownership must stay consistent across related rows (`books`, `notes`, `characters`, `book_chapter_memory`, `note_prompts`).
- Do not break existing fields used by normalizers:
  - `summary`, `characters`, `setting`, `relationships`, `reflections`, `extras/extraSections`.

## DB and Migration Rules
- Any schema-dependent code change requires a migration in `db/`.
- Migration filenames: `YYYY-MM-DD_short_description.sql`.
- Prefer idempotent SQL (`if not exists`, safe `do $$ ... $$` guards).
- Include indexes when adding new query patterns.
- Include data backfill steps when introducing non-nullable or derived fields.

## Frontend Workflow Rules
- For `app/page.jsx`, avoid adding more monolithic logic; extract helpers/components when touching large blocks.
- Keep chat/reflection UI resilient to partial API failures.
- Do not block core journaling flow on non-critical background updates.
- Preserve current UX constraints:
  - optimistic note flow,
  - graceful fallback messages,
  - source chapter visibility in assistant mode.

## Figma Implementation Rules
- When the user provides a Figma link, frame link, or node ID, inspect the design in Figma before implementing.
- Do not rely on screenshots alone if a Figma reference is available.
- For each relevant frame, inspect both:
  - visual output (frame screenshot or screenshot export),
  - metadata/design definitions (node tree, fills, strokes, corner radius, spacing, typography, padding, sizing, component structure).
- Check shared definitions when available:
  - local styles,
  - variables/tokens,
  - component instances and their visible variants/states.
- Before implementing, summarize:
  - what the user will see,
  - which parts are directly defined in Figma,
  - which parts are inferred because the design data is incomplete or ambiguous.
- If the Figma bridge appears incomplete or misleading, say so explicitly and call out the exact fidelity risk instead of approximating silently.
- When hidden layers, component states, or instance overrides may affect behavior or visuals, verify them before treating the design as final.
- When implementing from Figma, map the design to existing app tokens in `app/globals.css` whenever possible; only introduce new styles when the current tokens cannot represent the design faithfully.

## Typography Conventions
- Use app typography tokens from `app/globals.css` (`type-h1`, `type-h2`, `type-h3`, `type-title`, `type-body`, `type-button`, `type-caption`, `type-small`).
- Buttons and button labels must use `type-button`.
- Paragraph/body copy must use `type-body`.
- Helper/tip/support text should use `type-caption` unless a screen-specific requirement says otherwise.
- Headings are hierarchical by screen structure:
  - `H1` for primary page title/hero text,
  - `H2` for major page-section titles,
  - `H3` for subsection titles and card-section titles.
- When implementing from design, do not create ad-hoc font sizes; map each text element to one token from this scale.

## Security and Secrets
- Never commit secrets (API keys, service-role keys, tokens).
- Never log raw secrets or full credentialed payloads.
- Avoid logging full user note bodies in server errors unless explicitly needed for debugging and then redact.
- If a secret is exposed, rotate it and remove it from tracked files.

## Encoding and Text Hygiene
- Save source files as UTF-8.
- Avoid mojibake regressions in prompt text and user-facing strings.
- Normalize whitespace and trim text inputs in routes.

## Performance and Reliability
- Bound expensive operations:
  - limit rows,
  - select only required columns,
  - avoid repeated full-table scans.
- Keep AI token budgets constrained via env/model config.
- Treat downstream sync calls as best-effort when appropriate, but never hide critical failures.

## Testing and Verification Checklist
For behavior changes, run at least:
- `npm run lint`
- User-flow smoke checks on affected journeys (screen + API together), especially:
  - onboarding -> add book -> home landing
  - book hub -> start note -> journaling update
  - reflection loop -> reflection-change recap
  - assistant question -> structured response -> source chapters shown
  - character/profile and note detail drill-down after updates
- Manual smoke checks:
  - journaling update -> summary patch path
  - reflection question generation
  - reflection change summary
  - book assistant Q&A path
  - character generation or typo-resolution flow
- Verify `mock=1` paths for affected AI endpoints.

## PR Done Definition
A change is done when:
- Route contracts and all callers are in sync.
- Auth and ownership checks are correct.
- Data invariants remain intact.
- Migrations (if needed) are included.
- Lint passes and manual smoke checks are recorded.
- No secrets were added or leaked.
