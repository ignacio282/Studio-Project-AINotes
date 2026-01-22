-- Adds per-chapter memory snapshots for the book assistant
-- Run this in Supabase SQL Editor (or supabase CLI) against your project

create table if not exists public.book_chapter_memory (
  book_id uuid not null,
  chapter_number integer not null,
  summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (book_id, chapter_number)
);

create index if not exists book_chapter_memory_book_id_idx
  on public.book_chapter_memory (book_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.book_chapter_memory'::regclass
      and conname = 'book_chapter_memory_book_id_fkey'
  ) then
    alter table public.book_chapter_memory
      add constraint book_chapter_memory_book_id_fkey
      foreign key (book_id) references public.books(id) on delete cascade;
  end if;
end $$;
