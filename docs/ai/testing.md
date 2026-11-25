# Testing

Rule (Mario, 2026-11-25): run only the tests a change affects; run the full suite once before
merge or push; keep e2e fast.

## Layers

| Layer | Where | Runs with |
|---|---|---|
| Web unit (Vitest) | `web/tests/unit/` (one file per `src/lib` module with logic: `article`, `athletes`, `body`, `calendar`, `content` (also covers `sanity.ts` mapping), `dates`, `filter`, `home`, `nav`, `news`, `parents`, `program`, `rally`, `ro`, `tiles`, `trial`; `tokens` for contrast and photo weight) | `pnpm -C web test` |
| Studio unit (Vitest) | `studio/tests/schema.test.ts` (model + seed, no network) | `pnpm --filter studio test` |
| E2E (Playwright, Chrome at `/usr/bin/google-chrome`) | `web/tests/e2e/*.spec.ts` against built previews | `pnpm e2e` |
| Static checks | `pnpm -C web check` (astro check), `pnpm --filter studio typecheck`, `pnpm --filter studio validate` | |

Unit tests cover pure logic and data; e2e covers what only a browser shows (layout, motion,
no-JS, focus, built output). Put a rule in `web/src/lib/` and unit-test it there when possible.

## Commands and timings

Measured on the dev machine (16 cores, 8 workers); full-suite rows from the plan 2a full run
(2026-11-26), single-spec rows from the test-speed work on 2026-11-25:

| Command | What | Time |
|---|---|---|
| `pnpm test` | all unit tests, both workspaces (334 web + 14 studio) | ~3 s |
| `pnpm e2e` | 198 tests + 4 setup builds | 37.0 s cold (`rm -rf web/dist-e2e` first, plan 2a fix wave); budget 45 s |
| `pnpm e2e -- shell.spec.ts` | one spec, builds `home` only | 5.4 s cold, 4.2 s warm |
| `pnpm e2e -- -g "single photo"` | by title; builds `sparse` only | not measured |
| `pnpm test:changed` | `vitest run --changed dev` in both workspaces | ≤ the full unit run |
| `pnpm e2e:changed` | specs mapped from the diff against `dev` | ~24 s when motion/scroll specs are selected |

`pnpm e2e:changed -- --base <ref>` compares against another ref; other arguments go to
Playwright. `web/scripts/playwright.mjs` drops the `--` that pnpm forwards (before it, arguments
after `--` were silently ignored and the whole suite ran). Two Playwright runs at once in the
same checkout collide on ports 4329–4332.

`test:changed` follows the module graph (a lib edit selects the unit tests importing it; an
`.astro`-only edit reports no affected tests). Until this branch is merged into `dev`, both
changed-only commands select everything, because the whole site is new relative to `dev`.

## E2E fixtures and servers

`web/tests/e2e/servers.ts` lists four servers; each builds one fixture with `BUILD_TODAY=2026-11-25`
and a dummy `SANITY_READ_TOKEN`.

| Server (port) | Fixture | Covers |
|---|---|---|
| `home` (4329) | `home.json` | The real content (dev default; must match the Studio seed): homepage; every inner page in its launch state (three ranked athletes, no birth years; the 2026 calendar with categories; three posts without body; no sessions, so the programme's `Tbc` line; coaches by name; no club answers, so the parents' and contact `Tbc` lines) |
| `quiet-season` (4330) | `quiet-season.json` | Athletes without rankings (no places, no source line, equal rows); the fictional `Zet Exemplu-Ana` with photo, birth year (category from it) and an article result (medal row); season over (three played, no countdown) and the fictional "Turneu de test …" (a long title, for the list rows above 861px) sharing days with another event; 15 posts, three with a cover (the full news front, four older), one with a body (with a photo in the text), a gallery and results; the mockup's sample week with `provisional` hours and the example coach `Antrenor Exemplu` (hatched values and the page note); every parents' answer, the programme note and the contact details (test text, never in `home.json`) |
| `sparse` (4331) | `sparse.json` | No athlete may be shown (only one, without consent): roster and links omitted, the athletes wall's empty state, section order; no competition at all (the calendar's one quiet line); a 20-character hero line wrapping at 380px; a single hall photo (never pins, fits its column with and without JS); no post with a cover (news: featured blue tile) |
| `mixed-strip` (4332) | `mixed-strip.json` | Landscape + portrait strip (travels at 390/600, stays put at 1440, pins/unpins on resize); one ranked athlete; a non-consenting athlete holding place 1 |

