# Design system

Reference: `mockups/varianta-d.html` (mockup D, "Afiș + Tabela", approved by Mario; photos in
`mockups/img/`). Open it in a browser before any UI work. The built homepage follows it closely;
intended differences: no photo captions, a source line under the roster ("Clasamentul FRB,
săptămâna N, ..."), the footer from the shell.

## Tokens (`web/src/styles/tokens.css`, the only place values live)

| Token | Value | Use |
|---|---|---|
| `--blue` | `#1549a8` | Crest blue, solid fields (hero, groups, roster points badge) |
| `--blue-deep` | `#0c2f74` | Footer, hero photo frame |
| `--red` | `#e23a45` | Kit red: accents only (offset plates, first rank numeral, small marks) |
| `--red-field` | `#d63340` | Red sections that carry text (calendar band, trial CTA) |
| `--red-ink` | `#c2222d` | Small red text on white |
| `--white` | `#ffffff` | Fields and text on colour |
| `--mist` | `#e8eef8` | Resting sections (hall) |
| `--court` | `#f39a1e` | Court orange, small touches only |
| `--ink` | `#0a1f4d` | Text (dark navy) |
| `--display` | Big Shoulders Display (800, 900) | Headings, uppercase, line-height 0.95 |
| `--body` | Instrument Sans Variable | Body, 17px / 1.5 |
| `--col` | `1180px` | Content column (`.wrap`) |
| `--gut` | `clamp(16px, 4vw, 48px)` | Side gutter |

Fonts are self-hosted through `@fontsource` packages (bundled into `/_astro/`); no Google Fonts
request at runtime (e2e test "fonts are self-hosted"). Section headings: `h2.display`,
`clamp(2.2rem, 4.6vw, 4.2rem)`; hero headline `clamp(3rem, 6.2vw, 5.9rem)` (display type capped
near 6rem). One breakpoint: `max-width: 860px` (CSS) / `min-width: 861px` (motion).

Straight edges everywhere. Photos are treated as posters with an offset red plate behind.

## Section order and why

`main > section` order, asserted by e2e: `hero`, `#de-ce`, `#program`, `#calendar`,
`#sportivi`, `.hall`, `#noutati`, `#proba`.

The homepage invites before it proves: the motto ("Ai reușit? Continuă! N-ai reușit?
Continuă!"), why badminton, the groups (who can join), the calendar, then the athletes as proof
("Unde ajung cei care continuă"), the hall, news, trial training. Mario noted that the club's
own site says "why play badminton", not "look how high we are". The roster is left out entirely
when no athlete has consent. Homepage caps: 3 posts, 3 athletes (the mockup shows 3 of each and
links to full lists).

## Motion: the five moments (`web/src/scripts/motion.ts`)

| # | Moment | Hooks | Behaviour |
|---|---|---|---|
| 1 | Hero load | `.hero .poster .plate`, `.poster .shot`, `.l1`/`.l3`, `.l2` | Plate grows, photo unclips, headline lines enter from opposite sides. Plays once, outside `matchMedia`, so crossing 860px never replays it |
| 2 | Hero scrub | `.hero > .wrap` (pinned, not the section), lines, `.poster`, `.poster img` | Wide: pinned for 70% of a viewport, scrub 0.6. Narrow: no pin, scrubs until `bottom 35%`. Distances re-measured on refresh |
| 3 | Roster numerals | `[data-roll]` | Digits roll to the place while the row scrolls in. The element holds its final digits as text for no-JS and reduced motion |
| 4 | Heading drift | `section:not(.hero) h2.display` | Drift sideways into place, alternating direction; wide `min(7vw, 90px)`, narrow 12px |
| 5 | Hall strip | `.hall .track` in its column | Travels sideways while the column is pinned, until the last photo's right edge meets the column. Pins only with 2+ photos and a distance over 1px; created or removed on refresh. Adds `.js-rally` and removes the track's `tabindex` while JS drives it |

Hero line classes follow the mockup: line 1 `.l1`, even positions `.l2`, others `.l3`. Hero
A sixth, asked for by Mario and confined to the 404 page: the rally over the net that spells
404 (`web/src/scripts/rally.ts`, simulation in `web/src/lib/rally/`). SVG nodes moved by
`transform` only, no GSAP; it stops when the tab is hidden or the scene is off screen. Reduced
motion and no-JS show the still frame that `RallyScene.astro` renders from the same code (the
shuttle caught in the 0). Two framings of one scene: `wide`, and `tall` at 860px and below.

Hero lines may wrap below 860px (coach-editable motto must never clip). `initMotion()` returns at once
under `prefers-reduced-motion: reduce` (`base.css` also turns off smooth scrolling). GSAP is bundled
from npm, never a CDN. No other animation may be added without Mario's approval.

## Forbidden patterns, with the owner's objections

From the spec and Mario's reviews of the four sketches:

- Flip-card scoreboard widget: "AI slop masiv" (massive AI slop). Sketch C "looked like AI".
- Groups as a bordered table (with empty cells or the same text on every row) or as a staircase
  layout: "nu prea se înțelege" (hard to follow). Groups are two plain lists.
- Ranking places in the hero headline: rejected; the motto is the hero.
- Sketch B: liked the style, but "too big, too full-screen"; hence the modest scale.
- The spec's "generated template" failure list: cream background, rounded cards with shadows,
  all-caps labels above every heading, a fade on every section, invented figures, stock photos.
- Also forbidden: dashed/dotted pill badges, grey skeleton bars, 01/02/03 markers, arrows on
  buttons, a single coloured word in a headline, charts or numbers without real data.

## Accessibility decisions

- Contrast (WCAG, checked by `web/tests/unit/tokens.test.ts`): white on `--red-field` 4.77:1,
  white on `--blue` 8.23:1, ink on `--mist` 13.69:1, ink on white 15.96:1. White on `--red` is
  4.26:1, so `--red` never carries body text. `--red-ink` on white is 5.9:1.
- Focus ring: `outline: 3px solid currentColor; outline-offset: 3px` (ink on light fields, white
  on blue and red). The earlier court-orange ring was 2.22:1 on white, 1.92:1 on red.
- Images: every `<img>` has `width`/`height`; hero photo `loading="eager" fetchpriority="high"`,
  all others `loading="lazy" decoding="async"`; decorative images use `alt=""` plus
  `data-decorative`; content images need alt text (required in the Studio).
- Local photos in `web/public/img` are at most 1280px on the long side and under 1.6 MB together
  (unit test).
- Skip link "Sari la conținut"; the narrow menu is a `<details>` ("Meniu"), so it works without
  JS; the photo strip is a keyboard stop only when it scrolls on its own.
