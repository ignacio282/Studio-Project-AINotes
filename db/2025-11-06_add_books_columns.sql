-- Adds optional, useful columns to the books table
-- Run this in Supabase SQL Editor (or supabase CLI) against your project

alter table public.books
  add column if not exists publisher text,
  add column if not exists total_chapters integer check (total_chapters > 0),
  add column if not exists cover_url text,
  add column if not exists status text not null default 'reading' check (status in ('reading','paused','completed')),
  add column if not exists updated_at timestamptz not null default now();

-- Backfill for existing rows (no-op if already set)
update public.books set updated_at = now() where updated_at is null;

-- Helpful indexes
create index if not exists books_created_at_idx on public.books (created_at desc);
create index if not exists books_status_idx on public.books (status);

-- Optional: ensure notes reference a valid book (safe if already exists)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.notes'::regclass
      and conname = 'notes_book_id_fkey'
  ) then
    alter table public.notes
      add constraint notes_book_id_fkey
      foreign key (book_id) references public.books(id) on delete cascade;
  end if;
end $$;

