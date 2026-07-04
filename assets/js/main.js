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
 * Animates a single counter element from 0 to data-stat-target once it
 * scrolls into view. Shared by home/about/projects stat blocks so each
 * page doesn't reimplement the same ScrollTrigger + gsap.to plumbing.
 * Under reduced motion, the target value is set immediately instead.
 */
export function initStatCounters(selector = "[data-stat-value]") {
  const valueEls = document.querySelectorAll(selector);
  if (!valueEls.length) return;

  if (isReducedMotion()) {
    valueEls.forEach((el) => {
      el.textContent = `${el.dataset.statTarget}${el.dataset.statSuffix || ""}`;
    });
    return;
  }

  valueEls.forEach((el) => {
    const target = Number(el.dataset.statTarget);
    const suffix = el.dataset.statSuffix || "";
    const counter = { value: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = `${Math.round(counter.value)}${suffix}`;
          },
        });
      },
    });
  });
}

/**
 * Wires up [data-accordion] panels: a [data-accordion-trigger] button
 * toggles a [data-accordion-panel] open/closed with a GSAP height tween
 * (auto-height via scrollHeight, since CSS can't transition to "auto").
 * Reduced motion still gets the show/hide, just without the tween.
 */
export function initAccordions(selector = "[data-accordion]") {
  document.querySelectorAll(selector).forEach((accordion) => {
    const trigger = accordion.querySelector("[data-accordion-trigger]");
    const panel = accordion.querySelector("[data-accordion-panel]");
    if (!trigger || !panel) return;

    gsap.set(panel, { height: 0, overflow: "hidden" });

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!isOpen));
      accordion.setAttribute("data-open", String(!isOpen));

      if (isReducedMotion()) {
        gsap.set(panel, { height: isOpen ? 0 : "auto" });
        return;
      }

      if (isOpen) {
        gsap.to(panel, { height: 0, duration: 0.35, ease: "power2.inOut" });
      } else {
        gsap.set(panel, { height: "auto" });
        const target = panel.offsetHeight;
        gsap.fromTo(panel, { height: 0 }, { height: target, duration: 0.45, ease: "power2.inOut" });
      }
    });
  });
}

const REVEAL_ITEM_CLASSES = "opacity-0 translate-y-6 motion-reduce:opacity-100 motion-reduce:translate-y-0";

const LINKEDIN_LOADER_PHRASES = [
  "Pulling in fresh thoughts…",
  "Good ideas take a moment…",
  "Connecting to LinkedIn…",
  "Almost there — worth the wait…",
];

/** Runs fn when the browser is idle, so non-critical work never competes with initial paint. */
function runWhenIdle(fn) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout: 1500 });
  } else {
    setTimeout(fn, 1);
  }
}

/**
 * Types phrases out one character at a time, pauses, deletes, and moves to
 * the next — loops until .stop() is called (when the real content arrives).
 * Under reduced motion, skips the animation and just shows the first phrase.
 */
function startTypewriter(el, phrases) {
  if (!el) return { stop() {} };
  if (isReducedMotion()) {
    el.textContent = phrases[0];
    return { stop() {} };
  }

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;
  let timeoutId;
  let stopped = false;

  function tick() {
    if (stopped) return;
    const phrase = phrases[phraseIndex];

    if (!deleting) {
      charIndex += 1;
      el.textContent = phrase.slice(0, charIndex);
      timeoutId = setTimeout(tick, charIndex === phrase.length ? 1400 : 45);
      if (charIndex === phrase.length) deleting = true;
      return;
    }

    charIndex -= 1;
    el.textContent = phrase.slice(0, charIndex);
    if (charIndex === 0) {
      deleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      timeoutId = setTimeout(tick, 300);
      return;
    }
    timeoutId = setTimeout(tick, 25);
  }

  tick();
  return {
    stop() {
      stopped = true;
      clearTimeout(timeoutId);
    },
  };
}

/**
 * Defers loading of the LinkedIn embeds until the section is actually about
 * to scroll into view (IntersectionObserver, generous rootMargin so it's
 * ready before the user arrives), then loads each post's iframe in a
 * staggered sequence rather than all at once — cheaper on the network and
 * main thread than firing every embed simultaneously on page load. Each
 * slot keeps its typewriter loader + spinner visible until that iframe's
 * own "load" event fires, so real content is always what gets shown, never
 * a half-loaded flash.
 */
