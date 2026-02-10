-- Reassign legacy data to a specific authenticated user.
-- Use this when pre-auth rows exist with user_id = null.
-- Safe to run multiple times.

do $$
declare
  target_email text := 'ignacio.vergara282@gmail.com';
  target_user_id uuid;
begin
  select id
    into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No auth user found for email: %', target_email;
  end if;

  -- Claim unowned books first; downstream rows are synced from parent ownership.
  update public.books
  set user_id = target_user_id
  where user_id is null;

  -- Keep note ownership aligned with the owning book.
  update public.notes n
  set user_id = b.user_id
  from public.books b
  where n.book_id = b.id
    and n.user_id is distinct from b.user_id;

  -- Keep character ownership aligned with the owning book.
  update public.characters c
  set user_id = b.user_id
  from public.books b
  where c.book_id = b.id
    and c.user_id is distinct from b.user_id;

  -- Keep chapter memory ownership aligned with the owning book.
  update public.book_chapter_memory m
  set user_id = b.user_id
  from public.books b
  where m.book_id = b.id
    and m.user_id is distinct from b.user_id;

  -- Keep prompted note ownership aligned with the owning note.
  update public.note_prompts p
  set user_id = n.user_id
  from public.notes n
  where p.note_id = n.id
    and p.user_id is distinct from n.user_id;
end $$;

