-- Photo storage. Objects are written only by allowlisted owners, under items/<item_id>/.
-- The bucket is public-read so photo URLs work without signing. File names are random UUIDs,
-- so photos of draft items are not discoverable, but anyone holding an exact URL can view it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "item photos: owners insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and public.is_owner() and (storage.foldername(name))[1] = 'items');
create policy "item photos: owners update" on storage.objects for update to authenticated
  using (bucket_id = 'item-photos' and public.is_owner())
  with check (bucket_id = 'item-photos' and public.is_owner());
create policy "item photos: owners delete" on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and public.is_owner());
-- Owners may list objects (needed for upsert/remove); the public cannot list the bucket.
create policy "item photos: owners read" on storage.objects for select to authenticated
  using (bucket_id = 'item-photos' and public.is_owner());
