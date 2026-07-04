import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const THEME_KEY = "jm-theme";

export function isReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Theme is already resolved pre-paint by the inline head script (avoids
 * flash-of-wrong-theme). This just wires up the toggle button(s).
 */
export function initTheme() {
  const root = document.documentElement;
  const toggles = document.querySelectorAll("[data-theme-toggle]");

  toggles.forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
    });
  });
}

export function initMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-nav-menu]");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = menu.getAttribute("data-open") === "true";
    menu.setAttribute("data-open", String(!isOpen));
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/**
 * Text elements ship with real fallback copy already in the HTML (matching
 * the JSON), so there's no flash-of-empty-content to manage — this just
 * syncs the text to the JSON source of truth once it loads.
 */
export function setText(el, value) {
  if (!el || value == null) return;
  el.textContent = value;
}

export async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

/**
 * Fetches data/site.json and renders shared nav + footer + logo marks.
 * Every page calls this on load. Returns the site data so page scripts
 * can reuse fields (e.g. socials) without a second fetch.
 */
export async function renderNavFooter() {
  try {
    const site = await fetchJSON("assets/data/site.json");

    document.querySelectorAll("[data-site-logo]").forEach((el) => {
      el.textContent = site.logoInitials;
    });

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const isCurrent = (href) => href === currentPage || (href === "index.html" && currentPage === "");

    const focusRing =
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-end)] rounded";

    const navContainer = document.querySelector("[data-site-nav]");
    if (navContainer) {
      navContainer.innerHTML = site.nav
        .map(
          (item) =>
            `<a href="${item.href}" ${
              isCurrent(item.href)
                ? `aria-current="page" class="text-[var(--color-accent-end)] ${focusRing}"`
                : `class="transition-colors hover:text-[var(--color-accent-end)] ${focusRing}"`
            }>${item.label}</a>`
        )
        .join("");
    }

    const mobileNavContainer = document.querySelector("[data-site-nav-mobile]");
    if (mobileNavContainer) {
      mobileNavContainer.innerHTML = site.nav
        .map(
          (item) =>
            `<a href="${item.href}" ${
              isCurrent(item.href)
                ? `aria-current="page" class="block py-3 text-lg text-[var(--color-accent-end)] ${focusRing}"`
                : `class="block py-3 text-lg transition-colors hover:text-[var(--color-accent-end)] ${focusRing}"`
            }>${item.label}</a>`
        )
        .join("");
    }

    const footerContainer = document.querySelector("[data-site-footer]");
    if (footerContainer) {
      footerContainer.innerHTML = `
        <p class="text-sm text-[var(--color-text-muted)]">${site.footer.text}</p>
        <div class="flex gap-5">
          ${site.footer.socials
            .map(
              (s) =>
                `<a href="${s.url}" target="_blank" rel="noopener noreferrer" aria-label="${s.platform}" class="text-sm transition-colors hover:text-[var(--color-accent-end)] ${focusRing}">${s.label}</a>`
            )
            .join("")}
        </div>
      `;
    }

    document.querySelectorAll("[data-nav-footer-loaded]").forEach((el) => {
      el.setAttribute("data-loaded", "true");
    });

    return site;
  } catch (err) {
    console.error("renderNavFooter failed:", err);
    return null;
  }
}

/**
 * Fades in any element marked [data-reveal] as it enters the viewport.
 * Elements carry their own hidden starting state via Tailwind classes
 * (opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0)
 * directly in the markup, so under prefers-reduced-motion we simply skip
 * creating the tween — the motion-reduce: classes already show them.
 */
export function revealOnScroll(selector = "[data-reveal]") {
  const items = document.querySelectorAll(selector);
  if (!items.length || isReducedMotion()) return;

  items.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    });
  });
}

/**
 * Same idea as revealOnScroll but staggers a group of children as their
 * shared container enters the viewport — used for card grids (stats, tech
 * chips, skills, timeline entries) so they cascade in rather than popping
 * in as one flat block. Children carry the same hidden-state Tailwind
 * classes as [data-reveal] (opacity-0 translate-y-6 motion-reduce:...).
 */
export function initStaggerReveals(containerSelector = "[data-reveal-stagger]", itemSelector = "[data-reveal-item]") {
  const containers = document.querySelectorAll(containerSelector);
  if (!containers.length || isReducedMotion()) return;

  containers.forEach((container) => {
    const items = container.querySelectorAll(itemSelector);
    if (!items.length) return;

    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: {
        trigger: container,
        start: "top 85%",
        once: true,
      },
    });
  });
}

/**
 * Subtle cursor-attraction effect for buttons/links marked [data-magnetic] —
 * the element drifts a fraction of the distance toward the pointer while
 * hovered, and springs back on leave. Pure hover polish, skipped entirely
 * under prefers-reduced-motion.
 */
export function initMagneticButtons(selector = "[data-magnetic]", strength = 0.35) {
  if (isReducedMotion()) return;

  document.querySelectorAll(selector).forEach((el) => {
    const quickX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
    const quickY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });

    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      quickX((e.clientX - (rect.left + rect.width / 2)) * strength);
      quickY((e.clientY - (rect.top + rect.height / 2)) * strength);
    });

    el.addEventListener("pointerleave", () => {
      quickX(0);
      quickY(0);
    });
  });
}

/**
 * Thin gradient bar fixed to the top of the viewport whose width tracks
 * total scroll progress through the page. Purely decorative wayfinding.
 */
export function initScrollProgress(selector = "[data-scroll-progress]") {
  const bar = document.querySelector(selector);
  if (!bar || isReducedMotion()) return;

  gsap.set(bar, { scaleX: 0 });
  gsap.to(bar, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
    },
  });
}

/**
 * Covers the viewport with a gradient wipe before following an internal
 * link, so the full-page navigation between the 4 pages doesn't feel like
 * a hard reload. External links, same-page anchors, and mailto/tel links
 * are left untouched.
 */
export function initPageTransitions() {
  const overlay = document.querySelector("[data-page-transition]");
  if (!overlay || isReducedMotion()) return;

  document.querySelectorAll('a[href$=".html"]').forEach((link) => {
    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }
    const isInternal = url.origin === window.location.origin;
    const isSamePage = url.pathname === window.location.pathname;
    if (!isInternal || isSamePage) return;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      gsap.to(overlay, {
        yPercent: 0,
        duration: 0.45,
        ease: "power3.inOut",
        onComplete: () => {
          window.location.href = link.href;
        },
      });
    });
  });
}
