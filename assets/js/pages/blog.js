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
  isReducedMotion,
} from "../main.js";

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";
const CARD_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Only posts with visible:true render — same on/off convention as
 * testimonials and gallery images, so a post can be drafted in blog.json
 * ahead of time without appearing on the live site.
 */
function renderPosts(posts) {
  const container = document.querySelector("[data-blog-list]");
  const empty = document.querySelector("[data-blog-empty]");
  if (!container) return;

  const visible = posts.filter((post) => post.visible);

  if (!visible.length) {
    container.classList.add("hidden");
    empty?.classList.remove("hidden");
    return;
  }

  container.innerHTML = visible
    .map(
      (post) => `
        <a
          href="blog-post.html?slug=${encodeURIComponent(post.slug)}"
          data-reveal-item
          class="${REVEAL_ITEM_CLASSES} group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent-end)]/45 hover:shadow-[0_20px_60px_-20px_rgba(var(--color-accent-rgb),0.35)] ${CARD_FOCUS_RING}"
        >
          <figure class="aspect-[16/9] overflow-hidden">
            <img
              src="${post.coverImage}"
              alt="${post.title}"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </figure>
          <div class="flex flex-1 flex-col p-6">
            <div class="flex flex-wrap gap-2">
              ${post.tags.map((t) => `<span class="rounded-full bg-[var(--color-surface)] px-3 py-1 font-mono text-xs">${t}</span>`).join("")}
            </div>
            <h2 class="mt-4 font-heading text-lg font-bold">${post.title}</h2>
            <p class="mt-2 flex-1 text-sm text-[var(--color-text-muted)]">${post.excerpt}</p>
            <p class="mt-4 font-mono text-xs text-[var(--color-text-muted)]">${formatDate(post.date)} · ${post.readTime}</p>
          </div>
        </a>
      `
    )
    .join("");
}

async function bootAmbientScene() {
  const canvas = document.getElementById("ambient-canvas");
  const fallback = document.getElementById("ambient-fallback");
  if (!canvas) return;

  if (isReducedMotion() || !window.WebGLRenderingContext) {
    canvas.remove();
    fallback?.classList.remove("hidden");
    return;
  }

  try {
    const { initAmbientParticles } = await import("../three/ambient-particles.js");
    initAmbientParticles(canvas);
  } catch (err) {
    console.error("Ambient scene failed to load, falling back to static background:", err);
    canvas.remove();
    fallback?.classList.remove("hidden");
  }
}

async function init() {
  initTheme();
  initMobileNav();
  initPageTransitions();

  const [site, blogData] = await Promise.all([renderNavFooter(), fetchJSON("assets/data/blog.json")]);

  setText(document.querySelector("[data-blog-eyebrow]"), blogData.intro.eyebrow);
  setText(document.querySelector("[data-blog-heading]"), blogData.intro.heading);
  setText(document.querySelector("[data-blog-subtitle]"), blogData.intro.subtitle);
  renderPosts(blogData.posts);
  renderTestimonials(site?.testimonials);
  renderLinkedInFeatured(site?.linkedinFeatured);

  revealOnScroll();
  initStaggerReveals();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
  bootAmbientScene();
}

init();
