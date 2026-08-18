-- Ejaza backend — Phase 3: property image storage
-- Bucket layout: property-images/<owner_id>/<property_id>/<file>
-- Public read (listings show images); writes are scoped to the owner's own
-- top-level folder (the first path segment must equal their uid).

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "property-images: public read"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "property-images: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_owner_or_admin()
  );

create policy "property-images: owner update"
  on storage.objects for update
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "property-images: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'property-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
