-- ============================================================================
-- Row Level Security
--
-- Pattern used everywhere below:
--   SELECT:  using (<published-condition> or is_admin())   -- anon sees only
--            published rows; the admin (via admin_users) sees everything,
--            including drafts/hidden rows, for editing.
--   WRITE:   using (is_admin()) / with check (is_admin())  -- only the admin
--            can insert/update/delete, enforced at the database, not just by
--            the admin panel choosing not to expose the buttons.
--
-- Base GRANTs are still required even with RLS enabled — RLS restricts which
-- *rows* a role can see once it's allowed to query the table at all.
-- ============================================================================

-- admin_users: no public access at all, not even read (it's just the
-- allowlist). Only an existing admin can see/manage the allowlist.
alter table admin_users enable row level security;
grant select on admin_users to authenticated;
create policy "admin_only_read" on admin_users for select to authenticated using (is_admin());
create policy "admin_only_write" on admin_users for all to authenticated using (is_admin()) with check (is_admin());

-- Fully public, no visibility flag: site_settings, nav_links, socials,
-- linkedin_featured, home_content, stats, technologies, about_bio,
-- philosophy_items, skills, experience, awards, projects,
-- project_technologies, tags, blog_post_tags, contact_info.
do $$
declare
  t text;
  public_tables text[] := array[
    'site_settings', 'nav_links', 'socials', 'linkedin_featured', 'home_content',
    'stats', 'technologies', 'about_bio', 'philosophy_items', 'skills',
    'experience', 'awards', 'projects', 'project_technologies', 'tags',
    'blog_post_tags', 'contact_info'
  ];
begin
  foreach t in array public_tables loop
    execute format('alter table %I enable row level security;', t);
    execute format('grant select on %I to anon, authenticated;', t);
    execute format('grant insert, update, delete on %I to authenticated;', t);
    execute format(
      'create policy "public_read" on %I for select to anon, authenticated using (true);', t
    );
    execute format(
      'create policy "admin_write" on %I for all to authenticated using (is_admin()) with check (is_admin());', t
    );
  end loop;
end $$;

-- Gated by a visibility flag: anon only sees published/active rows; the
-- admin sees (and can write) everything.
alter table testimonials enable row level security;
grant select on testimonials to anon, authenticated;
grant insert, update, delete on testimonials to authenticated;
create policy "public_read_visible" on testimonials for select to anon, authenticated using (visible or is_admin());
create policy "admin_write" on testimonials for all to authenticated using (is_admin()) with check (is_admin());

alter table linkedin_posts enable row level security;
grant select on linkedin_posts to anon, authenticated;
grant insert, update, delete on linkedin_posts to authenticated;
create policy "public_read_active" on linkedin_posts for select to anon, authenticated using (active or is_admin());
create policy "admin_write" on linkedin_posts for all to authenticated using (is_admin()) with check (is_admin());

alter table blog_posts enable row level security;
grant select on blog_posts to anon, authenticated;
grant insert, update, delete on blog_posts to authenticated;
create policy "public_read_visible" on blog_posts for select to anon, authenticated using (visible or is_admin());
create policy "admin_write" on blog_posts for all to authenticated using (is_admin()) with check (is_admin());

alter table gallery_images enable row level security;
grant select on gallery_images to anon, authenticated;
grant insert, update, delete on gallery_images to authenticated;
create policy "public_read_active" on gallery_images for select to anon, authenticated using (active or is_admin());
create policy "admin_write" on gallery_images for all to authenticated using (is_admin()) with check (is_admin());

-- Views: grant select; security_invoker (set at CREATE VIEW time in the
-- previous migration) makes them re-check the base tables' RLS as the
-- calling role, so anon still only sees published rows through these too.
grant select on project_cards to anon, authenticated;
grant select on blog_post_cards to anon, authenticated;
