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
  setText,
  isReducedMotion,
} from "../main.js";
import { getGalleryData, getLatestBlogPosts } from "../data.js";

gsap.registerPlugin(ScrollTrigger);

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

/** Renders the photo grid — either every "loose" (unalbumed) photo, or, once an album is selected, just that album's photos. */
function renderPhotoGrid(images, album, hasAlbums) {
  const container = document.querySelector("[data-gallery-grid]");
  const empty = document.querySelector("[data-gallery-empty]");
  const heading = document.querySelector("[data-gallery-grid-heading]");
  const backBtn = document.querySelector("[data-gallery-back]");
  if (!container) return;

  if (heading) heading.textContent = album ? album.title : "All Photos";
  backBtn?.classList.toggle("hidden", !album);

  if (!images.length) {
    container.classList.add("hidden");
    if (empty) {
      empty.textContent = album
        ? "No photos in this album yet."
        : hasAlbums
          ? "No individual photos yet — browse the albums above."
          : "No images to show yet — check back soon.";
      empty.classList.remove("hidden");
    }
    return;
  }
  container.classList.remove("hidden");
  empty?.classList.add("hidden");

  // Masonry layout (CSS columns, not a uniform grid): each item is sized by
  // its own aspect ratio via the plain <img>, so photos render at their real
  // proportions instead of being cropped to fit a fixed box.
  container.innerHTML = images
    .map(
      (img) => `
        <a
          href="${img.src}"
          data-pswp-width="${img.width}"
          data-pswp-height="${img.height}"
          data-reveal-item
          class="${REVEAL_ITEM_CLASSES} group mb-4 block break-inside-avoid overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]"
          target="_blank"
          rel="noreferrer"
        >
          <figure class="relative">
            <img
              src="${img.src}"
              alt="${img.alt}"
              loading="lazy"
              style="aspect-ratio: ${img.width} / ${img.height}"
              class="block h-auto w-full object-contain transition-transform duration-500 group-hover:scale-105"
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

/** Renders the "Albums" row — one tile per album (Google-Photos style: cover shot + title + photo count). Clicking a tile filters the grid below to that album via onSelect. */
function renderAlbums(albums, onSelect) {
  const section = document.querySelector("[data-gallery-albums-section]");
  const container = document.querySelector("[data-gallery-albums]");
  if (!section || !container) return;

  if (!albums.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");

  container.innerHTML = albums
    .map((album) => {
      const coverPhoto = album.images[0];
      const cover = album.coverImage || coverPhoto?.src || "";
      // Only hint an aspect-ratio (to avoid a layout jump on load) when the
      // cover falls back to a known gallery photo — a custom cover_image
      // upload has no stored width/height, so its own intrinsic size is
      // used instead (still uncropped, just without the pre-load hint).
      const aspectStyle = !album.coverImage && coverPhoto ? ` style="aspect-ratio: ${coverPhoto.width} / ${coverPhoto.height}"` : "";
      return `
        <button
          type="button"
          data-album-id="${album.id}"
          data-reveal-item
          class="${REVEAL_ITEM_CLASSES} group mb-4 block w-full break-inside-avoid overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)]"
        >
          <figure class="relative">
            <img
              src="${cover}"
              alt=""
              loading="lazy"${aspectStyle}
              class="block h-auto w-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
            <figcaption class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-white">
              <span class="font-mono text-xs font-medium">${album.title}</span>
              <span class="shrink-0 rounded-full bg-black/40 px-2 py-0.5 font-mono text-[10px]">${album.images.length} photo${album.images.length === 1 ? "" : "s"}</span>
            </figcaption>
          </figure>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll("[data-album-id]").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.dataset.albumId));
  });
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

  const [site, galleryData, latestPosts] = await Promise.all([renderNavFooter(), getGalleryData(), getLatestBlogPosts()]);

  setText(document.querySelector("[data-gallery-heading]"), galleryData.intro.heading);
  setText(document.querySelector("[data-gallery-subtitle]"), galleryData.intro.subtitle);

  const hasAlbums = galleryData.albums.length > 0;
  const selectAlbum = (id) => {
    const album = galleryData.albums.find((a) => a.id === id) || null;
    renderPhotoGrid(album ? album.images : galleryData.images, album, hasAlbums);
    // Newly-injected grid items start hidden (opacity-0) via REVEAL_ITEM_CLASSES —
    // re-run the stagger reveal so they animate in instead of staying invisible.
    initStaggerReveals("[data-gallery-grid]");
    ScrollTrigger.refresh();
    document.querySelector("[data-gallery-grid-heading]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  renderAlbums(galleryData.albums, selectAlbum);
  renderPhotoGrid(galleryData.images, null, hasAlbums);
  document.querySelector("[data-gallery-back]")?.addEventListener("click", () => selectAlbum(null));

  renderTestimonials(site?.testimonials);
  renderLinkedInFeatured(site?.linkedinFeatured);
  renderLatestBlog(latestPosts);

  revealOnScroll();
  initStaggerReveals();
  initMagneticButtons();
  initScrollProgress();
  ScrollTrigger.refresh();
  initLightbox();
  bootAmbientScene();
}

init();
