-- ============================================================================
-- page_intros — small gap fix: blog.json/gallery.json/site.json each carry a
-- short eyebrow/heading/subtitle for their listing page (or, for
-- testimonials, for the shared section rendered on every page) that the
-- first migration pass missed because it lived one level up from the
-- content those files otherwise map to 1:1.
-- ============================================================================
create table if not exists page_intros (
  page text primary key check (page in ('gallery', 'blog', 'testimonials')),
  eyebrow text not null default '',
  heading text not null default '',
  subtitle text not null default ''
);

alter table page_intros enable row level security;
grant select on page_intros to anon, authenticated;
grant insert, update, delete on page_intros to authenticated;
create policy "public_read" on page_intros for select to anon, authenticated using (true);
create policy "admin_write" on page_intros for all to authenticated using (is_admin()) with check (is_admin());

insert into page_intros (page, eyebrow, heading, subtitle) values
  ('gallery', '', 'Gallery', 'Beyond the codebase — seminars, workshops, and sessions where I get to teach, mentor, and give back to the developer community. Click any photo to view it larger.'),
  ('blog', 'Writing', 'Blog', 'Notes on design systems, accessibility, and the space where design and code have to agree with each other.'),
  ('testimonials', 'Testimonials', 'What people say', 'Feedback from product managers, designers, and engineers I''ve shipped with directly.')
on conflict (page) do update set eyebrow = excluded.eyebrow, heading = excluded.heading, subtitle = excluded.subtitle;
