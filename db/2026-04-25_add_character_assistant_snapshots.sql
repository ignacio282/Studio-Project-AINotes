-- Stores assistant-derived character profile snapshots for character detail pages.

create table if not exists public.character_assistant_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid not null,
  character_slug text not null,
  question text,
  answer text not null default '',
  structured jsonb not null default '{}'::jsonb,
  sources integer[] not null default '{}'::integer[],
  max_chapter integer,
  created_at timestamptz not null default now()
);

create index if not exists character_assistant_snapshots_latest_idx
  on public.character_assistant_snapshots (user_id, book_id, character_slug, created_at desc);

create index if not exists character_assistant_snapshots_book_character_idx
  on public.character_assistant_snapshots (book_id, character_slug);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.character_assistant_snapshots'::regclass
      and conname = 'character_assistant_snapshots_book_id_fkey'
  ) then
    alter table public.character_assistant_snapshots
      add constraint character_assistant_snapshots_book_id_fkey
      foreign key (book_id) references public.books(id) on delete cascade;
  end if;
end $$;

