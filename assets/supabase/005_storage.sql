-- ============================================================================
-- Storage — a single public "media" bucket for admin-uploaded images
-- (gallery photos, blog covers, project screenshots), organized by path
-- prefix (media/gallery/…, media/blog/…, media/projects/…) rather than one
-- bucket per content type — simpler policies, same effective isolation since
-- the admin panel controls the upload path.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects for select
  to anon, authenticated using (bucket_id = 'media');

drop policy if exists "media_admin_write" on storage.objects;
create policy "media_admin_write" on storage.objects for insert
  to authenticated with check (bucket_id = 'media' and is_admin());

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update" on storage.objects for update
  to authenticated using (bucket_id = 'media' and is_admin());

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects for delete
  to authenticated using (bucket_id = 'media' and is_admin());
