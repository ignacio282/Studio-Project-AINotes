# Deployment Guide

This guide covers the current production deployment flow for Scriba on Vercel with Supabase auth.

## What This App Needs

Scriba depends on:

- Next.js App Router on Vercel
- Supabase database
- Supabase Auth for login
- Supabase Storage bucket `book-covers` for uploaded covers
- OpenAI API for AI routes
- Optional Google Books API for stronger book search results

## Before You Start

Do these first:

1. Make sure the app builds locally:
   - `npm.cmd run lint`
   - `npm.cmd run build`
2. Rotate any secrets that were accidentally exposed locally.
3. Confirm you have access to:
   - Vercel project/account
   - Supabase project
   - GitHub repo

## 1. Run Supabase Migrations

Apply the SQL files in `db/` in Supabase SQL Editor.

Run these:

1. [db/2025-11-06_add_books_columns.sql](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/db/2025-11-06_add_books_columns.sql)
2. [db/2025-11-07_add_book_chapter_memory.sql](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/db/2025-11-07_add_book_chapter_memory.sql)
3. [db/2025-11-08_add_note_prompts.sql](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/db/2025-11-08_add_note_prompts.sql)
4. [db/2026-02-09_reassign_legacy_data_to_user.sql](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/db/2026-02-09_reassign_legacy_data_to_user.sql)
5. [db/2026-03-13_create_book_covers_bucket.sql](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/db/2026-03-13_create_book_covers_bucket.sql)
6. [db/2026-04-25_add_book_knowledge_base.sql](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/db/2026-04-25_add_book_knowledge_base.sql)
7. [db/2026-04-25_add_character_assistant_snapshots.sql](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/db/2026-04-25_add_character_assistant_snapshots.sql)

Notes:

- `2026-02-09_reassign_legacy_data_to_user.sql` is only needed if you already have older rows with missing ownership.
- The new `book-covers` migration creates the public storage bucket used by the add-book flow.
- The April 2026 migrations support character/place knowledge, relationship timelines, and assistant-derived character snapshots.

## 2. Prepare Supabase Auth

This app currently has login, but not self-serve sign-up.

That means you should manually create production demo/tester accounts in Supabase:

1. Open `Supabase Dashboard -> Authentication -> Users`.
2. Create each account with email/password auth.
3. Use unique temporary passwords stored outside the repository.
4. Mark emails as confirmed if Supabase asks.
5. Add optional metadata such as `{ "demo": true, "demo_date": "2026-05-01", "role": "populated" }`.

Recommended:

- For the Friday, May 1, 2026 demo, use the account plan in [DEMO_READINESS.md](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/DEMO_READINESS.md).
- Keep the populated demo account separate from your personal account.
- Keep live tester accounts empty so attendees see the new-user experience.
- Do not expose public sign-up yet.

## 3. Check Supabase Auth URL Settings

Open:

- `Supabase Dashboard -> Authentication -> URL Configuration`

Set:

- `Site URL` = your production Vercel URL
- Add redirect URLs for:
  - your production domain
  - your Vercel preview domain if you want preview testing
  - `http://localhost:3000` for local testing

Typical examples:

- `https://your-project.vercel.app`
- `https://your-custom-domain.com`
- `http://localhost:3000`

## 4. Collect Environment Variables

You need these in Vercel:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional but recommended:

- `GOOGLE_BOOKS_API_KEY`
- `OPEN_LIBRARY_CONTACT_EMAIL`

Behavior notes:

- If `GOOGLE_BOOKS_API_KEY` is missing, book search falls back to Open Library.
- If `OPENAI_API_KEY` is missing, AI routes will fail.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in client code.

## 5. Create the Vercel Project

In Vercel:

1. Click `Add New Project`.
2. Import the GitHub repo.
3. Select the correct branch for deployment.
4. Framework should auto-detect as `Next.js`.
5. Leave build settings at defaults unless Vercel shows something incorrect.

