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
import { initContactForm } from "../contact-form.js";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)] rounded";
const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

function renderContactInfo(contact) {
  const container = document.querySelector("[data-contact-info]");
  if (!container) return;

  const socialLinks = contact.socials
    .map(
      (s) =>
        `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="block transition-colors hover:text-[var(--color-accent-end)] ${FOCUS_RING}">${s.platform}</a>`
    )
    .join("");

  container.innerHTML = `
    <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md">
      <h2 class="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Email</h2>
      <a href="mailto:${contact.email}" class="mt-2 block break-words font-mono text-sm transition-colors hover:text-[var(--color-accent-end)] ${FOCUS_RING}">${contact.email}</a>
    </div>
    <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md">
      <h2 class="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Phone</h2>
      <a href="tel:${contact.phone.replace(/\s+/g, "")}" class="mt-2 block font-mono text-sm transition-colors hover:text-[var(--color-accent-end)] ${FOCUS_RING}">${contact.phone}</a>
    </div>
    <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md">
      <h2 class="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Location</h2>
      <p class="mt-2 text-sm text-[var(--color-text-muted)]">${contact.location}</p>
    </div>
    <div data-reveal-item class="${REVEAL_ITEM_CLASSES} rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] p-6 backdrop-blur-md">
      <h2 class="font-heading text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Elsewhere</h2>
      <div class="mt-2 space-y-1 text-sm">${socialLinks}</div>
    </div>
  `;
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

  const [, contactData] = await Promise.all([renderNavFooter(), fetchJSON("assets/data/contact.json")]);

  renderContactInfo(contactData);
  initContactForm(contactData.formEndpoint);

  revealOnScroll();
  initStaggerReveals();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
  bootAmbientScene();
}

init();
