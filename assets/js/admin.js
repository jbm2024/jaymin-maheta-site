import { supabase } from "./supabase-client.js";
import { renderListCrud, renderSingletonForm, renderFixedRowsForm } from "./admin/generic-crud.js";
import { renderProjectsEditor } from "./admin/projects-editor.js";
import { renderBlogEditor } from "./admin/blog-editor.js";
import { renderGalleryAlbumsEditor } from "./admin/gallery-albums-editor.js";

// --- Theme toggle (standalone — admin.html doesn't load gsap/main.js) ---
(function initTheme() {
  const root = document.documentElement;
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-bs-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-bs-theme", next);
      localStorage.setItem("jm-theme", next);
    });
  });
})();

// --- Section configs, grouped by tab ---
const TAB_SECTIONS = {
  site: [
    { kind: "singleton", table: "site_settings", title: "Site Settings", fields: [
      { key: "logo_initials", label: "Logo initials", type: "text" },
      { key: "footer_text", label: "Footer text", type: "text" },
    ]},
    { kind: "list", table: "nav_links", title: "Navigation Links", orderBy: "sort_order", fields: [
      { key: "label", label: "Label", type: "text" },
      { key: "href", label: "Href", type: "text" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "list", table: "socials", title: "Social Links", orderBy: "sort_order", fields: [
      { key: "platform", label: "Platform", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "url", label: "URL", type: "text" },
      { key: "show_in_footer", label: "Show in footer", type: "boolean" },
      { key: "show_in_contact", label: "Show on Contact page", type: "boolean" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "singleton", table: "linkedin_featured", title: "LinkedIn Featured Section", fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
      { key: "profile_url", label: "Profile URL", type: "text" },
      { key: "follow_label", label: "Follow button label", type: "text" },
    ]},
    { kind: "list", table: "linkedin_posts", title: "LinkedIn Posts", orderBy: "sort_order", fields: [
      { key: "urn", label: "Post URN (urn:li:activity:…)", type: "text" },
      { key: "active", label: "Active", type: "boolean" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
  ],
  home: [
    { kind: "singleton", table: "home_content", title: "Home Hero", fields: [
      { key: "hero_eyebrow", label: "Eyebrow", type: "text" },
      { key: "hero_title", label: "Title", type: "text" },
      { key: "hero_subtitle", label: "Subtitle", type: "textarea" },
      { key: "cta_primary_label", label: "Primary CTA label", type: "text" },
      { key: "cta_primary_href", label: "Primary CTA link", type: "text" },
      { key: "cta_secondary_label", label: "Secondary CTA label", type: "text" },
      { key: "cta_secondary_href", label: "Secondary CTA link", type: "text" },
    ]},
    { kind: "list", table: "stats", title: "Home Stats", orderBy: "sort_order", filter: { column: "page", value: "home" }, fields: [
      { key: "value", label: "Value", type: "number" },
      { key: "suffix", label: "Suffix (e.g. +)", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "list", table: "technologies", title: "Technologies", description: "Shared by the Home tech-stack orbit and the Projects filter bar.", orderBy: "name", fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "show_on_home", label: "Show on Home orbit", type: "boolean" },
      { key: "home_sort_order", label: "Home sort order", type: "number" },
      { key: "show_in_filter", label: "Show as Projects filter chip", type: "boolean" },
      { key: "filter_sort_order", label: "Filter sort order", type: "number" },
    ]},
  ],
  about: [
    { kind: "singleton", table: "about_bio", title: "Bio", fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "paragraphs", label: "Paragraphs (one per line)", type: "lines" },
    ]},
    { kind: "list", table: "stats", title: "About Stats", orderBy: "sort_order", filter: { column: "page", value: "about" }, fields: [
      { key: "value", label: "Value", type: "number" },
      { key: "suffix", label: "Suffix", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "list", table: "philosophy_items", title: "Philosophy (\"How I Work\")", orderBy: "sort_order", fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "list", table: "skills", title: "Skills", orderBy: "sort_order", fields: [
      { key: "category", label: "Category", type: "text" },
      { key: "level", label: "Level (0-100)", type: "number" },
      { key: "blurb", label: "Blurb", type: "textarea" },
      { key: "items", label: "Items (one per line)", type: "lines" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "list", table: "experience", title: "Experience Timeline", orderBy: "sort_order", fields: [
      { key: "role", label: "Role", type: "text" },
      { key: "company", label: "Company", type: "text" },
      { key: "period", label: "Period", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "achievements", label: "Achievements (one per line)", type: "lines" },
      { key: "stack", label: "Stack (one per line)", type: "lines" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "list", table: "awards", title: "Awards", orderBy: "sort_order", fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "issuer", label: "Issuer", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
  ],
  projects: [{ kind: "custom", title: "Projects", render: renderProjectsEditor }],
  blog: [
    { kind: "custom", title: "Blog Posts", render: renderBlogEditor },
    { kind: "list", table: "tags", title: "Tags", description: "The tag vocabulary posts can be assigned to above.", orderBy: "name", fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "fixed", table: "page_intros", title: "Blog Listing Page Copy", keyField: "page", keyValue: "blog", fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
    ]},
  ],
  gallery: [
    { kind: "custom", title: "Gallery Albums", render: renderGalleryAlbumsEditor },
    { kind: "list", table: "gallery_images", title: "Gallery Images", description: "Every photo, loose or albumed. Use the Album dropdown to move one, or manage albums (and drag-and-drop uploads) in the Gallery Albums tab.", orderBy: "sort_order", fields: [
      { key: "src", label: "Image", type: "image", uploadPath: "gallery", dimensionFields: { width: "width", height: "height" } },
      { key: "album_id", label: "Album", type: "relation", table: "gallery_albums", optionLabel: "title", emptyLabel: "No album (shows individually)" },
      { key: "alt", label: "Alt text", type: "text" },
      { key: "caption", label: "Caption", type: "text" },
      { key: "width", label: "Width (px, auto-detected on upload)", type: "number", default: 1600, readonly: true },
      { key: "height", label: "Height (px, auto-detected on upload)", type: "number", default: 1000, readonly: true },
      { key: "active", label: "Active", type: "boolean" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "fixed", table: "page_intros", title: "Gallery Page Copy", keyField: "page", keyValue: "gallery", fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
    ]},
  ],
  contact: [
    { kind: "singleton", table: "contact_info", title: "Contact Info", fields: [
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "form_endpoint", label: "Form endpoint (Formspree URL)", type: "text" },
    ]},
  ],
  testimonials: [
    { kind: "list", table: "testimonials", title: "Testimonials", orderBy: "sort_order", fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "company", label: "Company", type: "text" },
      { key: "initials", label: "Initials", type: "text" },
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "rating", label: "Rating (1-5)", type: "number", default: 5 },
      { key: "visible", label: "Visible", type: "boolean" },
      { key: "sort_order", label: "Sort order", type: "number" },
    ]},
    { kind: "fixed", table: "page_intros", title: "Testimonials Section Copy", keyField: "page", keyValue: "testimonials", fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "subtitle", label: "Subtitle", type: "textarea" },
    ]},
  ],
};

// Each admin tab (e.g. "site") can hold several sections (nav links, socials, …).
// Only one section — one form + one listing — is shown at a time; a sub-nav
// lets the user switch between the sections that belong to the current tab.
const activeSectionIndex = {};

async function renderSection(section, panelEl) {
  const sectionEl = document.createElement("div");
  panelEl.appendChild(sectionEl);

  if (section.kind === "list") await renderListCrud(sectionEl, section);
  else if (section.kind === "singleton") await renderSingletonForm(sectionEl, section);
  else if (section.kind === "fixed") await renderFixedRowsForm(sectionEl, section);
  else if (section.kind === "custom") await section.render(sectionEl);
}

async function renderTab(tabName, panelEl) {
  const sections = TAB_SECTIONS[tabName];
  const activeIdx = activeSectionIndex[tabName] ?? 0;
  panelEl.innerHTML = "";

  if (sections.length > 1) {
    const subnav = document.createElement("nav");
    subnav.className = "nav nav-pills flex-wrap gap-2 mb-4 pb-3 border-bottom";
    subnav.setAttribute("aria-label", `${tabName} pages`);
    sections.forEach((section, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `nav-link${i === activeIdx ? " active" : ""}`;
      if (i === activeIdx) btn.setAttribute("aria-current", "page");
      btn.textContent = section.title;
      btn.addEventListener("click", () => {
        activeSectionIndex[tabName] = i;
        renderTab(tabName, panelEl);
      });
      subnav.appendChild(btn);
    });
    panelEl.appendChild(subnav);
  }

  await renderSection(sections[activeIdx], panelEl);
}

function initTabs() {
  const tabs = document.querySelectorAll("[data-admin-tab]");
  const panel = document.querySelector("[data-admin-panel]");

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => {
        b.classList.toggle("active", b === btn);
        if (b === btn) b.setAttribute("aria-current", "page");
        else b.removeAttribute("aria-current");
      });
      renderTab(btn.dataset.adminTab, panel);
    });
  });

  renderTab("site", panel);
}

