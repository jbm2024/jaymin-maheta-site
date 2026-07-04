# jayminmaheta.com — Portfolio

Static, JSON-driven, multi-page portfolio. Plain HTML + Tailwind CSS (CDN) + vanilla JS (ES modules) + Three.js + GSAP (incl. Flip) + PhotoSwipe. No build step, no framework.

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

```text
index.html / about.html / projects.html / gallery.html / contact.html   5 pages, hardcoded
                       SEO meta, Tailwind utility markup
assets/
  css/main.css        theme variables only (:root / [data-theme="light"]) + the 2 things
                       Tailwind utilities can't express (::selection, ::-webkit-scrollbar)
  data/*.json          content — edit these to update copy, no HTML changes needed
  images/gallery/*.svg placeholder gallery images — swap the files, keep the filenames (or
                       update gallery.json's `src` values to match new filenames)
  js/main.js           shared shell: theme toggle, mobile nav, nav/footer render, scroll
                       reveals, page transitions, stat counters, accordions
  js/pages/*.js        one per page — fetches that page's JSON + renders it
  js/three/            home-scene.js (Home's 5-beat scroll scene), ambient-particles.js
                       (shared lightweight background for the other pages)
  js/contact-form.js   Formspree submit handling + validation
```

### Gallery (`gallery.html` / `assets/data/gallery.json`)

Each entry in `gallery.json`'s `images` array has an `active` flag — only `active: true`
images render on the page, so you can stage new shots ahead of time (or temporarily pull one)
without touching any HTML. Fields: `src` (image path), `width`/`height` (needed by the
lightbox for correct sizing before the image loads), `alt`, `caption`, `active`. Clicking any
image opens it in a [PhotoSwipe](https://photoswipe.com/) lightbox with zoom, arrow-key
navigation, and a counter — loaded only on this page via the import map, so it costs nothing
on the others.

The 8 shipped images are generated gradient placeholders (`assets/images/gallery/shot-0N.svg`)
labeled with what they're standing in for — swap in real screenshots/photos at the same path,
or add new files and point new JSON entries at them.

### Featured LinkedIn posts (every page / `site.json`'s `linkedinFeatured`)

A "Featured on LinkedIn" band appears near the bottom of all 5 pages (`renderLinkedInFeatured()`
in `main.js`, called from every page script). It's a single shared component: content, the
follow link, and the two posts all come from `site.json`'s `linkedinFeatured` block, so editing
one JSON updates every page. Renders LinkedIn's official public-post embed
(`https://www.linkedin.com/embed/feed/update/<urn>`) for each entry in `linkedinFeatured.posts`
with `active: true`. To swap a post: open it on LinkedIn, copy the URL, and pull the
`urn:li:activity:...` id out of it (or use the "Embed this post" share option LinkedIn provides
on public posts, which contains the same URN) — the post must be public for the embed to render
for visitors who aren't logged in.

**Loading behavior**: each post's iframe has no `src` until the section is about to scroll into
view (`IntersectionObserver`, 300px lead) — so a visitor who never scrolls that far never
triggers the LinkedIn request at all. Once triggered, posts load one at a time (staggered
~350ms apart) rather than simultaneously. Each post shows a spinner + a looping typewriter
message until that specific iframe's `load` event fires, then fades the real content in —
so visitors only ever see finished content, never a half-loaded flash. Under
`prefers-reduced-motion`, the typewriter is skipped in favor of a single static message.

## Before this goes live

1. **Formspree endpoint** — `assets/data/contact.json` has `formEndpoint: "https://formspree.io/f/YOUR_FORM_ID"`. Create a free account at formspree.io and replace `YOUR_FORM_ID`. Until then, the form shows a friendly "not configured yet" message instead of failing silently.
2. **Placeholder facts to verify** — these were written from limited source material and should be fact-checked:
   - `assets/data/about.json`: company names for the 3 earlier roles are placeholders (`"Previous Company (update me)"`), and the award list/years are best-guess reconstructions. The `achievements` bullets per role and `stats`/`philosophy` copy are plausible expansions written to match the existing bio — verify against your actual history before publishing.
   - `assets/data/projects.json`: the problem/role/impact copy for all 3 case studies is plausible placeholder content, not verified fact — rewrite with real specifics before publishing. The `approach` steps and `results` metrics added for the expandable case-study view are illustrative placeholders in the same vein — replace with real numbers where you have them, or reword as qualitative wins where you don't.
   - `assets/data/site.json` / `contact.json`: LinkedIn is confirmed (`https://www.linkedin.com/in/jaymin-maheta/`); GitHub (`jayminmaheta`) is still a guessed slug — confirm or correct it.
   - `assets/data/gallery.json`: images are placeholder graphics, not real photos/screenshots — see the Gallery section above.
3. **OG image** — `assets/images/og-image.jpg` is referenced in every page's `<head>` but doesn't exist yet. Add a 1200×630 image there for link previews (LinkedIn/Twitter/Slack).
4. **Apple touch icon** — only an SVG favicon exists (`assets/icons/favicon.svg`). iOS doesn't support SVG favicons/home-screen icons; add a PNG apple-touch-icon if that matters to you.
5. **Domain** — canonical URLs, OG URLs, and `sitemap.xml`/`robots.txt` all hardcode `https://www.jayminmaheta.com/`. Update if the domain changes.

## Notes on trade-offs (see design spec for full reasoning)

- Tailwind is loaded via the CDN Play build (no purge/build step) — simplest to maintain, but ships more CSS than a CLI build would. Swapping to a CLI build later is a drop-in upgrade.
- All body content loads from JSON at runtime (your choice, for easy editing) — meta tags are the one exception and stay hardcoded per page so crawlers/link-preview bots always see correct titles/descriptions regardless of JS execution.
