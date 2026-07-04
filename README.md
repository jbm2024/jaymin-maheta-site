# jayminmaheta.com — Portfolio

Static, JSON-driven, multi-page portfolio. Plain HTML + Tailwind CSS (CDN) + vanilla JS (ES modules) + Three.js + GSAP. No build step, no framework.

Full design rationale: [docs/specs/2026-07-04-portfolio-redesign-design.md](docs/specs/2026-07-04-portfolio-redesign-design.md)
Implementation plan: [docs/specs/2026-07-04-portfolio-redesign-plan.md](docs/specs/2026-07-04-portfolio-redesign-plan.md)

## Running locally

Content is fetched via `fetch('assets/data/*.json')`, which browsers block on `file://` URLs. Serve the folder instead:

```bash
python3 -m http.server 8000
# or: npx serve
```

Then open `http://localhost:8000/index.html`.

## Structure

```
index.html / about.html / projects.html / contact.html   4 pages, hardcoded SEO meta, Tailwind utility markup
assets/
  css/main.css        theme variables only (:root / [data-theme="light"]) + the 2 things
                       Tailwind utilities can't express (::selection, ::-webkit-scrollbar)
  data/*.json          content — edit these to update copy, no HTML changes needed
  js/main.js           shared shell: theme toggle, mobile nav, nav/footer render, scroll
                       reveals, page transitions
  js/pages/*.js        one per page — fetches that page's JSON + renders it
  js/three/            home-scene.js (Home's 5-beat scroll scene), ambient-particles.js
                       (shared lightweight background for the other 3 pages)
  js/contact-form.js   Formspree submit handling + validation
```

## Before this goes live

1. **Formspree endpoint** — `assets/data/contact.json` has `formEndpoint: "https://formspree.io/f/YOUR_FORM_ID"`. Create a free account at formspree.io and replace `YOUR_FORM_ID`. Until then, the form shows a friendly "not configured yet" message instead of failing silently.
2. **Placeholder facts to verify** — these were written from limited source material and should be fact-checked:
   - `assets/data/about.json`: company names for the 3 earlier roles are placeholders (`"Previous Company (update me)"`), and the award list/years are best-guess reconstructions.
   - `assets/data/projects.json`: the problem/role/impact copy for all 3 case studies is plausible placeholder content, not verified fact — rewrite with real specifics before publishing.
   - `assets/data/site.json` / `contact.json`: LinkedIn and GitHub URLs are guessed slugs (`jaymin-maheta` / `jayminmaheta`) — confirm or correct them.
3. **OG image** — `assets/images/og-image.jpg` is referenced in every page's `<head>` but doesn't exist yet. Add a 1200×630 image there for link previews (LinkedIn/Twitter/Slack).
4. **Apple touch icon** — only an SVG favicon exists (`assets/icons/favicon.svg`). iOS doesn't support SVG favicons/home-screen icons; add a PNG apple-touch-icon if that matters to you.
5. **Domain** — canonical URLs, OG URLs, and `sitemap.xml`/`robots.txt` all hardcode `https://www.jayminmaheta.com/`. Update if the domain changes.

## Notes on trade-offs (see design spec for full reasoning)

- Tailwind is loaded via the CDN Play build (no purge/build step) — simplest to maintain, but ships more CSS than a CLI build would. Swapping to a CLI build later is a drop-in upgrade.
- All body content loads from JSON at runtime (your choice, for easy editing) — meta tags are the one exception and stay hardcoded per page so crawlers/link-preview bots always see correct titles/descriptions regardless of JS execution.
