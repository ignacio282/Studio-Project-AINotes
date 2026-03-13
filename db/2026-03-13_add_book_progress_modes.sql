alter table public.books
  add column if not exists tracking_mode text;

alter table public.books
  add column if not exists total_pages integer check (total_pages > 0);

update public.books
set tracking_mode = 'chapter'
where tracking_mode is null;

alter table public.books
  alter column tracking_mode set default 'chapter';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.books'::regclass
      and conname = 'books_tracking_mode_check'
  ) then
    alter table public.books
      add constraint books_tracking_mode_check
      check (tracking_mode in ('chapter', 'page', 'percent'));
  end if;
end
$$;

alter table public.books
  alter column tracking_mode set not null;
