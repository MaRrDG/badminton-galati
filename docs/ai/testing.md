# Testing

Rule (Mario, 2026-11-25): run only the tests a change affects; run the full suite once before
merge or push; keep e2e fast.

## Layers

| Layer | Where | Runs with |
|---|---|---|
| Web unit (Vitest) | `web/tests/unit/` (`home`, `dates`, `content`, `tokens`) | `pnpm -C web test` |
| Studio unit (Vitest) | `studio/tests/schema.test.ts` (model + seed, no network) | `pnpm --filter studio test` |
| E2E (Playwright, Chrome at `/usr/bin/google-chrome`) | `web/tests/e2e/*.spec.ts` against built previews | `pnpm e2e` |
| Static checks | `pnpm -C web check` (astro check), `pnpm --filter studio typecheck`, `pnpm --filter studio validate` | |

Unit tests cover pure logic and data; e2e covers what only a browser shows (layout, motion,
no-JS, focus, built output). Put a rule in `web/src/lib/` and unit-test it there when possible.

## Commands and timings

Measured on the dev machine (16 cores, 8 workers), from the test-speed work on 2026-11-25:

| Command | What | Time |
|---|---|---|
| `pnpm test` | all unit tests, both workspaces (77 web + 14 studio) | ~3 s |
| `pnpm e2e` | 50 tests + 4 setup builds | 22.9 s cold, 22.7 s warm |
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
| `home` (4329) | `home.json` | The real homepage content (dev default; must match the Studio seed) |
| `quiet-season` (4330) | `quiet-season.json` | Athletes without rankings (no places, no source line, equal rows); season over (three played, no countdown) |
| `sparse` (4331) | `sparse.json` | No athlete may be shown (only one, without consent): roster and links omitted, section order; a 20-character hero line wrapping at 380px; a single hall photo (never pins, fits its column with and without JS) |
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
- `fullyParallel: true`. The wall time is set by the two 390px scroll scans (~11 s each).

## Source to spec mapping (`web/scripts/e2e-changed.mjs`, first match wins)

| Changed path (under `web/`) | Specs |
|---|---|
| `src/scripts/**` | motion, scroll-scan, home |
| `src/components/home/{Hero,CalendarBand,News,TrialCta}.astro` | home, motion, scroll-scan, shell |
| `src/components/home/**` | home, motion, scroll-scan |
| `src/components/Site*.astro` | shell, home |
| `src/lib/**` | home, motion, build-output |
| `src/fixtures/home.json` | all |
| `src/fixtures/{sparse,mixed-strip}.json` | home, motion, scroll-scan |
| `src/fixtures/quiet-season.json` | home |
| `tests/e2e/**` | Playwright's own `--only-changed` (spec + importers) |
| `tests/unit/**`, `scripts/e2e-changed.mjs` | none |
| other `src/`, `public/`, `astro.config.mjs`, `package.json`, `tsconfig.json`, `playwright.config.ts`, `scripts/playwright.mjs` | all |

When you add a spec or a new source folder, update this table in the script's header and rules.

## Risks the key tests guard

- Consent: a non-consenting athlete with place 1 is absent from the HTML (`home.spec`,
  mixed-strip); empty roster omitted with its links (sparse); unit filters and the Studio filter.
- Read token never in the built output of any server (`build-output.spec`).
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
- Shell: Romanian nav and footer, no overflow at several widths, self-hosted fonts, narrow menu
  with and without JS, focus ring colour equals text colour.
- Unit: date formatting and Bucharest "today", Romanian plurals, roster order/layout, calendar
  split, fixture shape and parity with the seed, photo sizes and weight, WCAG token contrast.

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
