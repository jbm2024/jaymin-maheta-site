import { supabase } from "./supabase-client.js";

/**
 * Adapter layer: every function here queries Supabase and maps the rows
 * back into the exact object shape the existing render*() functions in
 * main.js / pages/*.js already expect — so the page modules only ever
 * change *where* data comes from, never how it's rendered.
 */

function unwrap(label, { data, error }) {
  if (error) {
    console.error(`Supabase query failed (${label}):`, error);
    throw error;
  }
  return data;
}

/** site.json equivalent — nav/footer/linkedinFeatured/testimonials, fetched once per page via renderNavFooter(). */
export async function getSiteData() {
  const [settings, nav, socials, linkedinFeatured, linkedinPosts, testimonialsIntro, testimonials] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", true).single(),
    supabase.from("nav_links").select("*").order("sort_order"),
    supabase.from("socials").select("*").order("sort_order"),
    supabase.from("linkedin_featured").select("*").eq("id", true).single(),
    supabase.from("linkedin_posts").select("*").order("sort_order"),
    supabase.from("page_intros").select("*").eq("page", "testimonials").single(),
    supabase.from("testimonials").select("*").order("sort_order"),
  ]);

  const s = unwrap("site_settings", settings);
  const navRows = unwrap("nav_links", nav);
  const socialRows = unwrap("socials", socials);
  const lf = unwrap("linkedin_featured", linkedinFeatured);
  const lfPosts = unwrap("linkedin_posts", linkedinPosts);
  const tIntro = unwrap("page_intros(testimonials)", testimonialsIntro);
  const tItems = unwrap("testimonials", testimonials);

  return {
    logoInitials: s.logo_initials,
    nav: navRows.map((n) => ({ label: n.label, href: n.href })),
    footer: {
      text: s.footer_text,
      socials: socialRows.filter((sc) => sc.show_in_footer).map((sc) => ({ platform: sc.platform, label: sc.label, url: sc.url })),
    },
    linkedinFeatured: {
      eyebrow: lf.eyebrow,
      heading: lf.heading,
      subtitle: lf.subtitle,
      profileUrl: lf.profile_url,
      followLabel: lf.follow_label,
      posts: lfPosts.map((p) => ({ urn: p.urn, active: p.active })),
    },
    testimonials: {
      intro: { eyebrow: tIntro.eyebrow, heading: tIntro.heading, subtitle: tIntro.subtitle },
      items: tItems.map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        company: t.company,
        initials: t.initials,
        quote: t.quote,
        rating: t.rating,
        visible: t.visible,
      })),
    },
  };
}

/** blog.json's posts array, used by renderLatestBlog() on every non-blog page. */
export async function getLatestBlogPosts() {
  const res = await supabase
    .from("blog_post_cards")
    .select("*")
    .eq("visible", true)
    .order("published_date", { ascending: false })
    .limit(3);
  return unwrap("blog_post_cards(latest)", res).map(mapBlogPostRow);
}

function mapBlogPostRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    author: { name: row.author_name, role: row.author_role, initials: row.author_initials },
    date: row.published_date,
    readTime: row.read_time,
    tags: row.tags || [],
    visible: row.visible,
    content: row.content,
  };
}

/** home.json equivalent. */
export async function getHomeData() {
  const [hero, stats, tech, featured] = await Promise.all([
    supabase.from("home_content").select("*").eq("id", true).single(),
    supabase.from("stats").select("*").eq("page", "home").order("sort_order"),
    supabase.from("technologies").select("*").eq("show_on_home", true).order("home_sort_order"),
    supabase.from("project_cards").select("*").eq("featured", true).order("sort_order"),
  ]);

  const h = unwrap("home_content", hero);
  const statRows = unwrap("stats(home)", stats);
  const techRows = unwrap("technologies(home)", tech);
  const featuredRows = unwrap("project_cards(featured)", featured);

  return {
    hero: {
      eyebrow: h.hero_eyebrow,
      title: h.hero_title,
      subtitle: h.hero_subtitle,
      ctaPrimary: { label: h.cta_primary_label, href: h.cta_primary_href },
      ctaSecondary: { label: h.cta_secondary_label, href: h.cta_secondary_href },
    },
    stats: statRows.map((s) => ({ value: s.value, suffix: s.suffix, label: s.label })),
    techStack: techRows.map((t) => ({ name: t.name })),
    featuredProjects: featuredRows.map((p) => ({ id: p.slug, title: p.title, blurb: p.home_blurb, tech: p.tech })),
  };
}

