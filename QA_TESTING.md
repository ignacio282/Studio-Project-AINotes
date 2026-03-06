# QA Testing Guide

This project now supports two QA workflows:

1. Seeded QA users with predictable data.
2. Dev-only URL flags to force loading/empty/error states.

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