A test runs on `home` unless tagged: `test.describe('…', on('sparse'), () => …)`.

## Server selection and build reuse

- `web/playwright.config.ts` creates one project per server (selected by tag; `home` takes
  untagged tests) with that server's `baseURL`, each depending on a setup project
  `serve <name>` (`serve.setup.ts`). Playwright runs a setup only if its project has selected
  tests, so a single spec or `-g` builds only the servers it needs. `build-output.spec.ts` has
  its own project depending on all four.
- `web/tests/e2e/site.ts` builds with `astro build --outDir dist-e2e/<name>` unless
  `dist-e2e/.state/<name>.stamp` holds the current input hash (sha256 over `src/` minus other
  fixtures, `public/`, `astro.config.mjs`, `package.json`, `tsconfig.json`, `pnpm-lock.yaml` and
  the build env). Editing one fixture rebuilds only that server; any source edit rebuilds all
  four (~2 s in parallel).
- Previews start detached with a pid file; `global-teardown.ts` stops them, also after Ctrl-C.
- `fullyParallel: true`. The two 390px scroll scans take ~11 s each; with the inner pages the
  wall time is set by the total load on 8 workers.

## Source to spec mapping (`web/scripts/e2e-changed.mjs`, first match wins)

| Changed path (under `web/`) | Specs |
|---|---|
| `src/pages/404.astro`, `src/components/notfound/**`, `src/lib/rally/**`, `src/scripts/rally.ts` | not-found, build-output |
| `src/components/ui/**` (shared by the homepage and every inner page) | all |
| `src/pages/sportivi/**`, `src/components/athletes/**` | athletes, build-output, + inner |
| `src/pages/calendar/**`, `src/components/calendar/**` | calendar, home, build-output, + inner |
| `src/pages/noutati/index.astro`, `src/components/news/**` | news, article, + inner |
| `src/pages/noutati/[slug].astro`, `src/scripts/{lightbox,share}.ts` | article, + inner |
| `src/pages/program/**`, `src/components/program/**` | program, + inner |
| `src/pages/pentru-parinti/**`, `src/components/parents/**` | parents, + inner |
| `src/pages/contact/**`, `src/components/contact/**`, `src/scripts/trial-form.ts` | contact, + inner |
| `src/scripts/**` | motion, scroll-scan, home, athletes, calendar, news, article, program, parents, contact, build-output, + inner |
| `src/components/home/{Hero,CalendarBand,News,TrialCta}.astro` | home, motion, scroll-scan, shell, build-output |
| `src/components/home/**` | home, motion, scroll-scan, build-output |
| `src/fixtures/{sparse,mixed-strip,quiet-season}.json` | home, motion, scroll-scan, athletes, calendar, news, article, program, parents, contact, not-found, build-output, + inner |
| `tests/e2e/<name>.spec.ts` | that spec |
| `tests/unit/**`, `vitest.config.ts`, `.env.example`, `*.md` | none |
| everything else (`src/lib/**`, `Site*.astro`, layouts, other pages, styles, `public/`, `src/fixtures/home.json`, e2e helpers and setup, build and runner config) | all |

"+ inner" is `inner-pages` (the sweep, below) and `shell` (every inner page at 380 with sized, described images and one
display title; content without JavaScript). Outside `web/`: `studio/`, `docs/`, `deploy/`,
`scripts/`, `.superpowers/`, root `*.md` select no spec; the lockfile and workspace files select all.

When you add a spec or a new source folder, update this table in the script's header and rules.

## Risks the key tests guard

- Consent: a non-consenting athlete with place 1 is absent from the HTML (`home.spec`,
  mixed-strip); empty roster omitted with its links (sparse); unit filters and the Studio filter.
- Read token never in the built output of any server; no HTML comment in any built page; the
  trial form's `data-who` fallback never shares a CSS selector list with `:has()` (`build-output.spec`).
- GSAP is not requested under reduced motion (homepage and `/noutati/`, `motion.spec`); a fault in
  the calendar's today logic leaves the panel and motion working (`calendar.spec`).
- Countdown follows the visitor's clock, not the build date (clock overridden), and disappears
  after the event; season over shows three played events.
- Photo strip reaches its last photo; a single photo never pins, with and without JS; mixed
  ratios travel and pin/unpin on resize; a photo arriving mid-pin does not re-lay the column.
- Hero intro does not replay across 860px; scrub and heading drift follow a resize; wrapped
  hero lines still scrub.
