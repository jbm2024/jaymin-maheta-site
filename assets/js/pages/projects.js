import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
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
  initAccordions,
  renderLinkedInFeatured,
  renderTestimonials,
  renderLatestBlog,
  isReducedMotion,
} from "../main.js";
import { getProjectsData, getLatestBlogPosts } from "../data.js";

gsap.registerPlugin(ScrollTrigger, Flip);

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

const FILTER_BTN_BASE =
  "rounded-[var(--radius-sm)] border px-4 py-2 font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]";
const FILTER_BTN_ACTIVE = "border-transparent bg-[var(--color-accent-end)] text-white";
const FILTER_BTN_INACTIVE = "border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] hover:border-[var(--color-accent-end)]/45";

function renderProjects(projects) {
  const container = document.querySelector("[data-projects-list]");
  if (!container) return;

  container.innerHTML = projects
    .map(
      (project) => `
        <article id="${project.id}" data-project data-tech="${project.tech.join(",")}" data-reveal class="opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0 scroll-mt-28 [perspective:1200px]">
          <div data-tilt-card class="rounded-[var(--radius-card)] border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-8 transition-shadow duration-300 will-change-transform">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="spec-label">${project.category}</p>
                <h2 class="mt-1 font-heading text-2xl font-bold">${project.title}</h2>
              </div>
              <div class="text-right font-mono text-xs text-[var(--color-text-muted)]">
                <p>${project.role}</p>
                <p class="mt-1">${project.duration}</p>
              </div>
            </div>
            <p class="mt-3 text-base text-[var(--color-text-muted)]">${project.summary}</p>

            <div data-reveal-stagger class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div data-reveal-item class="${REVEAL_ITEM_CLASSES}">
                <h3 class="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">Problem</h3>
                <p class="mt-2 text-sm">${project.problem}</p>
              </div>
              <div data-reveal-item class="${REVEAL_ITEM_CLASSES}">
                <h3 class="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">Role</h3>
                <p class="mt-2 text-sm">${project.role_detail}</p>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap gap-2">
              ${project.tech
                .map(
                  (t) =>
                    `<span class="tag">${t}</span>`
                )
                .join("")}
            </div>

            <div data-accordion data-open="false" class="mt-6 border-t border-[var(--color-border-glass)] pt-6">
              <button type="button" data-accordion-trigger aria-expanded="false" aria-controls="case-panel-${project.id}" class="spec-label focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]">
                <svg class="h-3.5 w-3.5 transition-transform duration-300 [[data-open=true]_&]:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                Full case study &amp; results
              </button>
              <div id="case-panel-${project.id}" data-accordion-panel>
                <div class="pt-6">
                  <h3 class="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">Approach</h3>
                  <ol class="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
                    ${project.approach
                      .map(
                        (step, i) =>
                          `<li class="flex gap-3"><span class="font-mono text-xs text-[var(--color-accent-text)]">0${i + 1}</span><span>${step}</span></li>`
                      )
                      .join("")}
                  </ol>

                  <h3 class="mt-6 font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">Impact</h3>
                  <p class="mt-2 text-sm">${project.impact}</p>

                  <div data-reveal-stagger class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    ${project.results
                      .map(
                        (r) => `
                          <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-[var(--radius-card)] border border-[var(--color-border-glass)] bg-[var(--color-surface)] p-5 text-center">
                            <p class="font-heading text-2xl font-bold bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)] bg-clip-text text-transparent" data-stat-value data-stat-target="${r.value}" data-stat-suffix="${r.suffix || ""}">0${r.suffix || ""}</p>
                            <p class="mt-2 text-xs text-[var(--color-text-muted)]">${r.label}</p>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderFilters(filters) {
  const bar = document.querySelector("[data-filters-bar]");
  if (!bar || !filters?.length) return;

  bar.innerHTML = filters
    .map(
      (filter, i) => `
        <button type="button" data-filter-btn data-filter="${filter}" aria-pressed="${i === 0}" class="${FILTER_BTN_BASE} ${i === 0 ? FILTER_BTN_ACTIVE : FILTER_BTN_INACTIVE}">
          ${filter}
        </button>
      `
    )
    .join("");

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter-btn]");
    if (!btn) return;
    applyFilter(btn, bar);
  });
}

function applyFilter(activeBtn, bar) {
  const filter = activeBtn.dataset.filter;
  const list = document.querySelector("[data-projects-list]");
  const noResults = document.querySelector("[data-no-results]");
  if (!list) return;

  bar.querySelectorAll("[data-filter-btn]").forEach((btn) => {
    const isActive = btn === activeBtn;
    btn.setAttribute("aria-pressed", String(isActive));
    btn.className = `${FILTER_BTN_BASE} ${isActive ? FILTER_BTN_ACTIVE : FILTER_BTN_INACTIVE}`;
  });

  const cards = Array.from(list.querySelectorAll("[data-project]"));
  const state = isReducedMotion() ? null : Flip.getState(cards);

  let visibleCount = 0;
  cards.forEach((card) => {
    const tech = card.dataset.tech.split(",");
    const matches = filter === "All" || tech.includes(filter);
    card.classList.toggle("hidden", !matches);
    if (matches) visibleCount += 1;
  });

  noResults?.classList.toggle("hidden", visibleCount !== 0);

  if (state) {
    Flip.from(state, { duration: 0.5, ease: "power2.inOut", absolute: true, nested: true });
  }
}

function initTiltCards() {
  if (isReducedMotion()) return;

  document.querySelectorAll("[data-tilt-card]").forEach((card) => {
    const quickRotateX = gsap.quickTo(card, "rotationX", { duration: 0.4, ease: "power3.out" });
    const quickRotateY = gsap.quickTo(card, "rotationY", { duration: 0.4, ease: "power3.out" });

    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      quickRotateY(px * 8);
      quickRotateX(-py * 8);
    });

    card.addEventListener("pointerleave", () => {
      quickRotateX(0);
      quickRotateY(0);
    });
  });
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

  const [site, projectsData, latestPosts] = await Promise.all([renderNavFooter(), getProjectsData(), getLatestBlogPosts()]);

  renderProjects(projectsData.projects);
  renderFilters(projectsData.filters);
  renderTestimonials(site?.testimonials);
  renderLinkedInFeatured(site?.linkedinFeatured);
  renderLatestBlog(latestPosts);

  revealOnScroll();
  initStaggerReveals();
  initAccordions();
  initStatCounters();
  initTiltCards();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
  bootAmbientScene();

  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) target.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth" });
  }
}

init();
