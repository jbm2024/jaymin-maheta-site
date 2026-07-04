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
  fetchJSON,
  setText,
  isReducedMotion,
} from "../main.js";

gsap.registerPlugin(ScrollTrigger);

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

function renderBio(bio) {
  setText(document.querySelector("[data-bio-heading]"), bio.heading);
  const container = document.querySelector("[data-bio-paragraphs]");
  if (!container) return;
  container.innerHTML = bio.paragraphs.map((p) => `<p>${p}</p>`).join("");
}

function renderSkills(skills) {
  const container = document.querySelector("[data-skills-grid]");
  if (!container) return;
  container.innerHTML = skills
    .map(
      (group) => `
        <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md">
          <h3 class="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">${group.category}</h3>
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

function renderExperience(experience) {
  const container = document.querySelector("[data-experience-timeline]");
  if (!container) return;
  container.innerHTML = experience
    .map(
      (entry) => `
        <div data-timeline-item class="relative rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md before:absolute before:-left-[1.65rem] before:top-8 before:h-3 before:w-3 before:rounded-full before:bg-gradient-to-r before:from-[var(--color-accent-start)] before:to-[var(--color-accent-end)]">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h3 class="font-heading text-lg font-bold">${entry.role} · ${entry.company}</h3>
            <span class="font-mono text-xs text-[var(--color-text-muted)]">${entry.period}</span>
          </div>
          <p class="mt-2 text-sm text-[var(--color-text-muted)]">${entry.description}</p>
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

  const [, aboutData] = await Promise.all([renderNavFooter(), fetchJSON("assets/data/about.json")]);

  renderBio(aboutData.bio);
  renderSkills(aboutData.skills);
  renderExperience(aboutData.experience);
  renderAwards(aboutData.awards);

  revealOnScroll();
  initStaggerReveals();
  animateTimeline();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
  bootAmbientScene();
}

init();
