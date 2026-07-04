import { gsap } from "gsap";
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
  initStatCounters,
  renderLinkedInFeatured,
  renderTestimonials,
  renderLatestBlog,
  setText,
  isReducedMotion,
} from "../main.js";
import { getHomeData, getLatestBlogPosts } from "../data.js";

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

gsap.registerPlugin(ScrollTrigger);

const CARD_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]";

function renderStats(stats) {
  const container = document.querySelector("[data-stats-container]");
  if (!container) return;

  container.innerHTML = stats
    .map(
      (stat) => `
        <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-[var(--radius-card)] border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-8 text-center">
          <p class="font-heading text-4xl font-bold bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)] bg-clip-text text-transparent" data-stat-value data-stat-target="${stat.value}" data-stat-suffix="${stat.suffix || ""}">0${stat.suffix || ""}</p>
          <p class="mt-2 text-sm text-[var(--color-text-muted)]">${stat.label}</p>
        </div>
      `
    )
    .join("");

  initStatCounters();
}

function renderTechStack(techStack) {
  const container = document.querySelector("[data-tech-stack]");
  if (!container) return;

  container.innerHTML = techStack
    .map(
      (tech) => `
        <span data-reveal-item class="${REVEAL_ITEM_CLASSES} tag">
          ${tech.name}
        </span>
      `
    )
    .join("");
}

function renderFeaturedProjects(projects) {
  const container = document.querySelector("[data-featured-projects]");
  if (!container) return;

  container.innerHTML = projects
    .map(
      (project) => `
        <a href="projects.html#${project.id}" data-reveal-item class="${REVEAL_ITEM_CLASSES} [perspective:1200px] block h-full rounded-[var(--radius-card)] border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-accent-end)]/45 hover:shadow-[0_20px_60px_-20px_rgba(var(--color-accent-rgb),0.35)] ${CARD_FOCUS_RING}">
          <h3 class="font-heading text-lg font-bold">${project.title}</h3>
          <p class="mt-3 text-sm text-[var(--color-text-muted)]">${project.blurb}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            ${project.tech
              .map(
                (t) =>
                  `<span class="tag">${t}</span>`
              )
              .join("")}
          </div>
        </a>
      `
    )
    .join("");
}

async function boot3DScene(techStack) {
  const canvas = document.getElementById("home-scene-canvas");
  const fallback = document.getElementById("home-scene-fallback");
  if (!canvas) return;

  if (isReducedMotion() || !window.WebGLRenderingContext) {
    canvas.remove();
    fallback?.classList.remove("hidden");
    return;
  }

  try {
    const { initHomeScene } = await import("../three/home-scene.js");
    initHomeScene(canvas, techStack);
  } catch (err) {
    console.error("3D scene failed to load, falling back to static background:", err);
    canvas.remove();
    fallback?.classList.remove("hidden");
  }
}

async function init() {
  initTheme();
  initMobileNav();
  initPageTransitions();

  const [site, homeData, latestPosts] = await Promise.all([renderNavFooter(), getHomeData(), getLatestBlogPosts()]);

  setText(document.querySelector("[data-hero-eyebrow]"), homeData.hero.eyebrow);
  setText(document.querySelector("[data-hero-title]"), homeData.hero.title);
  setText(document.querySelector("[data-hero-subtitle]"), homeData.hero.subtitle);

  const ctaPrimary = document.querySelector("[data-hero-cta-primary]");
  if (ctaPrimary) {
    setText(ctaPrimary, homeData.hero.ctaPrimary.label);
    ctaPrimary.href = homeData.hero.ctaPrimary.href;
  }
  const ctaSecondary = document.querySelector("[data-hero-cta-secondary]");
  if (ctaSecondary) {
    setText(ctaSecondary, homeData.hero.ctaSecondary.label);
    ctaSecondary.href = homeData.hero.ctaSecondary.href;
  }

  renderStats(homeData.stats);
  renderTechStack(homeData.techStack);
  renderFeaturedProjects(homeData.featuredProjects);
  renderTestimonials(site?.testimonials);
  renderLinkedInFeatured(site?.linkedinFeatured);
  renderLatestBlog(latestPosts);

  revealOnScroll();
  initStaggerReveals();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();

  boot3DScene(homeData.techStack);
}

init();
