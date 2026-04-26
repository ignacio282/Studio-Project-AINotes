create table if not exists public.book_entities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  type text not null check (type in ('character', 'place', 'faction', 'object', 'concept')),
  slug text not null,
  name text not null,
  aliases text[] not null default '{}',
  profile jsonb not null default '{}'::jsonb,
  first_chapter integer,
  last_chapter integer,
  mention_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, type, slug)
);

create index if not exists book_entities_user_book_type_idx
  on public.book_entities(user_id, book_id, type, name);

create index if not exists book_entities_user_book_slug_idx
  on public.book_entities(user_id, book_id, slug);

create table if not exists public.book_entity_mentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  entity_id uuid not null references public.book_entities(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  chapter_number integer not null,
  source_text text,
  extracted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (entity_id, note_id)
);

create index if not exists book_entity_mentions_user_book_entity_idx
  on public.book_entity_mentions(user_id, book_id, entity_id, chapter_number);

create index if not exists book_entity_mentions_note_idx
  on public.book_entity_mentions(note_id);

create table if not exists public.book_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  source_entity_id uuid references public.book_entities(id) on delete cascade,
  target_entity_id uuid references public.book_entities(id) on delete cascade,
  label text not null,
  description text,
  chapter_number integer,
  note_id uuid references public.notes(id) on delete cascade,
  evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, source_entity_id, target_entity_id, label, note_id)
);

create index if not exists book_relationships_user_book_source_idx
  on public.book_relationships(user_id, book_id, source_entity_id, chapter_number);

create index if not exists book_relationships_user_book_target_idx
  on public.book_relationships(user_id, book_id, target_entity_id, chapter_number);

create table if not exists public.book_timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid not null references public.books(id) on delete cascade,
  entity_id uuid references public.book_entities(id) on delete set null,
  note_id uuid references public.notes(id) on delete cascade,
  chapter_number integer not null,
  event_type text not null default 'note',
  event_text text not null,
  created_at timestamptz not null default now(),
  unique (book_id, entity_id, note_id, event_text)
);

create index if not exists book_timeline_events_user_book_entity_idx
  on public.book_timeline_events(user_id, book_id, entity_id, chapter_number);

create index if not exists book_timeline_events_note_idx
  on public.book_timeline_events(note_id);
