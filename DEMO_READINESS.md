# Scriba Friday Demo Runbook

This runbook is for the Friday, May 1, 2026 demo using the production Vercel app and production Supabase project.

## Account Setup

Create these accounts manually in Supabase Dashboard -> Authentication -> Users. Use unique temporary passwords and store them outside the repository.

| Role | Starting state | Purpose |
| --- | --- | --- |
| `demo-populated` | Fresh user, then manually populated through Scriba | Show what Scriba looks like after real use |
| `demo-new-user` | No books or notes | Show onboarding and first-book setup |
| `tester-1` | No books or notes | Live attendee test account |
| `tester-2` | No books or notes | Live attendee test account |

For each account:

- Use email/password auth.
- Mark the email as confirmed.
- Do not store passwords in the repo, docs, `.env`, GitHub, or chat.
- Optional user metadata:

```json
{ "demo": true, "demo_date": "2026-05-01", "role": "populated" }
```

Change `role` to `new-user`, `tester-1`, or `tester-2` for the other accounts.

## Populating The Demo Account

Populate `demo-populated` through the production app UI so notes, chapter memory, characters, places, relationships, and assistant snapshots are created through the same path users will see.

Minimum target:

- One current book with 5-8 real or sanitized notes across multiple chapters.
- Optional paused and finished books so Home and Library feel lived-in.
- At least two reflection flows.
- Two or three assistant questions, including one about a character.
- One note detail view and one character profile that look useful enough to open during the demo.

Do not insert populated demo data directly into tables unless there is a specific timestamp-only adjustment after the UI-generated data is reviewed.

## Optional Timestamp Adjustment

Use this only after manually populating `demo-populated`, and only after replacing the placeholders. Run it in Supabase SQL Editor.

```sql
-- 1. Resolve the account first.
select id, email
from auth.users
where lower(email) = lower('<demo-populated-email>');

-- 2. Preview the rows that would be adjusted.
select b.id, b.title, b.created_at, b.updated_at, count(n.id) as note_count
from public.books b
left join public.notes n on n.book_id = b.id and n.user_id = b.user_id
where b.user_id = '<demo-populated-user-id>'
group by b.id, b.title, b.created_at, b.updated_at
order by b.updated_at desc;

-- 3. Example scoped adjustment. Replace IDs and timestamps intentionally.
update public.books
set created_at = '2026-04-13 09:00:00+00',
    updated_at = '2026-04-26 20:00:00+00'
where user_id = '<demo-populated-user-id>'
  and id = '<book-id>';

update public.notes
set created_at = case chapter_number
  when 1 then '2026-04-13 20:00:00+00'::timestamptz
  when 2 then '2026-04-15 20:00:00+00'::timestamptz
  when 3 then '2026-04-18 20:00:00+00'::timestamptz
  when 4 then '2026-04-21 20:00:00+00'::timestamptz
  when 5 then '2026-04-24 20:00:00+00'::timestamptz
  else created_at
end
where user_id = '<demo-populated-user-id>'
  and book_id = '<book-id>';
```

Do not run broad cleanup SQL. Every destructive query should include the specific demo user ID.

## Production Schema Checklist

Confirm production has these migrations applied:

- `db/2025-11-06_add_books_columns.sql`
- `db/2025-11-07_add_book_chapter_memory.sql`
- `db/2025-11-08_add_note_prompts.sql`
- `db/2026-03-13_create_book_covers_bucket.sql`
- `db/2026-04-25_add_book_knowledge_base.sql`
- `db/2026-04-25_add_character_assistant_snapshots.sql`

`db/2026-02-09_reassign_legacy_data_to_user.sql` is a one-off repair script for older unowned data. Do not run it during demo prep unless you are intentionally repairing legacy rows for a known account.

## Friday Smoke Test

Run these checks in production after the accounts are created and `demo-populated` is filled.

Technical gates:

```bash
npm.cmd run lint
npm.cmd run build
```

Account flow checks:

- `demo-new-user`: login -> onboarding -> add book screen.
- `tester-1`: login -> onboarding starts cleanly.
- `tester-2`: login -> onboarding starts cleanly.
- `demo-populated`: login -> Home -> Library -> Book Hub -> start note -> save/update note -> reflection -> assistant Q&A -> note detail -> character profile.

Screen checks:

- Empty, loading, and error states are understandable on affected screens.
- Bottom-nav `Stats` and `You` look intentionally disabled.
- Assistant answers show source chapters and do not go beyond captured chapter scope.
- Book search works through Google Books or the Open Library fallback.
- Cover upload works, or failure copy is clear and does not block adding the book.

## Cleanup Rules

- Keep generated folders out of Git: `.next/`, `.next-dev/`, `tmp/`, `output/`.
- Keep generated local logs out of Git: `.codex-dev*.log`.
- Keep script output out of Git: `qa-seed-output.txt`.
- Do not refactor core journaling or assistant flows this close to the demo unless a verified blocker appears.