/** about.json equivalent. */
export async function getAboutData() {
  const [bio, stats, philosophy, skills, experience, awards] = await Promise.all([
    supabase.from("about_bio").select("*").eq("id", true).single(),
    supabase.from("stats").select("*").eq("page", "about").order("sort_order"),
    supabase.from("philosophy_items").select("*").order("sort_order"),
    supabase.from("skills").select("*").order("sort_order"),
    supabase.from("experience").select("*").order("sort_order"),
    supabase.from("awards").select("*").order("sort_order"),
  ]);

  const b = unwrap("about_bio", bio);
  return {
    bio: { eyebrow: b.eyebrow, heading: b.heading, paragraphs: b.paragraphs },
    stats: unwrap("stats(about)", stats).map((s) => ({ value: s.value, suffix: s.suffix, label: s.label })),
    philosophy: unwrap("philosophy_items", philosophy).map((p) => ({ title: p.title, description: p.description })),
    skills: unwrap("skills", skills).map((s) => ({ category: s.category, level: s.level, blurb: s.blurb, items: s.items })),
    experience: unwrap("experience", experience).map((e) => ({
      role: e.role,
      company: e.company,
      period: e.period,
      description: e.description,
      achievements: e.achievements,
      stack: e.stack,
    })),
    awards: unwrap("awards", awards).map((a) => ({ title: a.title, issuer: a.issuer, year: a.year, description: a.description })),
  };
}

/** projects.json equivalent. */
export async function getProjectsData() {
  const [projects, filterTech] = await Promise.all([
    supabase.from("project_cards").select("*").order("sort_order"),
    supabase.from("technologies").select("*").eq("show_in_filter", true).order("filter_sort_order"),
  ]);

  const projectRows = unwrap("project_cards", projects);
  const filterRows = unwrap("technologies(filter)", filterTech);

  return {
    filters: ["All", ...filterRows.map((t) => t.name)],
    projects: projectRows.map((p) => ({
      id: p.slug,
      title: p.title,
      category: p.category,
      duration: p.duration,
      role: p.role,
      summary: p.summary,
      problem: p.problem,
      approach: p.approach,
      role_detail: p.role_detail,
      impact: p.impact,
      results: p.results,
      tech: p.tech,
      links: p.links,
    })),
  };
}

/** blog.json equivalent (full listing + post detail). */
export async function getBlogData() {
  const [intro, posts] = await Promise.all([
    supabase.from("page_intros").select("*").eq("page", "blog").single(),
    supabase.from("blog_post_cards").select("*").order("sort_order"),
  ]);

  const introRow = unwrap("page_intros(blog)", intro);
  return {
    intro: { eyebrow: introRow.eyebrow, heading: introRow.heading, subtitle: introRow.subtitle },
    posts: unwrap("blog_post_cards(all)", posts).map(mapBlogPostRow),
  };
}

/** gallery.json equivalent. */
export async function getGalleryData() {
  const [intro, images] = await Promise.all([
    supabase.from("page_intros").select("*").eq("page", "gallery").single(),
    supabase.from("gallery_images").select("*").eq("active", true).order("sort_order"),
  ]);

  const introRow = unwrap("page_intros(gallery)", intro);
  return {
    intro: { heading: introRow.heading, subtitle: introRow.subtitle },
    images: unwrap("gallery_images", images).map((img) => ({
      id: img.id,
      src: img.src,
      width: img.width,
      height: img.height,
      alt: img.alt,
      caption: img.caption,
      active: img.active,
    })),
  };
}

/** contact.json equivalent. */
export async function getContactData() {
  const [info, socials] = await Promise.all([
    supabase.from("contact_info").select("*").eq("id", true).single(),
    supabase.from("socials").select("*").eq("show_in_contact", true).order("sort_order"),
  ]);

  const c = unwrap("contact_info", info);
  return {
    email: c.email,
    phone: c.phone,
    location: c.location,
    formEndpoint: c.form_endpoint,
    socials: unwrap("socials(contact)", socials).map((s) => ({ platform: s.platform, url: s.url })),
  };
}
