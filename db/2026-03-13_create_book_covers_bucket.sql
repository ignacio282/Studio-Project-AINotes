-- Creates the public storage bucket used by the add-book flow for cover uploads.
-- Safe to run multiple times.

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'book-covers'
  ) then
    insert into storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    values (
      'book-covers',
      'book-covers',
      true,
      2097152,
      array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      ]
    );
  else
    update storage.buckets
    set
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      ]
    where id = 'book-covers';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload book covers'
  ) then
    execute $policy$
      create policy "Authenticated users can upload book covers"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'book-covers')
    $policy$;
  end if;
end $$;