// --- Auth gate ---
const loginView = document.querySelector("[data-login-view]");
const dashboardView = document.querySelector("[data-dashboard-view]");
const unauthorizedView = document.querySelector("[data-unauthorized-view]");
const logoutBtn = document.querySelector("[data-logout-btn]");

function showView(view) {
  loginView.classList.toggle("d-none", view !== "login");
  dashboardView.classList.toggle("d-none", view !== "dashboard");
  unauthorizedView.classList.toggle("d-none", view !== "unauthorized");
  logoutBtn.classList.toggle("d-none", view === "login");
}

async function checkAdminAndShow() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    showView("login");
    return;
  }

  const { data: adminRow } = await supabase.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();

  if (!adminRow) {
    showView("unauthorized");
    return;
  }

  showView("dashboard");
  initTabs();
}

document.querySelector("[data-login-form]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = form.querySelector("[data-login-status]");
  status.textContent = "Signing in…";

  const { error } = await supabase.auth.signInWithPassword({
    email: form.email.value,
    password: form.password.value,
  });

  if (error) {
    status.textContent = error.message;
    return;
  }
  status.textContent = "";
  form.reset();
  checkAdminAndShow();
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showView("login");
});

document.querySelector("[data-unauthorized-logout]").addEventListener("click", async () => {
  await supabase.auth.signOut();
  showView("login");
});

checkAdminAndShow();
