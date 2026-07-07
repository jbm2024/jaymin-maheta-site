-- ============================================================================
-- Gallery albums — group gallery_images into Google-Photos-style albums.
--
-- An image with album_id = null is a "loose" photo (existing behavior,
-- rendered in the main "All Photos" grid); setting album_id groups it into
-- that album, which the public gallery page renders as its own tile —
-- clicking it filters the grid down to just that album's photos.
--
-- Applied directly to the live project via mcp__supabase__apply_migration
-- (migration name "gallery_albums"); this file mirrors that change for
-- anyone re-provisioning the schema from scratch, same as 001-006.
-- ============================================================================
create table if not exists gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_image text not null default '',
  active boolean not null default true,
  sort_order int not null default 0
);
create index if not exists gallery_albums_active_sort_idx on gallery_albums (sort_order) where active;

alter table gallery_images add column if not exists album_id uuid references gallery_albums (id) on delete set null;
create index if not exists gallery_images_album_idx on gallery_images (album_id);

alter table gallery_albums enable row level security;
grant select on gallery_albums to anon, authenticated;
grant insert, update, delete on gallery_albums to authenticated;
create policy "public_read_active" on gallery_albums for select to anon, authenticated using (active or is_admin());
create policy "admin_write" on gallery_albums for all to authenticated using (is_admin()) with check (is_admin());
