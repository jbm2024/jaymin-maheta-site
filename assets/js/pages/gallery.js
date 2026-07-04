import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PhotoSwipeLightbox from "photoswipe/lightbox";
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
  renderLatestBlog,
  fetchJSON,
  setText,
  isReducedMotion,
} from "../main.js";

gsap.registerPlugin(ScrollTrigger);

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

/**
 * Only images with active:true render — the JSON's "active" flag is the
 * single on/off switch for what's public, so images can be staged in
 * gallery.json ahead of time without appearing on the live site.
 */
function renderGallery(images) {
  const container = document.querySelector("[data-gallery-grid]");
  const empty = document.querySelector("[data-gallery-empty]");
  if (!container) return;

  const active = images.filter((img) => img.active);

  if (!active.length) {
    container.classList.add("hidden");
    empty?.classList.remove("hidden");
    return;
  }

  container.innerHTML = active
    .map(
      (img) => `
        <a
          href="${img.src}"
          data-pswp-width="${img.width}"
          data-pswp-height="${img.height}"
          data-reveal-item
          class="${REVEAL_ITEM_CLASSES} group block overflow-hidden rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]"
          target="_blank"
          rel="noreferrer"
        >
          <figure class="relative aspect-[16/10] overflow-hidden">
            <img
              src="${img.src}"
              alt="${img.alt}"
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <figcaption class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3 font-mono text-xs text-white/90">
              ${img.caption}
            </figcaption>
          </figure>
        </a>
      `
    )
    .join("");
}

function initLightbox() {
  const lightbox = new PhotoSwipeLightbox({
    gallery: "[data-gallery-grid]",
    children: "a",
    pswpModule: () => import("photoswipe"),
  });
  lightbox.init();
  return lightbox;
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

  const [site, galleryData, blogData] = await Promise.all([
    renderNavFooter(),
    fetchJSON("assets/data/gallery.json"),
    fetchJSON("assets/data/blog.json"),
  ]);

  setText(document.querySelector("[data-gallery-heading]"), galleryData.intro.heading);
  setText(document.querySelector("[data-gallery-subtitle]"), galleryData.intro.subtitle);
  renderGallery(galleryData.images);
  renderTestimonials(site?.testimonials);
  renderLinkedInFeatured(site?.linkedinFeatured);
  renderLatestBlog(blogData?.posts);

  revealOnScroll();
  initStaggerReveals();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
  initLightbox();
  bootAmbientScene();
}

init();
