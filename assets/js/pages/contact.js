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

/**
 * Renders LinkedIn's official public-post embed iframes. Only posts with
 * active:true in contact.json show up, so a post can be swapped out or
 * paused just by flipping that flag — no HTML changes needed.
 */
function renderLinkedInFeatured(linkedinFeatured) {
  if (!linkedinFeatured) return;

  setText(document.querySelector("[data-linkedin-heading]"), linkedinFeatured.heading);
  setText(document.querySelector("[data-linkedin-subtitle]"), linkedinFeatured.subtitle);

  const container = document.querySelector("[data-linkedin-posts]");
  if (!container) return;

  const active = linkedinFeatured.posts.filter((post) => post.active);
  if (!active.length) {
    container.innerHTML = `<p class="text-sm text-[var(--color-text-muted)]">No featured posts right now — see the full profile on <a href="${linkedinFeatured.profileUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-accent-end)]">LinkedIn</a>.</p>`;
    return;
  }

  container.innerHTML = active
    .map(
      (post) => `
        <div data-reveal-item class="${REVEAL_ITEM_CLASSES} overflow-hidden rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] backdrop-blur-md">
          <iframe
            src="https://www.linkedin.com/embed/feed/update/${post.urn}"
            height="540"
            width="100%"
            loading="lazy"
            frameborder="0"
            allowfullscreen
            title="Embedded LinkedIn post"
            class="block w-full"
          ></iframe>
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

  const [, contactData] = await Promise.all([renderNavFooter(), fetchJSON("assets/data/contact.json")]);

  renderContactInfo(contactData);
  renderLinkedInFeatured(contactData.linkedinFeatured);
  initContactForm(contactData.formEndpoint);

  revealOnScroll();
  initStaggerReveals();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
  bootAmbientScene();
}

init();
