# QA Testing Guide

This project supports local QA workflows and a separate production demo workflow.

1. Seeded QA users with predictable data.
2. Dev-only URL flags to force loading/empty/error states.
3. Manual production demo accounts documented in `DEMO_READINESS.md`.

For the Friday, May 1, 2026 production demo, do not use the local seed accounts as the main showcase accounts. Create the production accounts manually in Supabase and populate the main demo account through the app UI so derived memory stays in sync.

## 1) Seed QA Users

Run:

```bash
npm run qa:seed
```

What it does:

- Creates or updates these users:
  - `qa.new@scriba.local` (no books, onboarding path)
  - `qa.empty@scriba.local` (books but no notes)
  - `qa.active@scriba.local` (books + notes + characters)
  - `qa.edge@scriba.local` (long/edge content)
- Resets their app data each run so results stay consistent.
- Writes ready-to-use URLs to:
  - `qa-seed-output.txt`

Default password for all QA users:

- `ScribaQa123!`

Optional env overrides:

- `QA_SEED_PASSWORD` (custom password for all QA users)
- `QA_BASE_URL` (default: `http://localhost:3000`)

Notes:

- `qa-seed-output.txt` is generated and intentionally ignored by Git.
- Use this workflow for local/dev QA only unless you intentionally point the environment at a disposable Supabase project.

## 2) How To Use It (Simple)

1. Start app:

```bash
npm run dev
```

2. Open:

- `qa-seed-output.txt`

3. Login with one QA user at a time from:

- `http://localhost:3000/login`

4. Run your checks using the URLs listed in the output file.

## 3) Force UI States with Query Params (Dev Only)

You can append one of these to supported pages:

- `?qa=loading`
- `?qa=empty`
- `?qa=error`

Examples:

- `http://localhost:3000/home?qa=loading`
- `http://localhost:3000/home?qa=empty`
- `http://localhost:3000/library?qa=error`

Notes:

- These flags are enabled outside production by default.
- They are for QA only, not for end users.

## 4) Quick Recommendation

For fast QA sessions:

1. Use `qa.active` for core happy-path checks.
2. Use `qa.new` for onboarding/first-time flow.
3. Use `?qa=loading|empty|error` to validate fallback UI behavior.

## 5) Production Demo Checklist

Use `DEMO_READINESS.md` as the source of truth for production demo prep.

Minimum Friday smoke test:

1. `demo-new-user`: login -> onboarding -> add book screen.
2. `tester-1` and `tester-2`: login -> onboarding starts cleanly.
3. `demo-populated`: login -> Home -> Library -> Book Hub -> start note -> save/update note -> reflection -> assistant Q&A -> note detail -> character profile.
4. Confirm assistant answers show source chapters and stay within captured chapter scope.
5. Confirm disabled `Stats` and `You` nav items look intentional.
