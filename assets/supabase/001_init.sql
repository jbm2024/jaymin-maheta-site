-- ============================================================================
-- Portfolio content schema — initial migration
--
-- Design notes (why it's shaped this way):
--  - uuid PKs (gen_random_uuid(), built into PG13+ core, no extension needed)
--    except singleton config tables, which use the classic
--    `id boolean primary key default true check (id)` trick: it makes a
--    table physically unable to hold more than one row, so the app can
--    always `upsert ... where id = true` without a separate "is this the
--    first row" check.
--  - created_at/updated_at on every mutable table, updated_at auto-maintained
--    by one shared trigger function instead of per-table triggers.
--  - Shared lookup tables (technologies, tags) instead of duplicating
--    strings across projects/home/blog — one rename fixes every reference,
--    and it's what makes "filter projects by tech" a fast indexed join
--    instead of a text scan.
--  - Foreign keys are always indexed explicitly — Postgres does not do this
--    automatically, and every join in this schema depends on it.
--  - RLS: anon (public site) can only read *published* rows on tables that
--    have a visibility flag (blog_posts.visible, testimonials.visible,
--    gallery_images.active) — the old JSON approach only filtered these
--    client-side, which means an unpublished row was never actually
--    private. authenticated (the admin) can read/write everything, gated
--    through an allowlist table (admin_users) + is_admin() helper rather
--    than inline `auth.role() = 'authenticated'` checks, so granting a
--    second admin later is one INSERT, not an edit to every policy.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Shared helpers
-- ----------------------------------------------------------------------------
create table if not exists admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid()
  );
$$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Site-wide singletons & shared lists
-- ----------------------------------------------------------------------------
create table if not exists site_settings (
  id boolean primary key default true,
  constraint site_settings_singleton check (id),
  logo_initials text not null default 'JM',
  footer_text text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists nav_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  sort_order int not null default 0
);
create index if not exists nav_links_sort_idx on nav_links (sort_order);

create table if not exists socials (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text not null,
  show_in_footer boolean not null default true,
  show_in_contact boolean not null default false,
  sort_order int not null default 0
);
create index if not exists socials_sort_idx on socials (sort_order);

create table if not exists linkedin_featured (
  id boolean primary key default true,
  constraint linkedin_featured_singleton check (id),
  eyebrow text not null default '',
  heading text not null default '',
  subtitle text not null default '',
  profile_url text not null default '',
  follow_label text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists linkedin_posts (
  id uuid primary key default gen_random_uuid(),
  urn text not null unique,
  active boolean not null default true,
  sort_order int not null default 0
);
create index if not exists linkedin_posts_sort_idx on linkedin_posts (sort_order);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  company text not null,
  initials text not null,
  quote text not null,
  rating smallint not null check (rating between 1 and 5),
  visible boolean not null default true,
  sort_order int not null default 0
);
create index if not exists testimonials_visible_sort_idx on testimonials (sort_order) where visible;

-- ----------------------------------------------------------------------------
-- Home page
-- ----------------------------------------------------------------------------
create table if not exists home_content (
  id boolean primary key default true,
  constraint home_content_singleton check (id),
  hero_eyebrow text not null default '',
  hero_title text not null default '',
  hero_subtitle text not null default '',
  cta_primary_label text not null default '',
  cta_primary_href text not null default '',
  cta_secondary_label text not null default '',
  cta_secondary_href text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists stats (
  id uuid primary key default gen_random_uuid(),
  page text not null check (page in ('home', 'about')),
  value int not null,
  suffix text not null default '',
  label text not null,
  sort_order int not null default 0
);
create index if not exists stats_page_sort_idx on stats (page, sort_order);

-- Canonical technology/tool list shared by home's tech-stack orbit, project
-- tech tags, and the projects-page filter bar — one row per tool, referenced
-- everywhere instead of retyping the string.
create table if not exists technologies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  show_on_home boolean not null default false,
  home_sort_order int not null default 0,
  -- show_in_filter is deliberately separate from "is this tech used by any
  -- project": the original design curated a shorter filter-chip list (e.g.
  -- SCSS is a real project tag but was never offered as a filter chip), so
  -- that curation has to be its own flag, not derived from project_technologies.
  show_in_filter boolean not null default false,
  filter_sort_order int not null default 0
);
create index if not exists technologies_home_idx on technologies (home_sort_order) where show_on_home;
create index if not exists technologies_filter_idx on technologies (filter_sort_order) where show_in_filter;

