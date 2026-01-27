-- Adds prompted note metadata linked to notes
-- Run this in Supabase SQL Editor (or supabase CLI) against your project

create table if not exists public.note_prompts (
  note_id uuid primary key,
  book_id uuid not null,
  chapter_number integer not null,
  title text not null,
  context text,
  questions text[],
  topic text,
  created_at timestamptz not null default now()
);

create index if not exists note_prompts_book_id_idx
  on public.note_prompts (book_id);

create index if not exists note_prompts_chapter_idx
  on public.note_prompts (book_id, chapter_number);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.note_prompts'::regclass
      and conname = 'note_prompts_note_id_fkey'
  ) then
    alter table public.note_prompts
      add constraint note_prompts_note_id_fkey
      foreign key (note_id) references public.notes(id) on delete cascade;
  end if;
end $$;