- Text boxes of hero lines and headings stay on screen while scrolling at 390px
  (`scroll-scan.spec`, 17 positions per case).
- Reduced motion shows final states; all content visible without JS; no page errors while
  scrolling (home, sparse, mixed-strip); motion bundled, not from a CDN.
- 404 page (`not-found.spec`, on `home`): an unknown address answers 404 with the page; the
  shuttle is seen on both sides of the net (the rally runs) with no page errors; reduced motion
  and no-JS show the still frame with the shuttle in the 0; no hint text and nothing focusable in
  the scene; no overflow at 380 and 1440.
  `rally.test.ts` plays two minutes per layout: the racket head meets the shuttle at every hit,
  net faults happen but stay rare.
- Large screens (home fixture, no extra build): at 2560×1300 the hero content is balanced in the
  first screen (space below ≤ 1.6× above), the hero is at most window + pin, one screen without
  JS or with reduced motion, and the scrub ends before `#why-h` shows (`motion.spec`); no
  overflow at 2560/3440 and a body line under 80 characters (`home.spec`); the 404 page is one
  screen with the footer on the bottom edge at 1920/2560/3440 (`not-found.spec`); a short
  profile at 2560×1600 fills to the footer (`athletes.spec`).
- Shell: Romanian nav and footer, no overflow at several widths, self-hosted fonts, narrow menu
  with and without JS, the seven menu entries on one line with nothing wrapped at 900/1024/1440/2560
  and "Meniu" at 861/899, focus ring colour equals text colour; the menu marks a page's section
  (`aria-current="page"` on the page itself, `"true"` under it); the footer links the parents'
  page and Facebook.
- Inner pages (`inner-pages.spec`): see "The inner-pages sweep" below. Per-page specs
  (`athletes`, `calendar`, `news`, `article`, `program`, `parents`, `contact`) cover each page's
  behaviour: consent (no tile, no profile route for a non-consenting athlete), filters with and
  without JS, the calendar following the visitor's date, the trial form's paths and states, the
  lightbox and share row, hatched example hours, each page's motion moment and reduced motion.
- Unit: date formatting and Bucharest "today", Romanian plurals, roster order/layout, calendar
  split, fixture shape and parity with the seed, photo sizes and weight, WCAG token contrast.

## The inner-pages sweep (`web/tests/e2e/inner-pages.spec.ts`)

Every inner route (`ROUTES`, one list per server: `home` has the real content, `quiet-season`
fills what `home` leaves empty) at 1440, 1024, 861, 860 and 380px wide (900 high), with reduced
motion, checked at the top and scrolled to the bottom. Faults, one line each:

- the page scrolls sideways;
- a line of text off screen (except inside an element that scrolls sideways on purpose);
- text on other text, or text on a picture in `main`;
- a sticky element over the footer, or taller than the window (it would hide its own end);
- a squeezed column: a grid or flex item narrower than 120px whose text wraps to three lines or
  more.

Text boxes are taken per line, trimmed to the line height (tight display type) and to any
clipping box (ellipsis labels); screen-reader-only and `aria-hidden` text is skipped. On the
first run with the last two checks (plan 2a, Task 12) nothing was flagged; both were proved to
fire by loosening their thresholds (the calendar panel and the parents' question list are the
sticky elements; month grids and news tiles the nearest grid items).

**Adding a page to the sweep:** add its route to both lists in `ROUTES` (with a slug that exists
in each fixture), and add `...INNER` to its rule in `web/scripts/e2e-changed.mjs` (and to the
table above). Fix what it finds in the page that owns the layout, not in the sweep.

Large screens are checked outside the sweep, on the homepage, the 404 page and one profile
(2560×1300, 2560×1600, 1920×1080, 3440×1440; see the risks above).

## Adding a test without slowing the suite

1. Prefer a unit test: move the rule into `web/src/lib/` if it is in a component.
2. For e2e, reuse a fixture: add the case's data to the fixture that already covers that area
   (check the table above) rather than adding a server. A new fixture is one more build and
   preview on every full run; add one only when the case contradicts every existing fixture.
3. If you change a fixture, keep the existing assertions true; `home.json` must stay in parity
   with `studio/seed/seed.ndjson`.
4. Wait on state, not time (e.g. wait until elements stop moving), and tag the test with the
   server it needs so selection stays precise.
5. Run just the new test (`pnpm e2e -- -g "<title>"`), then `pnpm e2e:changed`.