function initLinkedInLoading(section) {
  const slots = Array.from(section.querySelectorAll("[data-linkedin-slot]"));
  if (!slots.length) return;

  const typewriters = slots.map((slot) => startTypewriter(slot.querySelector("[data-linkedin-loader-text]"), LINKEDIN_LOADER_PHRASES));

  slots.forEach((slot, i) => {
    const iframe = slot.querySelector("[data-linkedin-src]");
    if (!iframe) return;
    iframe.addEventListener(
      "load",
      () => {
        typewriters[i].stop();
        const loader = slot.querySelector("[data-linkedin-loader]");
        iframe.style.opacity = "1";
        if (loader) {
          loader.style.opacity = "0";
          setTimeout(() => loader.remove(), 500);
        }
      },
      { once: true }
    );
  });

  const startLoading = () => {
    slots.forEach((slot, i) => {
      const iframe = slot.querySelector("[data-linkedin-src]");
      if (!iframe) return;
      setTimeout(() => {
        iframe.src = iframe.dataset.linkedinSrc;
      }, i * 350);
    });
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          startLoading();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(section);
  } else {
    runWhenIdle(startLoading);
  }
}

/**
 * Renders the site-wide "Featured on LinkedIn" band into [data-linkedin-featured]
 * (present on every page). Data lives in site.json so it's fetched once via
 * renderNavFooter() and shared here — one JSON edit updates every page.
 * Uses LinkedIn's official public-post embed iframe; only posts with
 * active:true show, so a post can be swapped or paused via that flag alone.
 * Loading is deferred and staggered — see initLinkedInLoading.
 */
export function renderLinkedInFeatured(linkedinFeatured) {
  const section = document.querySelector("[data-linkedin-featured]");
  if (!section || !linkedinFeatured) return;

  setText(section.querySelector("[data-linkedin-eyebrow]"), linkedinFeatured.eyebrow);
  setText(section.querySelector("[data-linkedin-heading]"), linkedinFeatured.heading);
  setText(section.querySelector("[data-linkedin-subtitle]"), linkedinFeatured.subtitle);

  const followLink = section.querySelector("[data-linkedin-follow]");
  if (followLink) {
    if (linkedinFeatured.profileUrl) followLink.href = linkedinFeatured.profileUrl;
    setText(followLink.querySelector("[data-linkedin-follow-label]"), linkedinFeatured.followLabel);
  }

  const container = section.querySelector("[data-linkedin-posts]");
  if (!container) return;

  const active = (linkedinFeatured.posts || []).filter((post) => post.active);
  if (!active.length) {
    container.innerHTML = `<p class="text-sm text-[var(--color-text-muted)]">No featured posts right now — see the full profile on <a href="${linkedinFeatured.profileUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-accent-end)]">LinkedIn</a>.</p>`;
    return;
  }

  container.innerHTML = active
    .map(
      (post) => `
        <div data-linkedin-slot class="relative h-[540px] overflow-hidden rounded-2xl border border-[var(--color-border-glass)] bg-[var(--color-surface)] shadow-[0_20px_60px_-30px_rgba(var(--color-accent-rgb),0.5)]">
          <div data-linkedin-loader class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] px-6 transition-opacity duration-500">
            <span aria-hidden="true" class="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border-glass)] border-t-[var(--color-accent-end)] motion-reduce:animate-none"></span>
            <p data-linkedin-loader-text aria-hidden="true" class="min-h-[1.25rem] text-center font-mono text-xs text-[var(--color-text-muted)]"></p>
            <span class="sr-only" role="status">Loading LinkedIn post…</span>
          </div>
          <iframe
            data-linkedin-src="https://www.linkedin.com/embed/feed/update/${post.urn}"
            height="540"
            width="100%"
            frameborder="0"
            allowfullscreen
            title="Embedded LinkedIn post"
            class="block h-[540px] w-full opacity-0 transition-opacity duration-500"
          ></iframe>
        </div>
      `
    )
    .join("");

  initLinkedInLoading(section);
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
