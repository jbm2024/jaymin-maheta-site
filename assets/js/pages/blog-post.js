import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  initTheme,
  initMobileNav,
  renderNavFooter,
  revealOnScroll,
  initStaggerReveals,
  initMagneticButtons,
  initScrollProgress,
  initPageTransitions,
  renderLinkedInFeatured,
  renderTestimonials,
  fetchJSON,
  setText,
} from "../main.js";

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";
const CARD_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function renderBlock(block) {
  switch (block.type) {
    case "heading":
      return `<h2>${block.text}</h2>`;
    case "quote":
      return `<blockquote class="border-l-4 border-[var(--color-accent-end)] pl-5 text-lg italic text-[var(--color-text)]">${block.text}</blockquote>`;
    case "list":
      return `<ul class="list-disc space-y-2 pl-5">${block.items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    case "paragraph":
    default:
      return `<p>${block.text}</p>`;
  }
}

function renderPost(post) {
  document.title = `${post.title} — Jaymin Maheta`;
  document.querySelector("[data-meta-description]")?.setAttribute("content", post.excerpt);

  const canonicalUrl = `https://www.jayminmaheta.com/blog-post.html?slug=${encodeURIComponent(post.slug)}`;
  document.querySelector("[data-meta-canonical]")?.setAttribute("href", canonicalUrl);
  document.querySelector("[data-meta-og-title]")?.setAttribute("content", post.title);
  document.querySelector("[data-meta-og-description]")?.setAttribute("content", post.excerpt);
  document.querySelector("[data-meta-og-url]")?.setAttribute("content", canonicalUrl);
  document.querySelector("[data-meta-og-image]")?.setAttribute("content", `https://www.jayminmaheta.com/${post.coverImage}`);
  document.querySelector("[data-meta-twitter-title]")?.setAttribute("content", post.title);
  document.querySelector("[data-meta-twitter-description]")?.setAttribute("content", post.excerpt);
  document.querySelector("[data-meta-twitter-image]")?.setAttribute("content", `https://www.jayminmaheta.com/${post.coverImage}`);

  const tagsContainer = document.querySelector("[data-post-tags]");
  if (tagsContainer) {
    tagsContainer.innerHTML = post.tags
      .map((t) => `<span class="rounded-full bg-[var(--color-surface-glass)] px-3 py-1 font-mono text-xs">${t}</span>`)
      .join("");
  }

  setText(document.querySelector("[data-post-title]"), post.title);
  setText(document.querySelector("[data-post-author-initials]"), post.author.initials);
  setText(document.querySelector("[data-post-author-name]"), post.author.name);
  setText(document.querySelector("[data-post-date]"), formatDate(post.date));
  setText(document.querySelector("[data-post-read-time]"), post.readTime);

  const cover = document.querySelector("[data-post-cover]");
  if (cover) {
    cover.src = post.coverImage;
    cover.alt = post.title;
  }

  const body = document.querySelector("[data-post-body]");
  if (body) body.innerHTML = post.content.map(renderBlock).join("");

  const currentUrl = window.location.href;

  const shareLinkedIn = document.querySelector("[data-post-share-linkedin]");
  if (shareLinkedIn) shareLinkedIn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;

  const shareTwitter = document.querySelector("[data-post-share-twitter]");
  if (shareTwitter) shareTwitter.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(post.title)}`;

  const copyBtn = document.querySelector("[data-post-copy-link]");
  const copyLabel = document.querySelector("[data-post-copy-link-label]");
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      if (copyLabel) {
        copyLabel.textContent = "Copied!";
        setTimeout(() => {
          copyLabel.textContent = "Copy link";
        }, 2000);
      }
    } catch (err) {
      console.error("Copy link failed:", err);
    }
  });
}

function renderMorePosts(posts, currentSlug) {
  const section = document.querySelector("[data-more-posts-section]");
  const grid = document.querySelector("[data-more-posts-grid]");
  if (!section || !grid) return;

  const others = posts.filter((p) => p.visible && p.slug !== currentSlug);
  if (!others.length) {
    section.classList.add("hidden");
    return;
  }

  grid.innerHTML = others
    .map(
      (post) => `
        <a
          href="blog-post.html?slug=${encodeURIComponent(post.slug)}"
          data-reveal-item
          class="${REVEAL_ITEM_CLASSES} group flex gap-5 overflow-hidden rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent-end)]/45 ${CARD_FOCUS_RING}"
        >
          <figure class="aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-xl">
            <img src="${post.coverImage}" alt="${post.title}" loading="lazy" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </figure>
          <div class="flex flex-col justify-center">
            <h3 class="font-heading text-sm font-bold leading-snug">${post.title}</h3>
            <p class="mt-2 font-mono text-xs text-[var(--color-text-muted)]">${formatDate(post.date)} · ${post.readTime}</p>
          </div>
        </a>
      `
    )
    .join("");
}

function showNotFound() {
  document.querySelector("[data-post-article]")?.classList.add("hidden");
  document.querySelector("[data-more-posts-section]")?.classList.add("hidden");
  document.querySelector("[data-post-not-found]")?.classList.remove("hidden");
}

async function init() {
  initTheme();
  initMobileNav();
  initPageTransitions();

  const slug = new URLSearchParams(window.location.search).get("slug");
  const [site, blogData] = await Promise.all([renderNavFooter(), fetchJSON("assets/data/blog.json")]);

  const post = blogData.posts.find((p) => p.slug === slug && p.visible);

  if (!post) {
    showNotFound();
  } else {
    renderPost(post);
    renderMorePosts(blogData.posts, post.slug);
  }

  renderTestimonials(site?.testimonials);
  renderLinkedInFeatured(site?.linkedinFeatured);

  revealOnScroll();
  initStaggerReveals();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
}

init();