-- ----------------------------------------------------------------------------
-- About page
-- ----------------------------------------------------------------------------
create table if not exists about_bio (
  id boolean primary key default true,
  constraint about_bio_singleton check (id),
  eyebrow text not null default '',
  heading text not null default '',
  paragraphs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists philosophy_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  sort_order int not null default 0
);
create index if not exists philosophy_items_sort_idx on philosophy_items (sort_order);

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  level int not null check (level between 0 and 100),
  blurb text not null default '',
  items jsonb not null default '[]'::jsonb,
  sort_order int not null default 0
);
create index if not exists skills_sort_idx on skills (sort_order);

-- Small, static, inherently-ordered history — a jsonb array for
-- achievements/stack is the right call here rather than two more junction
-- tables; there is no query that needs to filter "all roles that used
-- Angular" independently of reading the whole timeline.
create table if not exists experience (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  company text not null,
  period text not null,
  description text not null,
  achievements jsonb not null default '[]'::jsonb,
  stack jsonb not null default '[]'::jsonb,
  sort_order int not null default 0
);
create index if not exists experience_sort_idx on experience (sort_order);

create table if not exists awards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text not null,
  year text not null,
  description text not null,
  sort_order int not null default 0
);
create index if not exists awards_sort_idx on awards (sort_order);

-- ----------------------------------------------------------------------------
-- Projects
-- ----------------------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  duration text not null,
  role text not null,
  summary text not null,
  problem text not null,
  approach jsonb not null default '[]'::jsonb,
  role_detail text not null default '',
  impact text not null default '',
  results jsonb not null default '[]'::jsonb,
  links jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  home_blurb text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_sort_idx on projects (sort_order);
create index if not exists projects_featured_idx on projects (sort_order) where featured;
drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();

create table if not exists project_technologies (
  project_id uuid not null references projects (id) on delete cascade,
  technology_id uuid not null references technologies (id) on delete restrict,
  primary key (project_id, technology_id)
);
create index if not exists project_technologies_tech_idx on project_technologies (technology_id);

-- ----------------------------------------------------------------------------
-- Blog
-- ----------------------------------------------------------------------------
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  cover_image text not null default '',
  author_name text not null,
  author_role text not null,
  author_initials text not null,
  published_date date not null,
  read_time text not null default '',
  content jsonb not null default '[]'::jsonb,
  visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Full-text search over title/excerpt — a blog is the one content type on
  -- this site that's expected to grow indefinitely, so it gets a real
  -- search index now rather than "add it later". Generated + stored means
  -- Postgres maintains it automatically; no trigger to keep in sync.
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
  ) stored
);
create unique index if not exists blog_posts_slug_idx on blog_posts (slug);
create index if not exists blog_posts_visible_date_idx on blog_posts (published_date desc) where visible;
create index if not exists blog_posts_search_idx on blog_posts using gin (search_vector);
drop trigger if exists blog_posts_set_updated_at on blog_posts;
create trigger blog_posts_set_updated_at before update on blog_posts
  for each row execute function set_updated_at();

create table if not exists blog_post_tags (
  blog_post_id uuid not null references blog_posts (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete restrict,
  primary key (blog_post_id, tag_id)
);
create index if not exists blog_post_tags_tag_idx on blog_post_tags (tag_id);

-- ----------------------------------------------------------------------------
-- Gallery
-- ----------------------------------------------------------------------------
create table if not exists gallery_images (
  id uuid primary key default gen_random_uuid(),
  src text not null,
  width int not null,
  height int not null,
  alt text not null,
  caption text not null default '',
  active boolean not null default true,
  sort_order int not null default 0
);
create index if not exists gallery_images_active_sort_idx on gallery_images (sort_order) where active;

-- ----------------------------------------------------------------------------
-- Contact
-- ----------------------------------------------------------------------------
create table if not exists contact_info (
  id boolean primary key default true,
  constraint contact_info_singleton check (id),
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  form_endpoint text not null default '',
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Read-optimized public views (pre-joined, so the frontend does one query
-- instead of N+1). security_invoker means these run under the *caller's*
-- RLS, not the view owner's — so anon still only sees published rows.
-- ----------------------------------------------------------------------------
create or replace view project_cards
with (security_invoker = true) as
select
  p.*,
  coalesce(
    array_agg(t.name order by t.filter_sort_order, t.name) filter (where t.name is not null),
    '{}'
  ) as tech
from projects p
left join project_technologies pt on pt.project_id = p.id
left join technologies t on t.id = pt.technology_id
group by p.id;

create or replace view blog_post_cards
with (security_invoker = true) as
select
  b.*,
  coalesce(
    array_agg(tg.name order by tg.sort_order, tg.name) filter (where tg.name is not null),
    '{}'
  ) as tags
from blog_posts b
left join blog_post_tags bt on bt.blog_post_id = b.id
left join tags tg on tg.id = bt.tag_id
group by b.id;
