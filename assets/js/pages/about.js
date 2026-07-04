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
  initAccordions,
  renderLinkedInFeatured,
  renderTestimonials,
  renderLatestBlog,
  fetchJSON,
  setText,
  isReducedMotion,
} from "../main.js";

gsap.registerPlugin(ScrollTrigger);

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

function renderBio(bio) {
  setText(document.querySelector("[data-bio-eyebrow]"), bio.eyebrow);
  setText(document.querySelector("[data-bio-heading]"), bio.heading);
  const container = document.querySelector("[data-bio-paragraphs]");
  if (!container) return;
  container.innerHTML = bio.paragraphs.map((p) => `<p>${p}</p>`).join("");
}

function renderStats(stats) {
  const container = document.querySelector("[data-stats-grid]");
  if (!container) return;

  container.innerHTML = stats
    .map(
      (stat) => `
        <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-5 text-center backdrop-blur-md">
          <p class="font-heading text-3xl font-bold bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)] bg-clip-text text-transparent" data-stat-value data-stat-target="${stat.value}" data-stat-suffix="${stat.suffix || ""}">0${stat.suffix || ""}</p>
          <p class="mt-2 text-xs text-[var(--color-text-muted)]">${stat.label}</p>
        </div>
      `
    )
    .join("");

  initStatCounters();
}

function renderPhilosophy(philosophy) {
  const container = document.querySelector("[data-philosophy-grid]");
  if (!container) return;

  container.innerHTML = philosophy
    .map(
      (item) => `
        <div data-reveal-item data-tilt-card class="${REVEAL_ITEM_CLASSES} [perspective:1200px] rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md transition-shadow duration-300 will-change-transform hover:border-[var(--color-accent-end)]/45">
          <h3 class="font-heading text-base font-bold">${item.title}</h3>
          <p class="mt-2 text-sm text-[var(--color-text-muted)]">${item.description}</p>
        </div>
      `
    )
    .join("");
}

function renderSkills(skills) {
  const container = document.querySelector("[data-skills-grid]");
  if (!container) return;
  container.innerHTML = skills
    .map(
      (group) => `
        <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md">
          <div class="flex items-baseline justify-between gap-2">
            <h3 class="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">${group.category}</h3>
            <span class="font-mono text-xs text-[var(--color-text-muted)]">${group.level}%</span>
          </div>
          <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface)]">
            <div data-skill-bar data-skill-level="${group.level}" class="h-full w-0 rounded-full bg-gradient-to-r from-[var(--color-accent-start)] to-[var(--color-accent-end)]"></div>
          </div>
          <p class="mt-3 text-xs text-[var(--color-text-muted)]">${group.blurb}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            ${group.items
              .map(
                (item) =>
                  `<span class="rounded-full bg-[var(--color-surface)] px-3 py-1 font-mono text-xs">${item}</span>`
              )
              .join("")}
          </div>
        </div>
      `
    )
    .join("");
}

function animateSkillBars() {
  const bars = document.querySelectorAll("[data-skill-bar]");
  if (!bars.length) return;

  bars.forEach((bar) => {
    const level = Number(bar.dataset.skillLevel);
    if (isReducedMotion()) {
      bar.style.width = `${level}%`;
      return;
    }
    gsap.to(bar, {
      width: `${level}%`,
      duration: 1.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: bar,
        start: "top 90%",
        once: true,
      },
    });
  });
}

function renderExperience(experience) {
  const container = document.querySelector("[data-experience-timeline]");
  if (!container) return;
  container.innerHTML = experience
    .map(
      (entry, i) => `
        <div data-timeline-item data-accordion data-open="false" class="relative rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] backdrop-blur-md before:absolute before:-left-[1.65rem] before:top-8 before:h-3 before:w-3 before:rounded-full before:bg-gradient-to-r before:from-[var(--color-accent-start)] before:to-[var(--color-accent-end)]">
          <button type="button" data-accordion-trigger aria-expanded="false" aria-controls="exp-panel-${i}" class="flex w-full flex-col gap-2 p-6 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h3 class="font-heading text-lg font-bold">${entry.role} · ${entry.company}</h3>
              <span class="font-mono text-xs text-[var(--color-text-muted)]">${entry.period}</span>
            </div>
            <p class="text-sm text-[var(--color-text-muted)]">${entry.description}</p>
            <span class="mt-1 flex items-center gap-1.5 font-mono text-xs text-[var(--color-accent-end)]">
              <svg data-accordion-chevron class="h-3.5 w-3.5 transition-transform duration-300 [[data-open=true]_&]:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
              Key achievements
            </span>
          </button>
          <div id="exp-panel-${i}" data-accordion-panel class="px-6">
            <ul class="space-y-2 pb-6 text-sm text-[var(--color-text-muted)]">
              ${entry.achievements.map((a) => `<li class="flex gap-2"><span class="text-[var(--color-accent-end)]">▸</span><span>${a}</span></li>`).join("")}
            </ul>
            <div class="flex flex-wrap gap-2 pb-6">
              ${entry.stack.map((t) => `<span class="rounded-full bg-[var(--color-surface)] px-3 py-1 font-mono text-xs">${t}</span>`).join("")}
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

/**
 * Timeline entries alternate slide direction (left/right) as each one
 * scrolls into view, rather than the generic uniform stagger used
 * elsewhere — a small signature touch for the one section that's
 * inherently sequential.
 */
function animateTimeline() {
  const items = document.querySelectorAll("[data-timeline-item]");
  if (!items.length || isReducedMotion()) return;

  items.forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, x: i % 2 === 0 ? -40 : 40 },
      {
        opacity: 1,
        x: 0,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
        },
      }
    );
  });
}

function renderAwards(awards) {
  const container = document.querySelector("[data-awards-grid]");
  if (!container) return;
  container.innerHTML = awards
    .map(
      (award) => `
        <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md">
          <h3 class="font-heading text-base font-bold">${award.title}</h3>
          <p class="mt-1 font-mono text-xs text-[var(--color-text-muted)]">${award.issuer} · ${award.year}</p>
          <p class="mt-3 text-sm text-[var(--color-text-muted)]">${award.description}</p>
        </div>
      `
    )
    .join("");
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
      quickRotateY(px * 6);
      quickRotateX(-py * 6);
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

  const [site, aboutData, blogData] = await Promise.all([
    renderNavFooter(),
    fetchJSON("assets/data/about.json"),
    fetchJSON("assets/data/blog.json"),
  ]);

  renderBio(aboutData.bio);
  renderStats(aboutData.stats);
  renderPhilosophy(aboutData.philosophy);
  renderSkills(aboutData.skills);
  renderExperience(aboutData.experience);
  renderAwards(aboutData.awards);
  renderTestimonials(site?.testimonials);
  renderLinkedInFeatured(site?.linkedinFeatured);
  renderLatestBlog(blogData?.posts);

  revealOnScroll();
  initStaggerReveals();
  animateTimeline();
  animateSkillBars();
  initAccordions();
  initTiltCards();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
  bootAmbientScene();
}

init();
