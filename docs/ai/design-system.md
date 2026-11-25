# Design system

Reference: `mockups/varianta-d.html` (mockup D, "Afiș + Tabela", approved by Mario; photos in
`mockups/img/`). Open it in a browser before any UI work. The built homepage follows it closely;
intended differences: no photo captions, a source line under the roster ("Clasamentul FRB,
săptămâna N, ..."), the footer from the shell.

## Voice: «tu» everywhere

Every visitor-facing line (pages, shared pieces, form labels, hints and messages, meta
descriptions, the 404 page) addresses the visitor as "tu", warm and direct like the club's motto
"Ai reușit? Continuă!": "Scrie-ne la …", "Lasă-ne vârsta copilului", "Numele tău", "Clubul te
contactează". Never "dumneavoastră" or the polite plural ("Scrieți", "vă"). Owner's decision,
2026-11-26. Exception: the "De confirmat de club" lines speak to the club, so they keep the plural
("primiți", "răspundeți"). A verb whose subject is the visitor and the club together stays plural
("ca să stabiliți împreună ziua probei"). The consent box stays in the first person ("Sunt de
acord … să mă contacteze"): it is the visitor speaking.

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
| `--blue-tint` | `#afc1e1` | Inner pages: a played event (calendar); text `--blue-deep` (6.89:1) |
| `--red-tint` | `#f3c2c6` | Inner pages: a home event (calendar); text `--red-deep` (5.05:1) |
| `--red-deep` | `#9a2134` | Text on `--red-tint` |
| `--mist-soft` | `#f0f4fa` | A calendar day cell; ink on it 14.46:1 |
| `--ink-soft` | `#3a4866` | "De confirmat" text (`.tbc`), 9.14:1 on white |
| `--ink-muted` | `#5d6b8a` | Weekday letters, "fără competiții", quiet borders; 5.34:1 on white |
| `--court-hatch` | court orange at 50% | Stripes behind an example value (`Sample`: hours, coaches) |
| `--court-hatch-strong` | court orange at 75% | Stripes of the small "example" square in the programme's note |
| `--display` | Big Shoulders Display (800, 900) | Headings, uppercase, line-height 0.95 |
| `--body` | Instrument Sans Variable | Body, 17px / 1.5 |
| `--col` | `1180px` (+27% of `--lift`, 1482px at 2560) | Content column (`.wrap`) |
| `--gut` | `clamp(16px, 4vw, 48px)` (cap +3% of `--lift`, 82px at 2560) | Side gutter |
| `--lift` | `clamp(0px, 100vw - 1440px, 1120px)` | How far the viewport is wider than 1440px; 0 up to 1440 (see Large screens) |
| `--text` | `17px` (+0.228% of `--lift`) | Body text size |
| `--head-h` | `69px` | Height of the wide header, for the full-screen hero |

Fonts are self-hosted through `@fontsource` packages (bundled into `/_astro/`); no Google Fonts
request at runtime (e2e test "fonts are self-hosted"). Section headings: `h2.display`,
`clamp(2.2rem, 4.6vw, 4.2rem)`; hero headline `clamp(3rem, 6.2vw, 5.9rem)` (display type capped
near 6rem up to 1440px). One layout breakpoint: `max-width: 860px` (CSS) / `min-width: 861px`
(motion); past 1440px only the large-screen growth below. One exception: the header's menu
switches at 900px (`width < 900px` shows "Meniu", range syntax), because its seven entries (Acasă, Sportivi,
Program, Calendar, Noutăți, Pentru părinți, Contact) and the club's name need about 830px on one
line; from 861 to 899px the pages are wide but the menu is still the "Meniu" drop-down.

Straight edges everywhere. Photos are treated as posters with an offset red plate behind.

## Large screens (wider than 1440px)

The approved design is drawn and tested up to 1440px. Supported up to 3840px wide (1920×1080,
2560×1440 with its ≈2560×1300 browser viewport, 3440×1440 ultrawide, 3840×2160 at 100%).
At 1440px and below every page is pixel-identical to the approved design: all growth is a share
of `--lift`, which is 0 there, or sits in `@media (min-width: 1441px)`.

- **Column and gutters** grow with `--lift` up to 2560px (column 1180 → 1482px), then stop: on
  ultrawide and 4K the content stays centred with wide margins; colour fields still run edge to
  edge.
- **Type**: the root font size grows by up to 15% (`html` in `tokens.css`) and `--text` with it,
  so every rem size (display caps, small text, rem paddings) scales together; body text reaches
  19.6px at 2560. Paragraph measures are in `ch`, so line lengths stay as approved (under ~75
  characters for body text; one footnote on the athletes wall and the calendar intro run
  ~85, as at 1440). The hero headline grows a little faster (`5.9rem + 2% of --lift`, ≈131px at
  2560) and is also held to `10.5vh` so its four lines fit a short window.
- **Hero height rule**: from 1441px the hero is the first screen. Its column (the element the
  scrub pins) has `min-height: 100svh - --head-h - the hero's paddings` and centres its content,
  so the page ends exactly at the window's bottom edge at scroll 0. The scrub pins that column
  for 70% of a viewport; while pinned it still fills the window, so the pin spacer below it is
  never seen as an empty field, and the next section's top reaches the bottom edge just as the
  pin ends. Hero height = window − header + 70% (pin). Without JS or with reduced motion there is
  no pin and the hero is exactly one screen. (Before this rule, at 2560×1300 the content was a
  598px column at the top and the 910px pin spacer below it showed as a blue half-screen.) The
  poster's height follows `66vh`, capped at `580px + 40% of --lift`.
- **Photos never upscale**: from 1441px a `PlatePhoto` frame is capped at the photo's own width
  (`--natural`, computed from `width`/`height` and the crop ratio). Hall strip photos are
  `clamp(200px, 38vh, 340px + 15% of --lift)` tall (≤ 508px; the local photos are 720px tall);
  whether the strip pins is still measured, so a strip that fits the wider column does not pin.
- **Short pages fill the window** (all sizes): `body` is a `min-height: 100svh` flex column, and
  the last child of `<main>` takes the spare height, so the footer sits on the window's bottom
  edge with no body background below it. A page taller than the window is unchanged. The closing
  CTA centres its content in the grown red field; on the 404 page the spare height is sky above
  the court (the drawing keeps its coordinates; the floor line stays on the footer), and from
  1441px the drawing is sized so header, text, court and footer make one screen.

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
The scene takes no input: no hint, no pointer or key handling, nothing focusable (Mario had the
tap-to-smash removed).

Hero lines may wrap below 860px (coach-editable motto must never clip). Under
`prefers-reduced-motion: reduce` the homepage does not even fetch `motion.ts` (a dynamic import in
`pages/index.astro`), and `initMotion()` also returns at once (`base.css` also turns off smooth
scrolling). GSAP is bundled from npm, never a CDN, in a chunk fetched only when motion runs.
**Late code:** when that chunk resolves more than 1000 ms after the page script started
(measured from the first contentful paint when the browser reports it; `lib/motion-budget.ts`, `introOnTime`), the load-time intros are skipped and the page stays as
rendered (it has painted its final state by then; an intro would snap back to the start): the
hero load here; on the inner pages place-roll, season-fill, feature-reveal, and poster-reveal,
sessions-settle or tile-roll (per tile) when their target is already in view. Scroll-driven moments are set up anyway. No other animation may be added without Mario's approval.

## Inner pages

Reference: `mockups/pagini/*.html` (approved). Mario rejected the first round of inner pages:
"you abuse those lines and the big blue text far too much… the same layout on every page".
His rules:

- Each page gets the layout natural to its content: calendar = month grids; athletes = wall of
  portrait tiles; news = photo-led magazine front; programme = week timetable; parents = calm
  reading page; contact = the form.
- Big uppercase display type once per page: the page title, plus a featured article title and
  the closing call-to-action headline. Section headings are modest: body face, bold, sentence
  case (`SectionHeading`, `.h2s`).
- No thick ink rules as section dividers; structure comes from colour fields, photos,
  alignment and whitespace.
- An empty state is never louder than real content.
- Motion: at most one small load or scroll moment per page (below); reduced motion shows the
  final state; every page works without JavaScript.
- No single-browser CSS: `object-view-box` becomes `object-fit: cover` + `object-position` from
  `Img.position`. `:has()`, `color-mix()` and `text-wrap: balance` only progressively, with a
  working fallback; `color-mix()` values are tokens.

### Shared pieces (`web/src/components/ui/`)

| Component | Use |
|---|---|
| `Photo` | One `<img>` with `width`/`height`/`alt`, `srcset` only when the image has one, `object-position` from `Img.position`; lazy by default, `loading="eager" priority` for the page's main photo; `decorative` gives `alt=""` + `data-decorative` (a thumbnail beside its own title) |
| `PlatePhoto` | `figure.plated` (red plate offset 12/14/16/18 px, optional crop `ratio`); the only red-plate implementation, also on the homepage (hero `class="poster"`, why, third hall photo, news); without `img` the default slot fills the frame (the athlete profile's `InitialTile`) |
| `InitialTile` | A coloured field with the initials (`initialsOf`, tone from `toneAt`: blue, deep, red) where a photo is missing; sizes `tile`, `poster`, `coach` |
| `PageHead` | The page title (`h1.display`); `white` (title left, lede right: athletes, news) or `blue` (a band, lede below: programme, parents, contact); slots `before` and default |
| `SectionHeading` | `h2.h2s` (or `h3`): modest section heading |
| `FilterBar` | Radios + `:has()` CSS from `filterBarCss()` and `filterCss()` (`lib/filter.ts`), works without JS; variants `chips`, `links`, `swatches`; effect `hide` or `dim` (no reflow; `DIM_OPACITY` 0.8 + grayscale, so dimmed text keeps 3:1 on every surface, `tokens.test.ts`); a count shows as `<sup>` and names the radio "Toate, 15"; optional count line announced by `initFilterStatus()` (`scripts/filter-status.ts`). Items carry `data-f`, counts `data-count-for`. Filter values (and the radio name) must be lowercase slugs: pages that take values from content (e.g. "U17") slugify them first; a non-slug value fails the build on purpose |
| `Tbc` | "**De confirmat de club:** …" with the hatched court-orange square (`.tbc` in `base.css`) |
| `Sample` | An example value the club has not confirmed (`provisional` data): hatched with `--court-hatch`, plus a hidden note for screen readers ("oră dată ca exemplu", "antrenor dat ca exemplu"). Never used for unknown data, which is `Tbc` |
| `ClosingCta` | Red closing section `#proba` "Vino la un antrenament de probă"; `display` big uppercase (programme, parents) or modest (athletes); `email` adds the club address |

Counts in Romanian go through `lib/ro.ts` (`countRo`, `feminineCountRo`).

**Dimming rule.** A filter that must not reflow the layout (calendar, news) dims the other
items instead of hiding them: `opacity: 0.8` (`DIM_OPACITY`) plus `grayscale(1)`. Owner's ruling:
dimmed items stay readable, so dimmed text keeps at least 3:1 on every surface it sits on;
`tokens.test.ts` computes it from the tokens. Grayscale is the cue that does not rely on
contrast. (An earlier 0.25 gave about 1.7:1; 0.7 failed 3:1 on played calendar rows.) Known
gap: on rows that are already neutral, grayscale changes nothing and the dim is faint.

### Each page's own parts

| Page | Components | Notes |
|---|---|---|
| `/sportivi/` | `athletes/Wall`, `athletes/Tile` | Portrait tiles (photo or `InitialTile`), category line, place mark; filter by category (none below two categories); empty state is one quiet mist line, without the lede's "Apasă pe un sportiv…" |
| `/sportivi/[slug]/` | `athletes/Ident` (mist band, poster on `PlatePhoto` offset 16, ratio 4/5, or a poster `InitialTile` in its slot), `Standing` (blue block with the rolling place), `Appearances` | Without articles the quiet block (tournaments, medals) starts from the left |
| `/calendar/` | `calendar/Month`, `Panel`, `SeasonList` | Month grids from Monday; home events `--red-tint` with `--red-deep` text, played `--blue-tint`; a home block also carries a 9px triangle in its top-right corner in its text colour (white on solid red, `--red-deep` on the pale tint), the cue that does not rely on colour, repeated on the legend's "acasă" swatch (owner, 2026-11-26); a block shared by several competitions links to the first and lists the others under "Tot în aceste zile:"; filter chips dim (no reflow); the plain list is split by start month (spring ≤ July) |
| `/noutati/` | `news/Front`, `FrontItem`, `Older` | Featured article on `PlatePhoto` (offset 16, ratio 3/2) or a blue tile, big display title; others `h3` mixed case; tiles cycle red, blue, mist from the featured tile's colour; filter `links` variant, dim |
| `/noutati/[slug]/` | `news/ArticleHead`, `ArticleAside`, `Gallery`, `Share`, `PrevNext` | Body photos on `PlatePhoto`; "Fotografii" and "Sportivi în articol" are modest headings; one row per tagged athlete listing all results; share row hidden until JS builds it |
| `/program/` | `program/Planner`, `GroupGuide` | Half-hour rows, overlapping sessions side by side in lanes, two empty hours collapse to a gap row; blocks of an hour or less one line; group picker with swatches (white and mist swatches get an edge); on phones days without the picked group hide; hour lines use `--blue-tint` (the mockup's ink at 16%, kept without a new token); without sessions one `Tbc` line, never an empty grid |
| `/pentru-parinti/` | `parents/Question`, `Coaches` | Reading column (68ch) beside a sticky list of the questions (at least 14rem, at most the window's height, scrolls inside); missing answers are `Tbc` lines; coaches by name only (roles not shipped) |
| `/contact/` | `contact/TrialForm`, `Place` | The form beside the hall's panel; states: errors (summary takes focus), e-mail opened, sent; the adult path ("Eu") hides the child's age |

### Inner pages on large and middle screens

The large-screen rules above apply to the inner pages through the shared tokens (`--col`,
`--gut`, rem sizes) and `PlatePhoto`; nothing else grows on its own past 1440px. Short pages
(a profile, an empty news page) fill the window to the footer. The band just above the
breakpoint (861–1100px) is where two-column pages squeeze: a side column keeps a floor there
(the article's aside `minmax(220px, 1fr)`, the parents' question list `minmax(14rem, 1fr)`)
and the text column gives way first. The inner-pages sweep (`testing.md`) checks 1440, 1024,
861, 860 and 380 for this reason.

### Motion: one moment per page (`web/src/scripts/page-motion.ts`, `page-moments.ts`)

A page calls `initPageMotion(moment)` once; it returns at once under reduced motion or when the
moment's targets are not on the page, and only otherwise imports `page-moments.ts` (with GSAP). Rolling
numerals share `digitBands()` (`scripts/roll.ts`) with the homepage roster.

| Page | Moment | Behaviour | Source |
|---|---|---|---|
| `/sportivi/` | `tile-roll` | Place digits roll when a tile enters (once) | `sportivi-lista.html` |
| `/sportivi/[slug]/` | `place-roll` | The place numeral rolls on load | `sportiv-fisa.html` |
| `/calendar/` | `season-fill` | Event blocks fill in date order on load | `calendar.html` |
| `/noutati/` | `feature-reveal` | Featured plate rises, photo unclips on load | `noutati-lista.html` |
| `/noutati/[slug]/` | `cover-recrop` | Cover scales to 1.16 while scrolling away | `articol.html` |
| `/program/` | `sessions-settle` | Blocks settle into slots once, wide only | `program.html` |
| `/pentru-parinti/`, `/contact/` | `poster-reveal` | The `PlatePhoto` with `class="reveal"`: plate grows (`scaleY` from 0), photo unclips (`inset(100% 0 0 0)`), once at `top 85%` | `pentru-parinti.html`, `contact.html` |

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
