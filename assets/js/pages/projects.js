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
  isReducedMotion,
} from "../main.js";

gsap.registerPlugin(ScrollTrigger);

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

function renderProjects(projects) {
  const container = document.querySelector("[data-projects-list]");
  if (!container) return;

  container.innerHTML = projects
    .map(
      (project) => `
        <article id="${project.id}" data-reveal class="opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0 scroll-mt-28 [perspective:1200px]">
          <div data-tilt-card class="rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-8 backdrop-blur-md transition-shadow duration-300 will-change-transform">
            <h2 class="font-heading text-2xl font-bold">${project.title}</h2>
            <p class="mt-2 text-base text-[var(--color-text-muted)]">${project.summary}</p>

            <div data-reveal-stagger class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div data-reveal-item class="${REVEAL_ITEM_CLASSES}">
                <h3 class="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">Problem</h3>
                <p class="mt-2 text-sm">${project.problem}</p>
              </div>
              <div data-reveal-item class="${REVEAL_ITEM_CLASSES}">
                <h3 class="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">Role</h3>
                <p class="mt-2 text-sm">${project.role}</p>
              </div>
              <div data-reveal-item class="${REVEAL_ITEM_CLASSES}">
                <h3 class="font-mono text-xs uppercase tracking-widest text-[var(--color-text-muted)]">Impact</h3>
                <p class="mt-2 text-sm">${project.impact}</p>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap gap-2">
              ${project.tech
                .map(
                  (t) =>
                    `<span class="rounded-full bg-[var(--color-surface)] px-3 py-1 font-mono text-xs">${t}</span>`
                )
                .join("")}
            </div>
          </div>
        </article>
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

  const [, projectsData] = await Promise.all([renderNavFooter(), fetchJSON("assets/data/projects.json")]);

  renderProjects(projectsData.projects);
  revealOnScroll();
  initStaggerReveals();
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