Current project notes:

- There is no active `.vercel/` folder in the repo.
- There is no `vercel.json`.
- The repo appears to have been connected to Vercel before, but current deploy config is effectively clean.

## 6. Add Environment Variables in Vercel

In the Vercel project:

1. Go to `Settings -> Environment Variables`.
2. Add the required variables.
3. Add them to:
   - `Production`
   - `Preview`
   - `Development` if you want Vercel dev parity

Double-check there are no typos in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 7. Deploy

After env vars are set:

1. Trigger the first production deploy.
2. Wait for build completion.
3. Open the deployed app.

Expected result:

- unauthenticated users should be redirected to `/login`
- authenticated users with no books should enter onboarding
- users can add a book and land on `/home`

## 8. Post-Deploy Smoke Test

Run this in production after deploy.

### Login

1. Open `/login`
2. Sign in with your test account
3. Confirm you land in the expected page

### Onboarding -> Add Book

1. Use a fresh account with no books
2. Confirm onboarding loads
3. Continue to add-book flow
4. Search for a book
5. Add a book with and without a cover

### Home and Library

1. Confirm `/home` loads
2. Confirm current book card renders
3. Confirm `/library` loads
4. Confirm switching books works if multiple books exist

### Journaling

1. Start a note from the book flow
2. Save/update the note
3. Confirm note data shows up where expected

### Reflection

1. Trigger reflection question generation
2. Submit a reflection response
3. Confirm reflection change summary returns cleanly

### Assistant

1. Ask a question in the assistant
2. Confirm the answer renders
3. Confirm sources and chapter scope display

### Friday Demo Accounts

Use the production accounts from [DEMO_READINESS.md](C:/Users/Ignacio/Desktop/readingCompanion-aiBack/reading-companion-ai/DEMO_READINESS.md):

1. `demo-new-user`: login -> onboarding -> add book screen
2. `tester-1`: login -> onboarding starts cleanly
3. `tester-2`: login -> onboarding starts cleanly
4. `demo-populated`: login -> Home -> Library -> Book Hub -> start note -> save/update note -> reflection -> assistant Q&A -> note detail -> character profile

## 9. Known Deployment-Sensitive Areas

These are the most likely technical experience breakers:

- Missing Supabase env vars
- Missing `book-covers` storage bucket or upload policy
- Missing `OPENAI_API_KEY`
- Wrong Supabase auth URL config
- Using an account that exists in auth but has unexpected old data ownership

## 10. If Something Breaks

Check these first:

### Login loop

Verify:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase `Site URL`
- browser cookies are allowed

### Add book fails when uploading a cover

Verify:

- `book-covers` bucket exists
- the storage policy was created
- file is under 2 MB

### AI routes fail

Verify:

- `OPENAI_API_KEY` is set in Vercel
- deployment picked up the latest environment variables

### Book search is weak or empty

Verify:

- `GOOGLE_BOOKS_API_KEY` is set
- if not, Open Library fallback is still working

## 11. Useful Local Commands

```bash
npm.cmd run lint
npm.cmd run build
```

If you need seeded QA users locally:

```bash
npm.cmd run qa:seed
```

That script depends on:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The seed script writes `qa-seed-output.txt`, which is intentionally ignored because it contains generated local IDs and the configured QA password.

## 12. Recommended Release Flow

For a production demo or short real-world test, the safest flow is:

1. Deploy with login enabled.
2. Create dedicated Supabase Auth accounts instead of reusing personal accounts.
3. Populate the main demo account through the app UI so derived memory tables stay synchronized.
4. Do not expose public sign-up yet.
5. Keep the deployment private to known tester accounts until the demo or test window is done.

## Current State Summary

As of April 27, 2026:

- local lint passes
- production build passes
- login redirect behavior is fixed
- `useSearchParams()` production build issues were fixed
- book cover storage setup now has a migration
- production demo account prep is documented in `DEMO_READINESS.md`
