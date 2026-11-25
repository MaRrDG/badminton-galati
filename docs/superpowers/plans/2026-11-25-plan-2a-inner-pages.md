# Plan 2a: Inner Pages on Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The eight inner pages Mario approved as mockups (`/sportivi/`, `/sportivi/[slug]/`, `/calendar/`, `/noutati/`, `/noutati/[slug]/`, `/program/`, `/pentru-parinti/`, `/contact/`) built as real Astro pages fed by the content layer from fixtures, with shared layout pieces and tests.

**Architecture:** The content layer grows from "home data" to `SiteData` (one parse, one consent filter, memoized per build); `getHomeData()` becomes a view of it and keeps its caps. Every page has a getter in `content.ts` that applies a pure view function from a per-page module in `web/src/lib/` (unit-tested with the spec's real values); components only render. Shared pieces (`Photo`, `PlatePhoto`, `InitialTile`, `PageHead`, `SectionHeading`, `FilterBar`, `Tbc`, `ClosingCta`) live in `web/src/components/ui/`; the homepage's four red-plate implementations collapse into `PlatePhoto`. Filters work without JavaScript (radio inputs + `:has()`); scripts only add announcements, the calendar panel, the lightbox, the form and one motion moment per page.

**Tech Stack:** As plan 1 (Astro 7, TypeScript strict, GSAP 3 + ScrollTrigger bundled from npm, Vitest 5, Playwright 1.65 on `/usr/bin/google-chrome`, pnpm only). New dependency: `@portabletext/to-html` (article bodies). Read the current docs of Astro 7 (`getStaticPaths`) and `@portabletext/to-html` before using them from memory.

**Spec:** `docs/superpowers/specs/2026-11-25-site-siderurgistul-design.md`. Visual reference: `mockups/pagini/{sportivi-lista,sportiv-fisa,calendar,noutati-lista,articol,program,pentru-parinti,contact}.html` (approved by Mario on 2026-11-25). Open each in a browser before its task. Elements with class `note`, `mock` or `states` are sketch annotations, not product, except the `states` section of `contact.html`, which specifies the form's error and success states. The decisions for this stage (Mario, 2026-11-25) are copied into Global Constraints below.

This is plan 2a. Plan 2b (`2026-11-25-plan-2b-live-content-and-form.md`) adds the Studio fields, the Sanity queries, responsive Sanity images, the `/api/proba` endpoint and the server-side publish pipeline. Not in 2a or 2b: Despre club, Antrenori as its own page, Documente, Proiecte, Galerie, Rezultate, Pentru sponsori, migration of the 15 old articles, redirects, SEO/OG, FRB sync, launch.

## Global Constraints

- All plan 1 rules hold (see `CLAUDE.md`): Romanian copy with comma-below diacritics (ș ț, never ş ţ); no English on the site; tone invites, never boasts; every `<img>` has `width` and `height`; text on red fields uses `--red-field`; forbidden patterns (cream background, rounded shadow cards, dashed pills, all-caps eyebrows, 01/02/03 markers, arrow-suffixed buttons, one accented word in a headline, charts or figures without real data, flip-card widgets, tables with empty cells, staircase layouts, fade-in per section).
- **Consent.** An athlete without `consent === true` has no tile, no profile page (the route is not generated), is not listed on articles, and counts nowhere (counts, filter counts, medals). The filter runs in the content layer before any cap, order or count.
- **No invented facts.** Unknown data renders the designed "de confirmat" state (`Tbc` component: hatched square, **De confirmat de club:** …) or is omitted; never placeholder prose presented as fact. Agent-written mockup copy that needs the club's confirmation is listed in Appendix A; it ships as written there unless the appendix says "not shipped".
- **Test fixtures never attach invented facts to real people.** Test-only data (birth years, photos, results, roles, group membership, coach assignments) goes on fictional names (`Fără-Acord Zamfira`, `Zet Exemplu-Ana`, `Antrenor Exemplu`). `home.json` holds only real facts and stays in parity with `studio/seed/seed.ndjson`.
- **Owner's design rules for inner pages** (Mario, after rejecting the first round: "you abuse those lines and the big blue text far too much… the same layout on every page"):
  - Each page gets the layout natural to its content: calendar = month grids; athletes = wall of portrait tiles; news = photo-led magazine front; programme = week timetable; parents = calm reading page; contact = the form.
  - Big uppercase display type once per page: the page title, plus a featured article title and the closing call-to-action headline. Section headings are modest: body face, bold, sentence case (`SectionHeading`).
  - No thick ink rules as section dividers; structure from colour fields, photos, alignment, whitespace.
  - An empty state is never louder than real content.
  - Motion on inner pages: at most one small load or scroll moment per page, as in the mockups (table in Task 2); reduced motion shows the final state; every page works without JavaScript.
- No single-browser CSS: `object-view-box` (used in `sportivi-lista.html` sample tiles) is replaced by `object-fit: cover` + `object-position` from `Img.position`. `:has()`, `color-mix()` and `text-wrap: balance` are allowed only as in plan 1 (progressive, with a working fallback); `color-mix()` values become tokens.
- Tests stay fast (Mario): reuse the four existing fixture servers; no new fixture build. Each task runs only its named unit file and e2e spec; the full suites run once in Task 12; the cold `pnpm e2e` stays under 45 s.
- Breakpoint as plan 1: `max-width: 860px` / `min-width: 861px`. Content column `--col`. Values live in `tokens.css`.
- Facebook: `https://www.facebook.com/badmintongalati`. Club email: `siderurgistul@badmintongalati.ro`.
- Commits: `type(scope): subject`, repository identity, no `Co-Authored-By`, session links or AI attribution. The repo is public: no secrets, no server addresses. Work on a branch merged into `dev`; never push.

## Review Focus

1. **An athlete without consent who is tagged in an article, holds place 1, or would be counted.** Expected: no tile, no `/sportivi/<slug>/` file at all, absent from article tags, counts and filter counts, absent from every built HTML file. Pinned in Task 1 (`parseSiteData` drops tags), Task 3 (wall and counts on `mixed-strip`), Task 4 (no route, 404), Task 7 (article tags), and the `build-output` scan in Task 4.
2. **A competition crossing a week or month boundary, or two competitions on overlapping days.** Expected: the event block splits at Sunday and at month end and never spills into the wrong cell; overlapping events share one block that names both. Pinned in Task 5 (`monthCells` unit tests).
3. **The launch state: nothing the club owes is known** (no sessions, coaches without roles, no parents' answers, no phone, posts without bodies or photos, no consented athlete, an empty calendar). Expected: quiet "de confirmat" lines or omission, never an empty grid, empty heading or invented text, and never louder than the real content next to it. Pinned in Tasks 3, 5, 6, 8, 9, 10 on `home` and `sparse`.
4. **Keyboard and no-JS use of the interactive parts** (filters, calendar event selection, gallery lightbox, the trial form). Expected: every filter is a radio group operable with arrow keys and works without JS; a calendar event is reachable by Tab and selectable with Enter; the lightbox traps focus, pages with arrows, closes with Escape and returns focus; form errors are announced and linked to their fields. Pinned in Tasks 3, 5, 7, 10.
5. **Long names and long titles on narrow screens** (`Bordeianu Nectarie-Ioan` as a display title at 380px, long article titles in display type). Expected: no horizontal overflow and no clipped text on any inner page at 380px. Pinned in Task 4 (profile title) and Task 11 (sweep over every inner route).

---

## File Structure

```
web/src/lib/
  types.ts          + Session, Coach, Result, BodyBlock, ClubInfo, SiteData; Group, Athlete, Competition, Post, Img extended
  content.ts        getSiteData() (memoized), parseSiteData(), getHomeData() (view), one getter per page
  sanity.ts         toHomeData() returns SiteData with new fields defaulted (interim until plan 2b)
  ro.ts             Romanian counts and number words (moved out of home.ts)
  tiles.ts          initialsOf(), toneAt()
  filter.ts         filterCss()
  nav.ts            isCurrent()
  athletes.ts       categories, wall, profile, medals
  calendar.ts       month cells, season, filters, intro
  news.ts           front layout, kind counts, neighbours, mosaic, tags
  body.ts           Portable Text -> HTML
  program.ts        week planner, schedule labels, group tones
  trial.ts          trial form validation, phone format, mailto (shared with the plan 2b endpoint)
web/src/components/ui/      Photo, PlatePhoto, InitialTile, PageHead, SectionHeading, FilterBar, Tbc, ClosingCta
web/src/components/{athletes,calendar,news,program,parents,contact}/   page sections
web/src/pages/sportivi/{index,[slug]}.astro, calendar/index.astro, noutati/{index,[slug]}.astro,
             program/index.astro, pentru-parinti/index.astro, contact/index.astro
web/src/scripts/  roll.ts, page-motion.ts, filter-status.ts, countdown.ts, calendar-panel.ts,
                  lightbox.ts, share.ts, trial-form.ts
web/tests/unit/   ro, tiles, filter, nav, athletes, calendar, news, body, program, trial (.test.ts)
web/tests/e2e/    athletes, calendar, news, article, program, parents, contact (.spec.ts)
```

Fixture roles (no new server; each page task extends the fixture its tests need):

| Server | Fixture | Inner-page cases it carries |
|---|---|---|
| `home` | `home.json` (real facts only) | Launch state: 3 consented athletes without photos, real calendar with categories, 3 posts without bodies, groups without sessions or coaches, 3 coaches by name only, no club answers |
| `quiet-season` | `quiet-season.json` | Rich test content on fictional names: timetable sessions, coaches with roles, club answers, 12+ posts (old real titles plus one fictional post with body, gallery, results and a linked competition), a fictional athlete with photo, birth year, group and a medal |
| `sparse` | `sparse.json` | Empty Studio-like state: no visible athlete, no competitions, posts without covers |
| `mixed-strip` | `mixed-strip.json` | Consent: `Fără-Acord Zamfira` (no consent, place 1) tagged in a post with a result |

---

### Task 1: Site-wide content layer

**Files:**
- Modify: `web/src/lib/types.ts`, `web/src/lib/content.ts`, `web/src/lib/sanity.ts`, `web/src/lib/home.ts` (only `latestPosts` stays as is), `web/src/fixtures/home.json`, `.gitignore`
- Test: `web/tests/unit/content.test.ts`

**Interfaces:**
- Produces in `types.ts` (existing types extended; new fields optional in fixture JSON, normalized by the parser):

```ts
export type Img = { url: string; width: number; height: number; alt: string; position?: string /* CSS object-position */; srcset?: string /* plan 2b */ };
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const; // ISO weekday, 1 = luni
export type Session = { day: (typeof WEEKDAYS)[number]; start: string; end: string }; // 'HH:MM', 24 h
export type Group = { id: string; slug: string; name: string; audience: string; track: Track; sessions: Session[]; coachId?: string;
  schedule?: string /* plan 1 field, kept until Task 8 moves the homepage to sessions, then removed */ };
export type Coach = { id: string; name: string; role?: string; photo?: Img };
export type Athlete = { /* plan 1 fields */ birthYear?: number; groupId?: string };
export const COMPETITION_CATEGORIES = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U23', 'Seniori', 'Echipe'] as const;
export type CompetitionCategory = (typeof COMPETITION_CATEGORIES)[number];
export type Competition = { id: string; title: string; city: string; start: string; end: string; home: boolean;
  categories: CompetitionCategory[]; resultsUrl?: string; postSlug?: string /* derived, never read from the source */ };
export type Result = { athleteId: string; discipline?: Discipline; result: string };
export type Span = { _type: 'span'; _key: string; text: string; marks?: string[] };
export type BodyBlock =
  | { _type: 'block'; _key: string; style?: 'normal' | 'h2' | 'h3' | 'blockquote'; listItem?: 'bullet' | 'number'; level?: number;
      children: Span[]; markDefs?: { _key: string; _type: 'link'; href: string }[] }
  | { _type: 'photo'; _key: string; photo: Img };
export type Post = { title: string; slug: string; kind: PostKind; date: string; cover?: Img;
  competitionId?: string; body: BodyBlock[]; gallery: Img[]; results: Result[] };
export type ClubInfo = {
  parents: { age?: string; equipment?: string; cost?: string; firstWeeks?: string; registration?: string };
  programNote?: string;
  contact: { phone?: string; directions?: string; replyDays?: number };
};
export type SiteData = HomeData & { coaches: Coach[]; info: ClubInfo }; // HomeData keeps its plan 1 keys
```

- Produces in `content.ts`:
  - `parseSiteData(value: unknown, source: string): SiteData`: plan 1 shape checks plus the new fields (fail with the field path; `Img.position` and `Img.srcset` are optional strings); defaults `[]` for `sessions`, `categories`, `body`, `gallery`, `results`, `coaches`, `{ parents: {}, contact: {} }` for `info`; keeps only consented athletes; drops `results` whose `athleteId` is not a visible athlete; sorts competitions by start and posts newest first (all of them); sets `competition.postSlug` from the newest post whose `competitionId` matches (any incoming `postSlug` is ignored); fails on a duplicate athlete, post or group slug, a `competitionId` that names no competition, a session with `end <= start` or a malformed time.
  - `parseHomeData(value, source): HomeData` = `homeView(parseSiteData(value, source))` (kept for plan 1 callers and tests).
  - `homeView(site: SiteData): HomeData` (posts capped by `latestPosts`).
  - `getSiteData(): Promise<SiteData>`, memoized per `CONTENT_SOURCE|SANITY_PROJECT_ID|SANITY_DATASET|HOME_FIXTURE` (a changed env loads again). `HOME_FIXTURE` keeps its name and now selects the whole-site fixture.
  - `getHomeData(): Promise<HomeData>` = `homeView(await getSiteData())`.
  - Page getters are added by the page tasks, each `async () => <view>(await getSiteData(), buildToday())`.
- `sanity.ts`: `toHomeData(raw): SiteData` (same query plus the group `_id`; group `id` = `_id`, `slug` = the name without diacritics, lowercased, non-alphanumerics as `-`, the Studio's `slugifyRo` rule, because Sanity groups have no slug until plan 2b; other new fields take their defaults, `coaches: []`). Until plan 2b the Sanity source serves only the homepage subset (3 posts); deploys stay on fixtures.
- `home.json` gains real facts only: group `id` = the seed `_id` (`group-initiere` …) and `slug` (`initiere`, `performanta`, `elite`, `amatori-copii`, `amatori-adulti`); competition `categories` read from the titles (`CR U9 și CR Seniori` → `["U9","Seniori"]`, `CR Echipe Seniori și Cupa U15` → `["U15","Seniori","Echipe"]`, `CN Echipe U19` → `["U19","Echipe"]`, and so on for all 12; always in `COMPETITION_CATEGORIES` order); `coaches` `[{ "id": "coach-dorel-badiu", "name": "Dorel Badiu" }, { "id": "coach-iulian-calin", "name": "Iulian Călin" }, { "id": "coach-adrian-panfil", "name": "Adrian Panfil" }]` (names from the spec; no roles, see Appendix A).

- [ ] **Step 1: Write the failing tests** in `content.test.ts`:

```ts
test('the site keeps every post; the homepage still gets the newest three', async () => {
  process.env.CONTENT_SOURCE = 'fixtures'; process.env.HOME_FIXTURE = 'home.json';
  const site = await getSiteData();
  expect(site.posts).toHaveLength(3); expect(site.coaches.map(c => c.name)).toEqual(['Dorel Badiu', 'Iulian Călin', 'Adrian Panfil']);
  expect(site.info).toEqual({ parents: {}, contact: {} });
  expect(site.competitions.find(c => c.title === 'CR Echipe Seniori și Cupa U15')!.categories).toEqual(['U15', 'Seniori', 'Echipe']);
  expect((await getHomeData()).posts).toHaveLength(3);
});
test('a tag naming an athlete without consent is dropped', () => {
  const s = parseSiteData({ ...homeFixture, athletes: [...homeFixture.athletes, hidden],
    posts: [{ ...homeFixture.posts[0], results: [{ athleteId: hidden.id, result: 'aur' }, { athleteId: 'athlete-nistor-cristian-ionut', result: 'locul 5' }] }] }, 't');
  expect(s.posts[0].results.map(r => r.athleteId)).toEqual(['athlete-nistor-cristian-ionut']);
});
test('a competition gets the slug of the newest post linked to it', () => { /* two posts → competition-2026-03-27-cr-u15-cr-u23; postSlug is the newer one */ });
test('a fixture postSlug on a competition is ignored', () => { /* postSlug: "x" in, no post links it → undefined */ });
for (const [name, patch, path] of [
  ['duplicate athlete slug', /* two athletes slug "a" */, 'athletes[1].slug'],
  ['unknown competitionId', /* post.competitionId "nope" */, 'posts[0].competitionId'],
  ['session ending before it starts', /* { day: 1, start: "18:30", end: "17:00" } */, 'groups[0].sessions[0]'],
  ['time written 9:00', /* start "9:00" */, 'groups[0].sessions[0].start'],
] as const) test(`refuses ${name}`, () => expect(() => parseSiteData(patch, 't')).toThrow(path));
test('getSiteData loads once per source and again when HOME_FIXTURE changes', async () => { /* same promise twice; other fixture → other data */ });
```

- [ ] **Step 2: Run, expect failure.** `pnpm -C web test -- content` → FAIL (`getSiteData` not exported).
- [ ] **Step 3: Extend `types.ts`, implement `parseSiteData`, `homeView`, `getSiteData`, adapt `toHomeData`**, extend `home.json` as above. Plan 1 tests in this file stay green (seed parity compares only plan 1 fields).
- [ ] **Step 4: Add `.claude/` to the root `.gitignore`** (agent worktrees).
- [ ] **Step 5: Run.** `pnpm -C web test -- content` → pass. `pnpm -C web check` → 0 errors. `pnpm e2e -- home.spec.ts` → pass (homepage unchanged).
- [ ] **Step 6: Commit** `feat(web): site-wide content layer with per-page data`.

---

### Task 2: Shared pieces, tokens and the owner's design rules

**Files:**
- Create: `web/src/lib/ro.ts`, `web/src/lib/tiles.ts`, `web/src/lib/filter.ts`, `web/src/components/ui/{Photo,PlatePhoto,InitialTile,PageHead,SectionHeading,FilterBar,Tbc,ClosingCta}.astro`, `web/src/scripts/roll.ts`, `web/src/scripts/page-motion.ts`, `web/src/scripts/filter-status.ts`
- Modify: `web/src/lib/home.ts` (plurals and number words move to `ro.ts`), `web/src/styles/tokens.css`, `web/src/styles/base.css` (`.h2s`, `.tbc`), `web/src/components/home/{Hero,Why,Hall,News}.astro`, `web/src/scripts/motion.ts` (uses `roll.ts`), `docs/ai/design-system.md`, `web/scripts/e2e-changed.mjs`
- Test: `web/tests/unit/{ro,tiles,filter,tokens}.test.ts`, `web/tests/e2e/home.spec.ts`, `web/tests/e2e/motion.spec.ts`

**Interfaces:**
- `ro.ts`: `countRo(n: number, one: string, many: string): string` ("1 sportiv", "3 sportivi", "20 de sportivi", "101 sportivi"); `feminineCountRo(n: number, one: string, many: string): string` ("o competiție", "două competiții", "cinci competiții", "zece competiții", "11 competiții", "20 de competiții"). `home.ts` keeps `groupsHeading`, `pointsUnit`, `countdownLabel` working through these.
- `tiles.ts`: `export type Tone = 'blue' | 'deep' | 'red'`; `initialsOf(name: string): string` (first letter of the first two space-separated words, uppercase: "Pazargic Ligia-Beatrice" → "PL"); `toneAt(index: number): Tone` (cycle `blue, deep, red`).
- `filter.ts`: `filterCss(scope: string, name: string, values: string[], opts: { effect: 'hide' | 'dim'; container?: string }): string`. For each value `v` it emits `${scope}:has(input[name="${name}"][value="${v}"]:checked) [data-f]:not([data-f~="${v}"])` with `display:none` (`hide`, athletes and programme) or `opacity:.25` (`dim`, calendar and news, where the layout must not reflow), the matching rule showing `[data-count-for="${v}"]`, a `container` rule hiding a container with no match (`${container}:not(:has([data-f~="${v}"]))`), and `@supports not selector(:has(*)) { ${scope} .filter { display:none } }`. Values must match `/^[a-z0-9-]+$/` or it throws.
- Components (props; markup and CSS from the mockups):
  - `Photo`: `{ img: Img; sizes?: string; loading?: 'lazy' | 'eager'; priority?: boolean; class?: string }` → one `<img>` with `width`, `height`, `alt`, `srcset`/`sizes` only when `img.srcset`, `style="object-position:…"` when `img.position`; eager + priority → `fetchpriority="high"`; lazy → `loading="lazy" decoding="async"`.
  - `PlatePhoto`: `{ img: Img; offset?: 12 | 14 | 16 | 18; ratio?: string; sizes?: string; loading?: 'lazy' | 'eager'; priority?: boolean; class?: string }` → `<figure class="plated {class}" style="--plate:{offset}px"><div class="plate" aria-hidden="true"></div><div class="shot"><Photo …/></div></figure>`; the plate is absolutely positioned, translated by `--plate`, inside a figure whose right and bottom margin equal `--plate`. The homepage hero passes `class="poster"` so the motion hooks `.poster .plate` / `.poster .shot` keep working.
  - `InitialTile`: `{ name: string; tone: Tone; size: 'tile' | 'poster' | 'coach' }` → the coloured field with `initialsOf(name)`, `aria-hidden="true"` on the letters.
  - `PageHead`: `{ title: string; lede?: string; tone: 'white' | 'blue'; headingId?: string }`, named slot `before` (back link, meta) and default slot (after the lede). White: title left, lede right (sportivi, noutăți); blue: a band with the lede below (program, părinți, contact). The `h1` is `.display`.
  - `SectionHeading`: `{ id: string; level?: 2 | 3 }` + slot → `<h2 class="h2s">` (body face, 600–700 weight, sentence case).
  - `FilterBar`: `{ legend: string; legendVisible?: boolean; name: string; scope: string; options: FilterOption[]; effect: 'hide' | 'dim'; container?: string; variant: 'chips' | 'links' | 'swatches'; status?: boolean }` with `type FilterOption = { value: string; label: string; count?: number; countLabel?: string; swatch?: string }` (exported from `filter.ts`); the first option is checked; renders `<fieldset class="filter">` of visually hidden radios with labels (focus ring on the label), an optional status `<p data-filter-status>` with one `<span data-count-for>` per option plus a visually hidden `aria-live="polite"` element, and `<style set:html={filterCss(…)}>`. `filter-status.ts` `initFilterStatus(): void` copies the checked option's `countLabel` into the live element on change.
  - `Tbc`: `{ what: string; as?: 'p' | 'span' | 'dd' }` → `<p class="tbc"><b>De confirmat de club:</b> {what}</p>`.
  - `ClosingCta`: `{ text: string; display: boolean; label: string; href: string; email?: boolean }`; heading text fixed "Vino la un antrenament de probă"; `display` chooses the big uppercase heading (program, părinți) or the modest one (sportivi); `email` adds "sau scrieți la siderurgistul@badmintongalati.ro".
- Tokens added to `tokens.css` (values computed from the mockups' `color-mix()`): `--blue-tint #afc1e1` (played event), `--red-tint #f3c2c6` (home event), `--red-deep #9a2134` (text on `--red-tint`), `--mist-soft #f0f4fa` (calendar day cell), `--ink-soft #3a4866` (tbc text), `--ink-muted #5d6b8a` (weekday letters, "fără competiții").
- `roll.ts`: `digitBands(el: HTMLElement): { band: HTMLElement; end: number }[]` (the digit-band markup of plan 1's roster roll, used by `motion.ts` and `page-motion.ts`).
- `page-motion.ts`: `export type PageMoment = 'tile-roll' | 'place-roll' | 'season-fill' | 'feature-reveal' | 'cover-recrop' | 'sessions-settle' | 'poster-reveal'`; `initPageMotion(moment: PageMoment): void` returns at once under reduced motion; a page calls it once. This task implements `poster-reveal` (plate `scaleY` from 0, shot `clipPath` from `inset(100% 0 0 0)`, once at `top 85%`); each page task adds its case:

| Page | Moment | Source |
|---|---|---|
| `/sportivi/` | `tile-roll`: place digits roll when a tile enters (once) | `sportivi-lista.html` |
| `/sportivi/[slug]/` | `place-roll`: the place numeral rolls on load | `sportiv-fisa.html` |
| `/calendar/` | `season-fill`: event blocks fill in date order on load | `calendar.html` |
| `/noutati/` | `feature-reveal`: featured plate rises, photo unclips on load | `noutati-lista.html` |
| `/noutati/[slug]/` | `cover-recrop`: cover scales to 1.16 while scrolling away | `articol.html` |
| `/program/` | `sessions-settle`: blocks settle into slots once, wide only | `program.html` |
| `/pentru-parinti/`, `/contact/` | `poster-reveal` | `pentru-parinti.html`, `contact.html` |

- [ ] **Step 1: Write failing unit tests:**

```ts
// ro.test.ts
expect(countRo(1, 'sportiv', 'sportivi')).toBe('1 sportiv'); expect(countRo(20, 'sportiv', 'sportivi')).toBe('20 de sportivi');
expect(feminineCountRo(5, 'competiție', 'competiții')).toBe('cinci competiții'); expect(feminineCountRo(1, 'fotografie', 'fotografii')).toBe('o fotografie');
// tiles.test.ts
expect(['Nistor Cristian-Ionuț', 'Pazargic Ligia-Beatrice', 'Bordeianu Nectarie-Ioan', 'Dorel Badiu'].map(initialsOf)).toEqual(['NC', 'PL', 'BN', 'DB']);
expect([0, 1, 2, 3].map(toneAt)).toEqual(['blue', 'deep', 'red', 'blue']);
// filter.test.ts
const css = filterCss('.roster', 'cat', ['u17'], { effect: 'hide' });
expect(css).toContain('.roster:has(input[name="cat"][value="u17"]:checked) [data-f]:not([data-f~="u17"])');
expect(css).toContain('display:none'); expect(css).toContain('@supports not selector(:has(*))');
expect(() => filterCss('.x', 'cat', ['u"17'], { effect: 'hide' })).toThrow();
// tokens.test.ts: new pairs meet 4.5:1
expect(contrast(token('--blue-deep'), token('--blue-tint'))).toBeGreaterThanOrEqual(4.5); // 6.89
expect(contrast(token('--red-deep'), token('--red-tint'))).toBeGreaterThanOrEqual(4.5);   // 5.05
expect(contrast(token('--ink-soft'), token('--white'))).toBeGreaterThanOrEqual(4.5);     // 9.14
expect(contrast(token('--ink-muted'), token('--white'))).toBeGreaterThanOrEqual(4.5);    // 5.34
expect(contrast(token('--ink'), token('--mist-soft'))).toBeGreaterThanOrEqual(4.5);      // 14.46
```

And in `home.spec.ts`: `test('the homepage draws every red plate with one component', …)` → `expect(page.locator('main .plated > .plate')).toHaveCount(4)` (hero, why, third hall photo, news) and no element under `main` has a computed `box-shadow` other than `none`.

- [ ] **Step 2: Run, expect failure.** `pnpm -C web test -- ro tiles filter tokens` → FAIL; `pnpm e2e -- -g "one component"` → FAIL.
- [ ] **Step 3: Implement `ro.ts`, `tiles.ts`, `filter.ts`, the tokens, `.h2s` and `.tbc` in `base.css`** (tbc: `--ink-soft`, 0.92rem, the 12px hatched square in `--court` drawn with `repeating-linear-gradient`, as in `pentru-parinti.html`).
- [ ] **Step 4: Build the eight components and `roll.ts`/`page-motion.ts`/`filter-status.ts`.** Replace the plates in `Hero`, `Why`, `Hall` (third photo, offset 12) and `News` with `PlatePhoto`; no other visual change to the homepage.
- [ ] **Step 5: Write the owner's design rules into `docs/ai/design-system.md`**: a section "Inner pages" with the rules from Global Constraints (with the quote), the motion table above, and the component list.
- [ ] **Step 6: Add the e2e-changed rule** `src/components/ui/**` → every spec (it is shared), keeping the header table in `e2e-changed.mjs` and `docs/ai/testing.md` in sync.
- [ ] **Step 7: Run.** `pnpm -C web test -- ro tiles filter tokens home` → pass. `pnpm e2e -- home.spec.ts motion.spec.ts scroll-scan.spec.ts` → pass (the strip, hero intro and scrub still pass with `PlatePhoto`).
- [ ] **Step 8: Commit** `feat(web): shared inner-page pieces, one plate component, tint tokens`.

---

### Task 3: Athletes list `/sportivi/`

**Files:**
- Create: `web/src/lib/athletes.ts`, `web/src/components/athletes/{Wall,Tile}.astro`, `web/src/pages/sportivi/index.astro`
- Modify: `web/src/lib/content.ts` (getter), `web/src/scripts/page-motion.ts` (`tile-roll`), `web/src/fixtures/{quiet-season,sparse}.json`, `web/scripts/e2e-changed.mjs`
- Test: `web/tests/unit/athletes.test.ts`, `web/tests/e2e/athletes.spec.ts`

**Interfaces:**
- Consumes: `SiteData`, `bestRanking`, `disciplineLabel` (`home.ts`), `countRo`, `toneAt`, `FilterBar`, `InitialTile`, `Photo`, `PageHead`, `ClosingCta`.
- Produces in `athletes.ts`:
  - `athleteCategory(a: Athlete, seasonYear: number): string | undefined`: the category of `bestRanking(a)` when ranked; else from `birthYear`: `age = seasonYear - birthYear`, the first of U9, U11, U13, U15, U17, U19 with `age < n`, then `U23` for 19–22, `Seniori` from 23; undefined without either. (Rule to confirm with the club, Appendix A.)
  - `type WallTile = { athlete: Athlete; category?: string; best?: Ranking; caption?: string; tone: Tone; filter: string }` (`filter` = lowercase category or `''`); `caption` = "U17, simplu băieți" (ranked), "U17" (category only), undefined.
  - `athleteWall(athletes: Athlete[], seasonYear: number): WallTile[]`: consented only; by category from oldest to youngest (Seniori, U23, U19 … U9), unknown category last; inside a category ranked by best place, then by name (Romanian collation); `tone = toneAt(index)`.
  - `athleteFilters(tiles: WallTile[]): FilterOption[]`: `{ value: 'toti', label: 'Toți', countLabel: athletesCountLabel(n) }` then one option per present category in wall order (`countLabel: athletesCountLabel(k, 'U17')`); none when fewer than two categories are present.
  - `athletesCountLabel(n: number, category?: string): string`: "3 sportivi", "1 sportiv la U9", "20 de sportivi".
  - `type AthletesPage = { tiles: WallTile[]; filters: FilterOption[]; rankingWeek?: RankingWeek }`; `athletesView(site: SiteData, today: string): AthletesPage`.
- `content.ts`: `getAthletesPage(): Promise<AthletesPage>`.
- Page: `PageHead` white, title "Sportivii clubului", lede from the mockup; mist section with `FilterBar` (`variant: 'chips'`, `status: true`, `effect: 'hide'`, scope `.roster`) and the wall `<ul class="wall">` (4/3/2 columns at >1099/≤1099/≤860); each tile: photo (`Photo`, 4:5, `object-fit: cover`) or `InitialTile size="tile"`; red mark `<p class="mark"><b data-roll="2">2</b> în țară</p>` only when ranked; caption `<h3><a href="/sportivi/{slug}/">name</a></h3>` with the whole tile clickable (`a::after` inset 0) and the caption line; `data-f` = tile filter. Foot: "Locul în țară: Clasamentul FRB, săptămâna {week}, {range}." only with `rankingWeek` and at least one ranked tile, then "Pe listă apar doar sportivii pentru care părinții și-au dat acordul." and the link "Clasamentele pe badminton.ro". `ClosingCta` modest, label "Cere un antrenament de probă", href `/contact/#formular`. With no tile: no filter, no wall, no foot; one quiet line "Sportivii apar aici după ce părinții își dau acordul." (Appendix A).
- Fixtures: `quiet-season.json` adds `Zet Exemplu-Ana` (consent true, `birthYear: 2015`, photo `/img/smash.jpg` with `position: "50% 18%"`, `groupId: "group-initiere"`, no rankings). `sparse.json`: unchanged athletes (only the non-consenting one).

- [ ] **Step 1: Write failing unit tests** (`athletes.test.ts`) with plan 1's `nistor`, `pazargic`, `bordeianu`, `hidden`:

```ts
expect(athleteCategory(nistor, 2026)).toBe('U17');
expect(athleteCategory({ ...nistor, rankings: [], birthYear: 2015 }, 2026)).toBe('U13');
expect(athleteCategory({ ...nistor, rankings: [], birthYear: 2016 }, 2026)).toBe('U11');
expect(athleteCategory({ ...nistor, rankings: [], birthYear: 2005 }, 2026)).toBe('U23');
expect(athleteCategory({ ...nistor, rankings: [] }, 2026)).toBeUndefined();
const wall = athleteWall([bordeianu, hidden, pazargic, nistor], 2026);
expect(wall.map(t => [t.athlete.name, t.caption, t.tone])).toEqual([
  ['Nistor Cristian-Ionuț', 'U17, simplu băieți', 'blue'], ['Pazargic Ligia-Beatrice', 'U15, simplu fete', 'deep'], ['Bordeianu Nectarie-Ioan', 'U13, dublu mixt', 'red']]);
expect(athleteFilters(wall).map(f => [f.label, f.countLabel])).toEqual([['Toți', '3 sportivi'], ['U17', '1 sportiv la U17'], ['U15', '1 sportiv la U15'], ['U13', '1 sportiv la U13']]);
expect(athletesCountLabel(20)).toBe('20 de sportivi');
```

- [ ] **Step 2: Write failing e2e tests** (`athletes.spec.ts`):

```ts
test('the wall shows consented athletes as tiles, oldest category first', async ({ page }) => {
  await page.goto('/sportivi/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sportivii clubului');
  await expect(page.locator('.wall h3')).toHaveText(['Nistor Cristian-Ionuț', 'Pazargic Ligia-Beatrice', 'Bordeianu Nectarie-Ioan']);
  await expect(page.locator('.wall .mark').first()).toHaveText(/2\s*în țară/);
  await expect(page.locator('.wall .ini')).toHaveText(['NC', 'PL', 'BN']);
  await expect(page.getByRole('link', { name: 'Nistor Cristian-Ionuț' })).toHaveAttribute('href', '/sportivi/nistor-cristian-ionut/');
  await expect(page.locator('.roster')).toContainText('Locul în țară: Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026.');
});
test('the category filter works from the keyboard and announces the count', async ({ page }) => {
  await page.goto('/sportivi/');
  await page.getByRole('radio', { name: 'Toți' }).focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'U15' })).toBeChecked();
  await expect(page.locator('.wall .tile:visible')).toHaveCount(1);
  await expect(page.locator('[data-filter-status] [aria-live]')).toHaveText('1 sportiv la U15');
});
test('the filter works without JavaScript', async ({ browser }) => { /* javaScriptEnabled:false, click label U13 → 1 visible tile, visible count text "1 sportiv la U13" */ });
test('reduced motion shows the final place digits', async ({ browser }) => { /* reducedMotion:'reduce' → mark <b> has text "2" */ });
test.describe('an athlete without consent', on('mixed-strip'), () => {
  test('has no tile and is not counted', async ({ page }) => {
    const html = await (await page.goto('/sportivi/'))!.text();
    expect(html).not.toContain('Fără-Acord'); expect(html).not.toContain('fara-acord');
    await expect(page.locator('[data-count-for="toti"]')).toHaveText('3 sportivi');
  });
});
test.describe('nobody may be shown', on('sparse'), () => {
  test('a quiet line instead of an empty wall', async ({ page }) => {
    await page.goto('/sportivi/');
    await expect(page.locator('.wall, .filter')).toHaveCount(0);
    await expect(page.getByText('Sportivii apar aici după ce părinții își dau acordul.')).toBeVisible();
  });
});
test.describe('a photo and a birth year', on('quiet-season'), () => {
  test('the photo fills its tile; the category comes from the birth year', async ({ page }) => { /* Zet Exemplu-Ana tile has an img with object-fit cover and object-position 50% 18%, caption "U13" */ });
});
```

- [ ] **Step 3: Run, expect failure.** `pnpm -C web test -- athletes` and `pnpm e2e -- athletes.spec.ts` → FAIL.
- [ ] **Step 4: Implement `athletes.ts`, the getter, the page and components, `tile-roll`** (`digitBands`, roll once at `top 92%`; the `<b>` keeps its digits as text for no-JS and reduced motion; `aria-label` on the mark stays "2 în țară").
- [ ] **Step 5: Extend the fixtures** as above and add the e2e-changed rule `src/(pages/sportivi|components/athletes)/**` → `athletes.spec.ts`, `build-output.spec.ts`.
- [ ] **Step 6: Run.** `pnpm -C web test -- athletes content` → pass. `pnpm e2e -- athletes.spec.ts home.spec.ts` → pass (the homepage quiet-season roster still shows Nistor, Pazargic, Bordeianu: `Zet` sorts last).
- [ ] **Step 7: Commit** `feat(web): athletes wall with category filter`.

---

### Task 4: Athlete profile `/sportivi/[slug]/`

**Files:**
- Create: `web/src/pages/sportivi/[slug].astro`, `web/src/components/athletes/{Ident,Standing,Appearances}.astro`
- Modify: `web/src/lib/athletes.ts`, `web/src/lib/content.ts`, `web/src/scripts/page-motion.ts` (`place-roll`), `web/src/fixtures/quiet-season.json`, `web/tests/e2e/build-output.spec.ts`
- Test: `web/tests/unit/athletes.test.ts`, `web/tests/e2e/athletes.spec.ts`, `web/tests/e2e/build-output.spec.ts`

**Interfaces:**
- Produces in `athletes.ts`:
  - `type Medal = 'aur' | 'argint' | 'bronz'`; `medalOf(result: string): Medal | undefined` (trimmed, case-insensitive).
  - `type AthleteProfile = { athlete: Athlete; nameLines: [string, string]; category?: string; discipline?: string; groupName?: string; best?: Ranking; standing?: { place: number; lead: string; rest: string; source?: string }; posts: Post[]; medals: { year: number; rows: { medal: Medal; discipline?: string; post: Pick<Post, 'title' | 'slug'> }[] }[]; tone: Tone }`.
  - `athleteProfile(site: SiteData, athlete: Athlete, today: string): AthleteProfile`: `nameLines` = first word / the rest; `standing.lead` "Locul 2 în țară", `rest` "la U17, simplu băieți, cu 168 de puncte" (points part only when known, `pointsUnit`), `source` "Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026" when `rankingWeek`; `posts` = posts whose results name the athlete, newest first; `medals` grouped by the post's year, newest year first, medal order aur, argint, bronz.
  - `content.ts`: `getAthleteProfiles(): Promise<AthleteProfile[]>` (consented athletes only), used by `getStaticPaths` (`params: { slug }`, `props: { profile }`).
- Page (from `sportiv-fisa.html`): mist band; `PlatePhoto` (offset 16, ratio 4/5, `priority`) or a poster-size `InitialTile` with the same plate; back link "Toți sportivii" → `/sportivi/`; `h1.display` with the two name lines; facts `<dl>`: Categoria (value or "de confirmat"), Proba (only when ranked), Grupa (group name or "de confirmat"); the blue standing block (numeral `data-roll`, lead bold, rest, source line) only when ranked; "Profilul FRB" when `frbUrl`. Below on white, three modest sections (`SectionHeading`): "Apare în articolele clubului" (only when `posts` is non-empty; thumbnail, date, title), "Turneele care contează" (always the pre-sync line: "Apar aici după prima sincronizare cu clasamentul FRB." plus " Până atunci le găsești pe " + "Profilul FRB" link when `frbUrl`), "Medalii" (rows per year as a plain list, e.g. "2026: aur, simplu fete – Articol de test cu galerie" with the title linking to the article; empty: "Încă nu are medalii trecute în articolele clubului."). The medal rows were not drawn in the mockup (only a sketch note); build them as plain text rows and list them for Mario's review in Appendix A.
- `quiet-season.json` adds a fictional post `articol-de-test-cu-galerie` (kind `competitie`, date `2026-03-30`, `competitionId: "competition-2026-03-27-cr-u15-cr-u23"`, `results: [{ "athleteId": "athlete-zet-exemplu-ana", "discipline": "SF", "result": "aur" }]`); Task 7 gives it a body and gallery.

- [ ] **Step 1: Write failing unit tests:**

```ts
const p = athleteProfile(homeSite, nistor, '2026-11-25');
expect(p.nameLines).toEqual(['Nistor', 'Cristian-Ionuț']);
expect(p.standing).toEqual({ place: 2, lead: 'Locul 2 în țară', rest: 'la U17, simplu băieți, cu 168 de puncte', source: 'Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026' });
expect(p.groupName).toBeUndefined(); expect(p.medals).toEqual([]);
expect(medalOf(' Aur ')).toBe('aur'); expect(medalOf('locul 5')).toBeUndefined();
const z = athleteProfile(quietSite, zet, '2026-11-25');
expect(z.category).toBe('U13'); expect(z.groupName).toBe('Inițiere');
expect(z.medals).toEqual([{ year: 2026, rows: [{ medal: 'aur', discipline: 'SF', post: { title: 'Articol de test cu galerie', slug: 'articol-de-test-cu-galerie' } }] }]);
```

- [ ] **Step 2: Write failing e2e tests** (`athletes.spec.ts`, plus `build-output.spec.ts`):

```ts
test('a profile states place, source and what is not known yet', async ({ page }) => {
  await page.goto('/sportivi/nistor-cristian-ionut/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Nistor\s+Cristian-Ionuț/);
  await expect(page.locator('.facts')).toContainText('Grupa'); await expect(page.locator('.facts')).toContainText('de confirmat');
  await expect(page.locator('.standing')).toContainText('Locul 2 în țară la U17, simplu băieți, cu 168 de puncte');
  await expect(page.getByRole('link', { name: 'Profilul FRB' }).first()).toHaveAttribute('href', 'https://badminton.ro/jucator/236/u17-sb-simplu-baieti/');
  await expect(page.getByText('Încă nu are medalii trecute în articolele clubului.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Apare în articolele clubului' })).toHaveCount(0);
});
test('the longest name fits a 380px screen', async ({ page }) => { /* /sportivi/bordeianu-nectarie-ioan/ at 380: h1 text box inside 0..380, scrollWidth ≤ innerWidth */ });
test('reduced motion and no-JS show the place as text', async ({ browser }) => { /* both contexts: [data-roll] has text "2" */ });
test.describe('medals and articles', on('quiet-season'), () => { /* /sportivi/zet-exemplu-ana/: Medalii row contains "aur", link to /noutati/articol-de-test-cu-galerie/; "Apare în articolele clubului" lists it */ });
test.describe('no consent, no page', on('mixed-strip'), () => {
  test('the address answers 404', async ({ page }) => expect((await page.goto('/sportivi/fara-acord-zamfira/'))!.status()).toBe(404));
});
// build-output.spec.ts
test('an athlete without consent is in no built file', () => {
  for (const name of ['mixed-strip', 'sparse'] as const) {
    expect(existsSync(join(root, name, 'sportivi/fara-acord-zamfira'))).toBe(false);
    expect(filesOf(name).filter(f => /Fără-Acord|fara-acord|jucator\/999\//.test(readFileSync(f, 'utf8')))).toEqual([]);
  }
});
```

- [ ] **Step 3: Run, expect failure.** `pnpm -C web test -- athletes`; `pnpm e2e -- athletes.spec.ts build-output.spec.ts` → FAIL.
- [ ] **Step 4: Implement** `athleteProfile`, `getAthleteProfiles`, the route with `getStaticPaths`, the components and `place-roll` (on load, delay 0.3 s).
- [ ] **Step 5: Run.** `pnpm -C web test -- athletes` → pass; `pnpm e2e -- athletes.spec.ts build-output.spec.ts` → pass.
- [ ] **Step 6: Commit** `feat(web): athlete profile pages for consented athletes only`.

---

### Task 5: Calendar `/calendar/`

**Files:**
- Create: `web/src/lib/calendar.ts`, `web/src/components/calendar/{Month,Panel,SeasonList}.astro`, `web/src/pages/calendar/index.astro`, `web/src/scripts/countdown.ts`, `web/src/scripts/calendar-panel.ts`
- Modify: `web/src/lib/dates.ts` (`formatShortRangeRo`), `web/src/lib/content.ts`, `web/src/components/home/CalendarBand.astro` (script moves to `countdown.ts`), `web/src/scripts/page-motion.ts` (`season-fill`), `web/src/fixtures/sparse.json` (`competitions: []`), `web/scripts/e2e-changed.mjs`
- Test: `web/tests/unit/{calendar,dates}.test.ts`, `web/tests/e2e/calendar.spec.ts`, `web/tests/e2e/home.spec.ts`

**Interfaces:**
- `dates.ts`: `formatShortRangeRo(start: string, end: string): string` with month abbreviations `ian. feb. mar. apr. mai iun. iul. aug. sept. oct. nov. dec.` ("13–15 mar.", "4–6 sept.", "8–10 mai", "30 oct. – 1 nov."); `weekdayOf(iso: string): number` (ISO, 1 = luni).
- `calendar.ts`:
  - `type EventStatus = 'played' | 'next' | 'upcoming'`
  - `type MonthCell = { kind: 'pad'; span: number } | { kind: 'day'; day: number; today: boolean } | { kind: 'event'; comps: Competition[]; days: number[]; status: EventStatus; home: boolean; today: boolean; filter: string }` (`filter` = space-separated lowercase categories of all `comps`; `home` if any; `status` of the first; `today` if a covered day is today).
  - `monthCells(year: number, month: number, comps: Competition[], today: string): MonthCell[]`: leading pad = weekday of day 1 minus 1; an event block covers its days inside this month and is split at each Sunday (the end of a grid row) and at the month's end; competitions with overlapping days in the month share one block covering the union of their days (split at Sunday the same way).
  - `type Month = { month: number; name: string; cells: MonthCell[]; empty: boolean }`; `type CalendarPage = { year: number; months: Month[]; next?: Competition; countdown?: string; intro: string; filters: FilterOption[]; spring: Competition[]; autumn: Competition[]; todayLabel: string }`
  - `calendarIntro(comps: Competition[]): string`: "Sezonul din calendarul Federației Române de Badminton. Cupele României (CR) se joacă primăvara, Campionatele Naționale (CN) toamna; cinci competiții sunt la Galați." (`feminineCountRo` + "este"/"sunt"; with no home event the sentence ends at "toamna.").
  - `calendarFilters(comps: Competition[]): FilterOption[]`: "Toate" then the present categories in `COMPETITION_CATEGORIES` order, values lowercase.
  - `eventLabel(c: Competition, status: EventStatus): string`: "CR U9 și CR Seniori, 13–15 martie, București, s-a jucat"; city "de confirmat" reads "loc de confirmat"; ", acasă" when home; status words `s-a jucat`, `urmează`.
  - `calendarView(site: SiteData, today: string): CalendarPage`: `year` = the year of `today`; only competitions starting that year; `next` from `splitCalendar` over all competitions; `spring` = start month ≤ 7, `autumn` the rest; `todayLabel` "azi, 25 noiembrie".
- `content.ts`: `getCalendarPage(): Promise<CalendarPage>`.
- `countdown.ts`: `initCountdowns(): void` (the plan 1 script, for `[data-countdown]` anywhere).
- `calendar-panel.ts`: `initCalendarPanel(): void`. On wide screens (`min-width: 861px`) hovering or focusing an event block shows that event in the panel; Enter or click pins it (the block gets `.on`) and shows the button "Arată următoarea competiție", which restores the next event; on narrow screens the block is a plain link to its row `#ev-{id}` in the list. Pinning writes the event's label into a visually hidden `aria-live="polite"` element; hover and focus do not announce (the block's own `aria-label` is read on focus).
- Page (from `calendar.html`): layout grid with head (`h1.display` "Calendar competițional {year}" and the intro), sticky side panel (next event: "Următoarea competiție", date numerals, title, city, countdown; with no next event: "Nicio competiție programată deocamdată." on `--mist`), legend (urmează, s-a jucat, roșu: acasă, la Galați, `todayLabel`), hint "Apasă pe o competiție din calendar ca să vezi detaliile."; `FilterBar` (`variant: 'links'`, `legend: 'Categoria'`, `legendVisible`, `effect: 'dim'`, scope `.cal`, `data-f` on blocks and list rows); 12 months (3/2/1 columns; an empty month says " fără competiții" after its name and on narrow screens shows no grid); weekday letters Lu Ma Mi Jo Vi Sâ Du `aria-hidden`; a day is `<span class="d">`, today has `aria-current="date"`; an event block is `<a class="evb {status} {home}" href="#ev-{id}" aria-label={eventLabel}>` spanning its days (`grid-column: span n`). Below: `SectionHeading` "Toate competițiile, pe rând" with two lists "Primăvara, Cupele României" and "Toamna, Campionatele Naționale" (`<li id="ev-{id}">`: short range, title, city, "acasă" tag, "Articolul clubului" link when `postSlug`, "Rezultatele pe badminton.ro" when `resultsUrl`, a visually hidden status). No competition at all: head, intro without the count clause, the panel line, no filter, no months, no list.

- [ ] **Step 1: Write failing unit tests** (`calendar.test.ts`, `dates.test.ts`) with the fixture competitions:

```ts
expect(monthCells(2026, 1, [], '2026-11-25')[0]).toEqual({ kind: 'pad', span: 3 });  // 1 Jan 2026 is a Thursday
expect(monthCells(2026, 3, [], '2026-11-25')[0]).toEqual({ kind: 'pad', span: 6 });  // 1 Mar 2026 is a Sunday
const nov = monthCells(2026, 11, comps, '2026-11-25');
expect(nov.filter(c => c.kind === 'event').map(c => [(c as any).days, (c as any).status])).toEqual([[[20, 21, 22], 'played'], [[27, 28, 29], 'next']]);
expect(nov.find(c => c.kind === 'day' && c.day === 25)).toMatchObject({ today: true });
const across = { ...comps[0], id: 'x', start: '2026-03-29', end: '2026-04-01' };          // Sunday to Wednesday
expect(monthCells(2026, 3, [across], '2026-11-25').filter(c => c.kind === 'event').map(c => (c as any).days)).toEqual([[29], [30, 31]]);
expect(monthCells(2026, 4, [across], '2026-11-25').filter(c => c.kind === 'event').map(c => (c as any).days)).toEqual([[1]]);
const a = { ...comps[0], id: 'a', start: '2026-06-05', end: '2026-06-07' }, b = { ...comps[0], id: 'b', start: '2026-06-06', end: '2026-06-06' };
expect(monthCells(2026, 6, [a, b], '2026-11-25').filter(c => c.kind === 'event').map(c => [(c as any).comps.length, (c as any).days])).toEqual([[2, [5, 6, 7]]]);
expect(calendarIntro(comps)).toMatch(/; cinci competiții sunt la Galați\.$/);
expect(calendarIntro(comps.filter(c => !c.home))).toMatch(/toamna\.$/);
expect(calendarFilters(comps).map(f => f.label)).toEqual(['Toate', 'U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U23', 'Seniori', 'Echipe']);
expect(eventLabel(cnEchipeSeniori, 'played')).toBe('CN Echipe Seniori, 4–6 septembrie, loc de confirmat, s-a jucat');
expect(formatShortRangeRo('2026-09-04', '2026-09-06')).toBe('4–6 sept.'); expect(formatShortRangeRo('2026-10-30', '2026-11-01')).toBe('30 oct. – 1 nov.');
```

- [ ] **Step 2: Write failing e2e tests** (`calendar.spec.ts`, clock pinned with `pinClock`):

```ts
test('twelve month grids, today marked, the next event in the panel', async ({ page }) => {
  await page.goto('/calendar/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calendar competițional 2026');
  await expect(page.locator('.mo')).toHaveCount(12); await expect(page.locator('.evb')).toHaveCount(12);
  await expect(page.locator('[aria-current="date"]')).toHaveText('25');
  await expect(page.locator('.panel')).toContainText('CN U9 și CN U17'); await expect(page.locator('.panel [data-countdown]')).toHaveText('peste 2 zile');
});
test('wide: Tab previews an event, Enter pins it, the button restores the next one', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/calendar/');
  const ev = page.locator('.evb', { hasText: '13' }).first(); await ev.focus();
  await expect(page.locator('.panel')).toContainText('CR U9 și CR Seniori');
  await page.keyboard.press('Enter'); await expect(page.getByRole('button', { name: 'Arată următoarea competiție' })).toBeVisible();
  await page.getByRole('button', { name: 'Arată următoarea competiție' }).click(); await expect(page.locator('.panel')).toContainText('CN U9 și CN U17');
});
test('narrow: an event leads to its row in the list', async ({ page }) => { /* 390 wide: click first .evb → URL hash #ev-competition-2026-03-13-cr-u9-cr-seniori, that li in viewport */ });
test('the category filter dims other events, with and without JavaScript', async ({ page, browser }) => { /* check radio U15 → .evb for "CR U9 și CR Seniori" computed opacity < 1, "CR U15 și CR U23" opacity 1; same in a no-JS context */ });
test('reduced motion shows the blocks without clipping', async ({ browser }) => { /* every .evb computed clip-path is "none" */ });
test.describe('season over', on('quiet-season'), () => {
  test('the panel says so; a played event links its article', async ({ page }) => {
    await page.goto('/calendar/');
    await expect(page.locator('.panel')).toContainText('Nicio competiție programată deocamdată.');
    await expect(page.locator('#ev-competition-2026-03-27-cr-u15-cr-u23').getByRole('link', { name: 'Articolul clubului' }))
      .toHaveAttribute('href', '/noutati/articol-de-test-cu-galerie/');
  });
});
test.describe('no competition at all', on('sparse'), () => {
  test('one quiet line, no empty grids', async ({ page }) => { /* .mo, .filter, .list count 0; text "Nicio competiție programată deocamdată." visible */ });
});
```

- [ ] **Step 3: Run, expect failure.** `pnpm -C web test -- calendar dates`; `pnpm e2e -- calendar.spec.ts` → FAIL.
- [ ] **Step 4: Implement** `calendar.ts`, `formatShortRangeRo`, `weekdayOf`, the getter, the components and page, `countdown.ts` (CalendarBand uses it), `calendar-panel.ts`, `season-fill` (`clipPath: inset(0 100% 0 0)` → none, stagger 0.07 s, delay 0.2 s). Set `sparse.json` `competitions` to `[]`.
- [ ] **Step 5: Add the e2e-changed rule** `src/(pages/calendar|components/calendar)/**`, `src/scripts/(countdown|calendar-panel).ts` → `calendar.spec.ts`, `home.spec.ts`.
- [ ] **Step 6: Run.** `pnpm -C web test -- calendar dates home` → pass. `pnpm e2e -- calendar.spec.ts home.spec.ts scroll-scan.spec.ts motion.spec.ts` → pass (sparse homepage now shows "Nicio competiție programată deocamdată." in its calendar band; its section order and scans still pass).
- [ ] **Step 7: Commit** `feat(web): season calendar as month grids with category filter`.

---

### Task 6: News list `/noutati/`

**Files:**
- Create: `web/src/lib/news.ts`, `web/src/components/news/{Front,FrontItem,Older}.astro`, `web/src/pages/noutati/index.astro`
- Modify: `web/src/lib/content.ts`, `web/src/scripts/page-motion.ts` (`feature-reveal`), `web/src/fixtures/{quiet-season,sparse}.json`, `web/scripts/e2e-changed.mjs`
- Test: `web/tests/unit/news.test.ts`, `web/tests/e2e/news.spec.ts`

**Interfaces:**
- `news.ts`:
  - `type FrontItem = { post: Post; span: number; kind: 'photo' | 'tile'; tone?: 'red' | 'blue' | 'mist'; big?: boolean }`
  - `type NewsFront = { feat?: FrontItem; side: FrontItem[]; rows: FrontItem[][]; older: Post[] }`
  - `frontLayout(posts: Post[]): NewsFront`: posts newest first; `feat` = the first (kind `photo` with a cover, else a `blue` tile); `side` = the next two (span 4); `rows` = the next eight, spans by the repeating patterns `[5,3,4]`, `[5,7]`, `[3,3,6]`; a partial last row splits 12 columns evenly (1 → 12, 2 → 6 + 6); items without a cover are tiles whose tone cycles `red, blue, mist` in order of appearance, `big` when the span is ≥ 5; `older` = everything after the first 11.
  - `kindFilters(posts: Post[]): FilterOption[]`: "Toate" with the total, then Competiție, Viața clubului, Proiecte with their counts, kinds with zero posts left out.
  - `type NewsPage = { front: NewsFront; filters: FilterOption[] }`; `newsView(site: SiteData): NewsPage`.
- `content.ts`: `getNewsPage(): Promise<NewsPage>`.
- Page (from `noutati-lista.html`): `PageHead` white, "Noutăți", lede; `FilterBar` (`variant: 'links'`, legend "Tipul" visible, `effect: 'dim'`, counts as `<sup>`), a 12-column `<ol class="front">`; `feat` uses `PlatePhoto` (offset 16, ratio 3/2, eager) with meta "Competiție, 30 iunie 2026" and the title as `h2` in big uppercase display (the one allowed featured title); other items `h3` in the display face, mixed case; meta always `postKindLabel, <time>`; every item is one link to `/noutati/{slug}/`. "Mai vechi" (`SectionHeading`) on a mist band, four columns, only when `older` is non-empty. No post at all: the head and one line "Încă nu sunt articole." (Appendix A), no filter.
- Fixtures: `quiet-season.json` ends with 15 posts: its 3, the fictional post from Task 4, and the 11 old-site titles of `noutati-lista.html` with their dates and kinds (all except the truncated "Gălățenii … ONSȘ", which names real minors and is not ship-ready); covers only on Novi Sad, the cantonament and the fictional post. `older` then holds the last 4 ("6 medalii pentru Siderurgistul la Cupa României U15" and the three 2023 championships). `sparse.json`: drop the Novi Sad cover (no post has a photo).

- [ ] **Step 1: Write failing unit tests:**

```ts
const f = frontLayout(fifteen);                            // 15 posts, as in the mockup
expect(f.feat!.post.title).toBe(fifteen[0].title); expect(f.side).toHaveLength(2);
expect(f.rows.map(r => r.map(i => i.span))).toEqual([[5, 3, 4], [5, 7], [3, 3, 6]]);
expect(f.older).toHaveLength(4);
expect(f.rows.flat().filter(i => i.kind === 'tile').map(i => i.tone)).toEqual(['red', 'blue', 'mist', 'red']);
expect(frontLayout(fifteen.slice(0, 3)).rows).toEqual([]);
expect(frontLayout(fifteen.slice(0, 4)).rows.map(r => r.map(i => i.span))).toEqual([[12]]);
expect(frontLayout([{ ...fifteen[0], cover: undefined }]).feat).toMatchObject({ kind: 'tile', tone: 'blue' });
expect(kindFilters(homePosts).map(o => [o.label, o.count])).toEqual([['Toate', 3], ['Competiție', 3]]);
```

- [ ] **Step 2: Write failing e2e tests** (`news.spec.ts`): on `home` the featured `h2` "Novi Sad – 2026" has computed `text-transform: uppercase`, its link is `/noutati/novi-sad-2026/`, two side items, filter labels exactly "Toate 3", "Competiție 3", no "Mai vechi"; on `quiet-season` the "Mai vechi" band lists 4 posts, checking "Viața clubului" (keyboard: focus "Toate", ArrowRight twice) leaves competition items with opacity < 1 and club-life items at 1, coverless items have no `img`; on `sparse` the featured item is a blue tile without `img`; reduced motion: the featured `.plate` has no transform.
- [ ] **Step 3: Run, expect failure.** `pnpm -C web test -- news`; `pnpm e2e -- news.spec.ts` → FAIL.
- [ ] **Step 4: Implement** `news.ts`, the getter, page, components, `feature-reveal` (plate `scaleY` 0 → 1 over 0.7 s, shot `clipPath inset(100% 0 0 0)` → none 0.9 s, on load), and the fixture changes.
- [ ] **Step 5: Add the e2e-changed rule** `src/(pages/noutati/index|components/news)` → `news.spec.ts`, `article.spec.ts`.
- [ ] **Step 6: Run.** `pnpm -C web test -- news content`; `pnpm e2e -- news.spec.ts home.spec.ts` → pass.
- [ ] **Step 7: Commit** `feat(web): news front page led by photos`.

---

### Task 7: Article `/noutati/[slug]/`

**Files:**
- Create: `web/src/lib/body.ts`, `web/src/components/news/{ArticleHead,ArticleAside,Gallery,PrevNext,Share}.astro`, `web/src/pages/noutati/[slug].astro`, `web/src/scripts/{lightbox,share}.ts`
- Modify: `web/src/lib/news.ts`, `web/src/lib/content.ts`, `web/src/scripts/page-motion.ts` (`cover-recrop`), `web/package.json` (`@portabletext/to-html`), `web/src/fixtures/{quiet-season,mixed-strip}.json`
- Test: `web/tests/unit/{news,body}.test.ts`, `web/tests/e2e/article.spec.ts`

**Interfaces:**
- `body.ts`: `bodyToHtml(blocks: BodyBlock[]): string` with `@portabletext/to-html`: styles `normal` → `<p>` (the first normal paragraph gets `class="lead"`), `h2`, `h3`, `blockquote`; bullet and number lists; `strong`, `em`; `link` marks only for `http:`, `https:`, `mailto:` (others render as plain text), external links `rel="noopener"`; a `photo` block → `<figure class="pull"><img src width height alt loading="lazy" decoding="async"></figure>`; all text escaped.
- `news.ts` additions:
  - `postNeighbours(posts: Post[], slug: string): { older?: Post; newer?: Post }`
  - `mosaicLayout(imgs: Img[]): ('big' | 'tall' | 'wide' | '')[]`: index 0 → `big` when there are 4 or more photos; a portrait photo (`height > 1.2 × width`) → `tall`; otherwise index % 5 === 4 → `wide`; else `''`.
  - `photoCountLabel(n: number): string`: "o fotografie" for 1, otherwise `countRo(n, 'fotografie', 'fotografii')` ("7 fotografii", "20 de fotografii"), digits as in the mockup.
  - `type TaggedRow = { athlete: Athlete; line?: string; result: string }`; `taggedRows(post: Post, athletes: Athlete[], seasonYear: number): TaggedRow[]` (`line` = category and discipline as on the wall tile; only athletes present in `athletes`, which are consented).
  - `type PostPage = { post: Post; bodyHtml: string; competition?: Competition; tagged: TaggedRow[]; mosaic: { img: Img; shape: string }[]; neighbours: { older?: Post; newer?: Post } }`; `postView(site: SiteData, post: Post, today: string): PostPage`.
- `content.ts`: `getPostPages(): Promise<PostPage[]>` for `getStaticPaths` (`params: { slug }`).
- `lightbox.ts`: `initLightbox(): void` for `.mosaic a`: opens a `<dialog class="lb">` with `showModal()` (focus moves into it), buttons "Anterioara", "Următoarea", "Închide", counter "3 din 7", ArrowLeft/ArrowRight page, Escape closes, focus returns to the opening link; without `showModal` or JS the links open the image file.
- `share.ts`: `initShare(): void`: fills the Facebook (`https://www.facebook.com/sharer/sharer.php?u=…`), WhatsApp (`https://wa.me/?text=<title> <url>`) and "Copiază linkul" (clipboard; label "Link copiat" for 2.4 s) links from `location`, then removes `hidden` from the share row. Without JS the row stays hidden (the site's public address is not known before launch).
- Page (from `articol.html`): blue head band with back link "Noutăți", meta, `h1.display` (the page's one big title); `PlatePhoto` cover (offset 18, 16:9, `priority`) overlapping the band; body column (`set:html={bodyHtml}`), the share row; aside: the red "Competiția din articol" block only for a `competitie` post with a linked competition (date numerals, title, city, "În calendar" → `/calendar/#ev-{id}`, "Rezultatele pe badminton.ro" only with `resultsUrl`), then "Sportivi în articol" (`SectionHeading`, not display, see Appendix B) when `tagged` is non-empty: name linked to the profile, line, result; gallery on mist with `SectionHeading` "Fotografii" (modest, see Appendix B) and `photoCountLabel(n)` + ". Apasă pe una ca s-o vezi mare." when the gallery is non-empty; prev/next nav "Mai vechi, {date}" / "Mai nou, {date}" and "Toate articolele". Nothing is rendered for an empty body, gallery or tag list.
- Fixtures: the fictional `quiet-season` post gets a body (test text: a lead paragraph, an `h2`, a bullet list, a blockquote, a link, a `photo` block with `/img/smash.jpg`), a 7-photo gallery from `public/img` (the mockup's order: cantonament, smash, meci-dublu, echipa-rosu, sala-turneu-1, festivitate, medalii) and a cover. `mixed-strip.json`: Novi Sad gets `results: [{ "athleteId": "athlete-fara-acord-zamfira", "discipline": "SF", "result": "aur" }]`.

- [ ] **Step 1: Write failing unit tests** (`body.test.ts`, `news.test.ts`):

```ts
expect(bodyToHtml([para('Prima'), para('A doua')])).toBe('<p class="lead">Prima</p><p>A doua</p>');
expect(bodyToHtml([para('<script>x</script>')])).not.toContain('<script>');
expect(bodyToHtml([linked('aici', 'javascript:alert(1)')])).not.toContain('href');
expect(bodyToHtml([{ _type: 'photo', _key: 'p', photo: smash }])).toContain('width="800" height="1200"');
expect(mosaicLayout(seven)).toEqual(['big', 'tall', '', '', 'wide', '', '']);
expect(photoCountLabel(7)).toBe('7 fotografii'); expect(photoCountLabel(1)).toBe('o fotografie');
expect(postNeighbours(posts, 'bucuresti-memorialul-rotaru-u15-2026')).toEqual({ older: posts[2], newer: posts[0] });
expect(taggedRows(post, [], 2026)).toEqual([]);
```

- [ ] **Step 2: Write failing e2e tests** (`article.spec.ts`): on `home`, `/noutati/novi-sad-2026/` has `h1` "Novi Sad – 2026", meta "Competiție, 30 iunie 2026", the cover `img` eager with `fetchpriority="high"`, no `.prose p`, no gallery, no competition block, a "Mai vechi" link to `/noutati/bucuresti-memorialul-rotaru-u15-2026/` and no "Mai nou"; without JS the share row is hidden; with JS the Facebook href contains `encodeURIComponent(page.url())`. On `quiet-season`, `/noutati/articol-de-test-cu-galerie/`: body has `.lead`, `h2`, `li`, `blockquote`, `figure.pull img[width][height]`; the competition block names "CR U15 și CR U23" and links `/calendar/#ev-competition-2026-03-27-cr-u15-cr-u23`; "Sportivi în articol" lists "Zet Exemplu-Ana" with "aur"; gallery text "7 fotografii. Apasă pe una ca s-o vezi mare."; lightbox: Enter on the first link opens the dialog with "1 din 7", ArrowRight → "2 din 7", Escape closes and the first link is focused again; without JS the first link's href is `/img/cantonament.jpg`. On `mixed-strip`, `/noutati/novi-sad-2026/` has no "Sportivi în articol" and its HTML does not contain "Fără-Acord".
- [ ] **Step 3: Run, expect failure.** `pnpm -C web test -- body news`; `pnpm e2e -- article.spec.ts` → FAIL.
- [ ] **Step 4: Add `@portabletext/to-html`** (`pnpm -C web add @portabletext/to-html`), implement `body.ts`, the `news.ts` additions, the getter, route, components, scripts, `cover-recrop` (scale to 1.16, `scrub: 0.6`, from `top top` to `bottom top`) and the fixtures.
- [ ] **Step 5: Add the e2e-changed rule** `src/pages/noutati/\[slug\]`, `src/scripts/(lightbox|share).ts` → `article.spec.ts`.
- [ ] **Step 6: Run.** `pnpm -C web test -- body news`; `pnpm e2e -- article.spec.ts news.spec.ts` → pass.
- [ ] **Step 7: Commit** `feat(web): article pages with body, linked competition, tags and gallery`.

---

### Task 8: Programme `/program/`

**Files:**
- Create: `web/src/lib/program.ts`, `web/src/components/program/{Planner,GroupGuide}.astro`, `web/src/pages/program/index.astro`
- Modify: `web/src/lib/content.ts`, `web/src/components/home/Groups.astro` (schedule line from sessions), `web/src/scripts/page-motion.ts` (`sessions-settle`), `web/src/styles/tokens.css` if a swatch needs a value, `web/src/fixtures/quiet-season.json`, `web/scripts/e2e-changed.mjs`
- Test: `web/tests/unit/program.test.ts`, `web/tests/e2e/program.spec.ts`, `web/tests/e2e/home.spec.ts`

**Interfaces:**
- `program.ts`:
  - `type GroupTone = 'red' | 'blue' | 'deep' | 'outline' | 'mist'`; `groupTone(index: number): GroupTone` (that order, by the group's position; the mockup's Inițiere red … Amatori adulți mist).
  - `type PlannerBlock = { group: Group; tone: GroupTone; day: number; col: number; r1: number; r2: number; label: string }`; `type Planner = { days: { day: number; name: string; col: number }[]; marks: { label: string; row: number }[]; gapRows: number[]; blocks: PlannerBlock[] }`.
  - `weekPlanner(groups: Group[]): Planner | undefined` (undefined without sessions): days with at least one session, columns from 2 in weekday order; rows in 30-minute slots from the earliest start (floored to the hour) to the latest end (ceiled), the first slot on row 2; a run of four or more slots empty on every day collapses into one gap row; a mark on every full hour whose slot is a visible row, the gap row marked with the hour it starts at, and the end hour on the row after the last slot; a block spans `r1` (its start row) to `r2` (the row after its last slot).
  - `scheduleLabel(sessions: Session[]): string | undefined`: same times on every day → "Luni, miercuri, vineri, 17:00–18:30"; otherwise "Luni 18:30–20:30, sâmbătă 10:00–12:00" (days in order, lowercase after the first).
  - `type ProgramPage = { planner?: Planner; filters: FilterOption[]; tracks: { title: string; groups: { group: Group; tone: GroupTone; coach?: Coach }[] }[]; missingCoach: boolean; note?: string }`; `programView(site: SiteData): ProgramPage`.
- `content.ts`: `getProgramPage(): Promise<ProgramPage>`. The homepage `Groups` shows `scheduleLabel(g.sessions)` where plan 1 showed `g.schedule`.
- Page (from `program.html`): `PageHead` blue "Program și grupe" + lede; "Săptămâna în sală" (`SectionHeading`); with a planner: `FilterBar` (`variant: 'swatches'`, legend "Alegeți grupa copilului" visible, first option "Toate grupele", `effect: 'hide'`, `container: '.daycol'`), the planner grid (`role="list"` of day columns, each with `h3` day name and a list of blocks: group name and hours; hour marks `aria-hidden`; the gap row as a mist band), `info.programNote` under it when set; without sessions: `Tbc` "zilele și orele fiecărei grupe." and no grid, no filter. Then "Sala Siderurgistul, Bd. Cloșca, Galați · patru terenuri · sala pe hartă · cum ajungeți" (map link as in the mockup, "cum ajungeți" → `/contact/#drum`). Mist section "Ce grupă i se potrivește" (`SectionHeading`) with the mockup intro, link "Întrebări de părinte: vârstă, echipament, cost" → `/pentru-parinti/`, two lists by track with swatch, name (`id` = group slug), audience, coach name when known; `Tbc` "antrenorul fiecărei grupe." when `missingCoach`. `ClosingCta` display, label "Cere un antrenament de probă" → `/contact/#formular`, `email`.
- `quiet-season.json`: the mockup's sample timetable as test data (Inițiere Mon/Wed/Fri 17:00–18:30; Performanță Mon/Wed/Fri 18:30–20:30 and Sat 10:00–12:00; Elite Tue/Thu 18:30–20:30 and Sat 12:00–14:00; Amatori copii Tue/Thu 17:00–18:30; Amatori adulți Tue/Thu 20:30–22:00), fictional coaches `Antrenor Exemplu` (`coach-exemplu`, role "antrenor") on every group, `info.programNote` "Notă de test pentru program.".

- [ ] **Step 1: Write failing unit tests** with that timetable:

```ts
const p = weekPlanner(sampleGroups)!;
expect(p.days.map(d => d.name)).toEqual(['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']);
expect(p.marks).toEqual([['10:00', 2], ['11:00', 4], ['12:00', 6], ['13:00', 8], ['14:00', 10], ['17:00', 11], ['18:00', 13],
  ['19:00', 15], ['20:00', 17], ['21:00', 19], ['22:00', 21]].map(([label, row]) => ({ label, row })));
expect(p.gapRows).toEqual([10]);
const at = (name: string, day: number) => p.blocks.find(b => b.group.name === name && b.day === day)!;
expect([at('Performanță', 6).r1, at('Performanță', 6).r2, at('Elite', 6).r1, at('Elite', 6).r2]).toEqual([2, 6, 6, 10]);
expect([at('Inițiere', 1).r1, at('Inițiere', 1).r2, at('Amatori adulți', 2).r1, at('Amatori adulți', 2).r2]).toEqual([11, 14, 18, 21]);
expect(weekPlanner(homeGroups)).toBeUndefined();
expect(scheduleLabel(initiere.sessions)).toBe('Luni, miercuri, vineri, 17:00–18:30');
expect(scheduleLabel(performanta.sessions)).toBe('Luni 18:30–20:30, miercuri 18:30–20:30, vineri 18:30–20:30, sâmbătă 10:00–12:00');
expect([0, 1, 2, 3, 4].map(groupTone)).toEqual(['red', 'blue', 'deep', 'outline', 'mist']);
```

- [ ] **Step 2: Write failing e2e tests** (`program.spec.ts`): `home`: h1 "Program și grupe", no `.planner`, no `.filter`, the text "De confirmat de club: zilele și orele fiecărei grupe." and "De confirmat de club: antrenorul fiecărei grupe.", `#initiere` exists, the CTA links `/contact/#formular`. `quiet-season`: 6 day headings; the Sâmbătă column holds "Performanță 10:00–12:00"; choosing "Elite" (keyboard) leaves 3 visible blocks, all Elite; at 390 wide the Luni column is hidden after choosing Elite; the same filter works without JS; coach "Antrenor Exemplu" under each group; reduced motion: blocks have no transform. `home.spec.ts` (quiet-season): `#program` shows "Luni, miercuri, vineri, 17:00–18:30" in the Inițiere row.
- [ ] **Step 3: Run, expect failure.** `pnpm -C web test -- program`; `pnpm e2e -- program.spec.ts` → FAIL.
- [ ] **Step 4: Implement** `program.ts`, the getter, page and components, the homepage schedule line (then delete `Group.schedule` from `types.ts`, the parser and `toHomeData`), `sessions-settle` (wide only: `scaleY` from 0, origin top, stagger 0.035 s, once at `top 80%`) and the fixture.
- [ ] **Step 5: Add the e2e-changed rule** `src/(pages/program|components/program)/**` → `program.spec.ts`; `src/components/home/Groups.astro` keeps its plan 1 rule.
- [ ] **Step 6: Run.** `pnpm -C web test -- program home`; `pnpm e2e -- program.spec.ts home.spec.ts` → pass.
- [ ] **Step 7: Commit** `feat(web): weekly timetable and group guide`.

---

### Task 9: For parents `/pentru-parinti/`

**Files:**
- Create: `web/src/components/parents/{Question,Coaches}.astro`, `web/src/pages/pentru-parinti/index.astro`
- Modify: `web/src/lib/content.ts` (`getParentsPage`), `web/src/fixtures/quiet-season.json` (`info.parents`), `web/scripts/e2e-changed.mjs`
- Test: `web/tests/e2e/parents.spec.ts`

**Interfaces:**
- `content.ts`: `type ParentsPage = { parents: ClubInfo['parents']; coaches: { coach: Coach; tone: Tone }[]; groupSlugs: { first?: string; play?: string }; hallPhoto?: Img; openingPhoto?: Img }`; `getParentsPage(): Promise<ParentsPage>` (`first` = slug of the first `performanta` group, `play` = the first `amatori` group; photos: `openingPhoto` = the hall photo whose url ends `cantonament.jpg`, else the first hall photo; `hallPhoto` = the next hall photo; both optional).
- Page (from `pentru-parinti.html`): `PageHead` blue "Pentru părinți" + lede; opening: the quote, its attribution and `PlatePhoto` (offset 14, `poster-reveal`); a two-column reading area: the sticky table of contents (`nav` "Întrebările de pe pagină", seven anchors) and the questions as `section.q` with `h2.qh` (modest headings), in the mockup's order and ids (`varsta`, `echipament`, `cost`, `inceput`, `dupa`, `antrenori`, `sala`). Each club answer from `parents` renders as paragraphs (split on blank lines) in place of its `Tbc`; missing → the mockup's `Tbc` text verbatim. Fixed copy and links as in the mockup with real routes (`/program/#{first}`, `/program/#{play}`, `/contact/#formular`, `/calendar/`, `/sportivi/`). Coaches: a tile per coach (`InitialTile size="coach"` or the photo), name, role only when set; the `Tbc` "câte o fotografie și o frază despre fiecare antrenor…" while any coach lacks a photo. "Unde e sala?": framed hall photo (`PlatePhoto` offset 14), text, "Sala pe hartă" and "Cum ajungeți" → `/contact/#drum`. `ClosingCta` display with the mockup text, `email`.
- `quiet-season.json` `info.parents`: test strings for `age` and `cost` only (so the page shows both states).

- [ ] **Step 1: Write failing e2e tests** (`parents.spec.ts`): `home`: h1 "Pentru părinți"; the TOC has 7 links and each target id exists; exactly 6 `.tbc` lines (age, equipment, cost, first weeks, registration, coaches); coach tiles read "DB", "IC", "AP" with names and no role text; the "Inițiere" link goes to `/program/#initiere`; reduced motion: the opening `.plate` has no transform. `quiet-season`: the `#cost` section shows the test answer and no `.tbc`; `#echipament` still has its `.tbc`; the coach role "antrenor" appears under "Antrenor Exemplu".
- [ ] **Step 2: Run, expect failure.** `pnpm e2e -- parents.spec.ts` → FAIL.
- [ ] **Step 3: Implement** the getter, page and components; add the fixture strings.
- [ ] **Step 4: Add the e2e-changed rule** `src/(pages/pentru-parinti|components/parents)/**` → `parents.spec.ts`.
- [ ] **Step 5: Run.** `pnpm e2e -- parents.spec.ts` → pass; `pnpm -C web check` → 0 errors.
- [ ] **Step 6: Commit** `feat(web): reading page for parents`.

---

### Task 10: Contact `/contact/` and the trial form

**Files:**
- Create: `web/src/lib/trial.ts`, `web/src/components/contact/{TrialForm,Place}.astro`, `web/src/pages/contact/index.astro`, `web/src/scripts/trial-form.ts`
- Modify: `web/src/lib/content.ts` (`getContactPage`), `web/src/fixtures/quiet-season.json` (`info.contact`), `web/scripts/e2e-changed.mjs`
- Test: `web/tests/unit/trial.test.ts`, `web/tests/e2e/contact.spec.ts`

**Interfaces:**
- `trial.ts` (no imports, erasable TypeScript only: plan 2b's endpoint runs this file directly on Node):
  - `type TrialField = 'nume' | 'telefon' | 'varsta' | 'mesaj' | 'acord'`
  - `type TrialInput = { nume?: unknown; telefon?: unknown; varsta?: unknown; mesaj?: unknown; acord?: unknown; site_web?: unknown }`
  - `type TrialRequest = { name: string; phone: string /* 10 digits, 07… */; age: number; message?: string }`
  - `type TrialError = { field: TrialField; summary: string; message: string }`
  - `validateTrial(input: TrialInput): { ok: true; value: TrialRequest } | { ok: false; errors: TrialError[] }` (errors in field order). Rules: name trimmed 2–100 chars; phone: remove spaces, dots, dashes, parentheses, turn a leading `+40` or `0040` into `0`, then `/^0\d{9}$/`; age an integer 1–99; message ≤ 1000 chars; `acord` true (`true`, `'on'`, `'true'`).
  - Messages (summary / message), copy in Appendix A: `nume` empty "Lipsește numele părintelui" / "Scrieți numele dumneavoastră."; `telefon` empty "Lipsește telefonul" / "Scrieți un număr la care vă poate suna clubul."; fewer than 10 digits "Telefonul are prea puține cifre" / "Numărul are prea puține cifre. Scrieți-l cu 10 cifre, de exemplu 0745 123 456."; otherwise invalid "Telefonul nu pare corect" / "Scrieți-l cu 10 cifre, de exemplu 0745 123 456."; `varsta` empty "Lipsește vârsta copilului" / "Scrieți vârsta copilului în ani, de exemplu 8."; invalid "Vârsta nu pare corectă" / same; `mesaj` "Mesajul e prea lung" / "Scrieți cel mult 1000 de caractere."; `acord` "Lipsește acordul pentru date" / "Bifați căsuța ca să putem folosi datele pentru a vă contacta."
  - `isSpam(input: TrialInput): boolean` (honeypot `site_web` non-empty).
  - `formatPhoneRo(phone: string): string` ("0745123456" → "0745 123 456"); `errorIntro(n: number): string` ("Verificați un lucru:", "Verificați două lucruri:", "Verificați trei lucruri:" …); `trialMailto(r: TrialRequest, to: string): string` (subject "Cerere antrenament de probă", body lines "Numele părintelui: …", "Telefon: …", "Vârsta copilului: … ani", "Mesaj: …" when set; `encodeURIComponent`).
- `trial-form.ts`: `initTrialForm(form: HTMLFormElement, opts: { endpoint: '/api/proba'; email: string }): void`. Sets `novalidate`; on submit validates with `validateTrial`; errors → the summary box (`role="alert"`, heading "Cererea nu a plecat", `errorIntro`, one link per error to its field) receives focus, each bad field gets `aria-invalid="true"`, its `.err` message (with visually hidden "Eroare: ") joins `aria-describedby`; valid → `fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body })`; 2xx → success; 400 with `{ errors }` → the error state; 429 → the summary with "Ați trimis deja câteva cereri. Încercați din nou peste câteva minute." (Appendix A); anything else (network error, 404 before plan 2b, 5xx) → the fallback state: "Cererea nu a putut fi trimisă de pe site." and a link "Trimiteți-o pe e-mail" with `trialMailto` (Appendix A). Success state (`role="status"`, heading focused): "Cererea a ajuns la club", "Mulțumim, {name as typed}. Clubul vă contactează la <b>{formatPhoneRo}</b> ca să stabiliți ziua probei.", then "Vă sunăm în cel mult {replyDays} zile." when `replyDays` is set, else the mockup's `Tbc`; the link to `/pentru-parinti/`; "Trimite altă cerere" resets the form and focuses the first field.
- `content.ts`: `type ContactPage = { contact: ClubInfo['contact']; hallPhoto?: Img }`; `getContactPage()` (`hallPhoto` = the hall photo ending `sala-turneu-1.jpg`, else the first).
- Page (from `contact.html`): `PageHead` blue "Contact" + lede with the email link; form column `id="formular"` with `SectionHeading` "Cere un antrenament de probă", intro, fields exactly as the mockup (`nume` autocomplete name; `telefon` type tel autocomplete tel; `varsta` text `inputmode="numeric"` maxlength 2 with "ani"; `mesaj` optional; consent checkbox; all `required` except `mesaj` so browsers validate without JS), a honeypot `<input name="site_web" tabindex="-1" autocomplete="off">` inside a visually hidden `aria-hidden` block, `<form action="/api/proba" method="post">`, submit "Trimite cererea" on `--red-field`; a `<noscript>` line "Fără JavaScript, cererea se trimite mai sigur pe e-mail: siderurgistul@badmintongalati.ro." (plan 2b removes it). Place column on blue: `PlatePhoto` (offset 14, `poster-reveal`), "Sala Siderurgistul", address, "Deschide harta", `<dl>` with `id="drum"` "Cum ajungeți" (`directions` or `Tbc`), "E-mail", "Telefon" (`tel:` link with `formatPhoneRo` or `Tbc`). Contrast: `.tbc` text on blue is white.
- `quiet-season.json` `info.contact`: `{ "phone": "0700 000 000", "directions": "Text de test pentru drum.", "replyDays": 3 }`.

- [ ] **Step 1: Write failing unit tests** (`trial.test.ts`):

```ts
const good = { nume: 'Ana Ionescu', telefon: '0745 123 456', varsta: '8', mesaj: '', acord: 'on' };
expect(validateTrial(good)).toEqual({ ok: true, value: { name: 'Ana Ionescu', phone: '0745123456', age: 8 } });
expect(validateTrial({ ...good, telefon: '+40 745-123-456' })).toMatchObject({ ok: true, value: { phone: '0745123456' } });
const bad = validateTrial({ ...good, telefon: '0745 12', acord: undefined });
expect(bad.ok === false && bad.errors.map(e => e.summary)).toEqual(['Telefonul are prea puține cifre', 'Lipsește acordul pentru date']);
expect(validateTrial({}).ok === false && validateTrial({}).errors.map(e => e.field)).toEqual(['nume', 'telefon', 'varsta', 'acord']);
for (const v of ['0', '100', '7.5', 'opt']) expect(validateTrial({ ...good, varsta: v }).ok).toBe(false);
expect(validateTrial({ ...good, mesaj: 'x'.repeat(1001) }).ok).toBe(false);
expect(isSpam({ ...good, site_web: 'http://spam' })).toBe(true);
expect(formatPhoneRo('0745123456')).toBe('0745 123 456'); expect(errorIntro(2)).toBe('Verificați două lucruri:');
expect(trialMailto({ name: 'Ana', phone: '0745123456', age: 8 }, 'siderurgistul@badmintongalati.ro'))
  .toBe('mailto:siderurgistul@badmintongalati.ro?subject=' + encodeURIComponent('Cerere antrenament de probă') + '&body=' + encodeURIComponent('Numele părintelui: Ana\nTelefon: 0745 123 456\nVârsta copilului: 8 ani'));
```

- [ ] **Step 2: Write failing e2e tests** (`contact.spec.ts`, all on `home` unless noted; endpoint answers mocked with `page.route('**/api/proba', …)`):

```ts
test('an empty form explains every missing field and links to it', async ({ page }) => {
  await page.goto('/contact/'); await page.getByRole('button', { name: 'Trimite cererea' }).click();
  const sum = page.getByRole('alert'); await expect(sum).toBeFocused(); await expect(sum).toContainText('Cererea nu a plecat');
  await expect(sum.getByRole('link')).toHaveCount(4);
  await sum.getByRole('link', { name: 'Lipsește telefonul' }).click(); await expect(page.getByLabel('Telefon')).toBeFocused();
  await expect(page.getByLabel('Telefon')).toHaveAttribute('aria-invalid', 'true');
});
test('a sent request shows who will be called', async ({ page }) => {
  await page.route('**/api/proba', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.goto('/contact/'); await fillGood(page); await page.getByRole('button', { name: 'Trimite cererea' }).click();
  await expect(page.getByRole('status')).toContainText('Cererea a ajuns la club');
  await expect(page.getByRole('status')).toContainText('0745 123 456');
});
test('without the endpoint the request falls back to e-mail', async ({ page }) => {
  await page.route('**/api/proba', r => r.fulfill({ status: 404 }));
  await page.goto('/contact/'); await fillGood(page); await page.getByRole('button', { name: 'Trimite cererea' }).click();
  await expect(page.getByRole('link', { name: 'Trimiteți-o pe e-mail' })).toHaveAttribute('href', /^mailto:siderurgistul@badmintongalati\.ro\?subject=/);
});
test('server-side errors come back into the same summary', async ({ page }) => { /* 400 {ok:false, errors:[{field:'telefon',summary:'Telefonul nu pare corect',message:'…'}]} → alert contains it */ });
test('without JavaScript the browser checks the required fields', async ({ browser }) => { /* no-JS: required on nume, telefon, varsta, acord; noscript line visible */ });
test('the place column shows what is still to confirm', async ({ page }) => { /* #drum has .tbc; E-mail link; "Deschide harta" link */ });
test.describe('known contact details', on('quiet-season'), () => { /* tel: link reads "0700 000 000"; #drum shows the test text; success after a mocked 200 says "Vă sunăm în cel mult 3 zile." */ });
```

- [ ] **Step 3: Run, expect failure.** `pnpm -C web test -- trial`; `pnpm e2e -- contact.spec.ts` → FAIL.
- [ ] **Step 4: Implement** `trial.ts`, `trial-form.ts`, the getter, page and components; the error and success markup from the `states` section of `contact.html` (the error `.field.bad` style, the summary box, the `.sent` box on blue).
- [ ] **Step 5: Add the e2e-changed rule** `src/(pages/contact|components/contact)/**`, `src/scripts/trial-form.ts` → `contact.spec.ts`.
- [ ] **Step 6: Run.** `pnpm -C web test -- trial`; `pnpm e2e -- contact.spec.ts` → pass.
- [ ] **Step 7: Commit** `feat(web): contact page with the trial form, its states and an e-mail fallback`.

---

### Task 11: Shell, homepage links and the inner-page sweep

**Files:**
- Create: `web/src/lib/nav.ts`
- Modify: `web/src/components/SiteHeader.astro`, `web/src/components/SiteFooter.astro`, `web/src/components/home/{Hero,Roster,CalendarBand,Groups,TrialCta}.astro`, `web/src/pages/404.astro` (its "ways" links), `web/scripts/e2e-changed.mjs`
- Test: `web/tests/unit/nav.test.ts`, `web/tests/e2e/{shell,home,not-found}.spec.ts`

**Interfaces:**
- `nav.ts`: `isCurrent(href: string, path: string): boolean` (`'/'` only on `'/'`; others when `path === href` or `path.startsWith(href)` with `href` ending in `/`).
- Header: `aria-current="page"` from `isCurrent`. Footer: remove `id="contact"`; the Contact column adds "Pentru părinți" → `/pentru-parinti/` (as in the mockups); a "Facebook" link `https://www.facebook.com/badmintongalati` in the Contact column.
- Homepage links: hero "Vezi toți sportivii" → `/sportivi/` (still omitted with no athlete); roster names link to `/sportivi/{slug}/`; a played competition with `postSlug` links its title to `/noutati/{postSlug}/`; group names link to `/program/#{slug}`; TrialCta button "Cere un antrenament de probă" → `/contact/#formular` and the line "sau scrieți la siderurgistul@badmintongalati.ro". 404 "ways": `/program/`, `/calendar/`, `/noutati/`, `/contact/`.

- [ ] **Step 1: Write failing tests:**

```ts
// nav.test.ts
expect(isCurrent('/', '/')).toBe(true); expect(isCurrent('/', '/sportivi/')).toBe(false);
expect(isCurrent('/sportivi/', '/sportivi/nistor-cristian-ionut/')).toBe(true); expect(isCurrent('/noutati/', '/noutati-vechi/')).toBe(false);
// shell.spec.ts
test('a sub-page marks its section in the menu', async ({ page }) => {
  await page.goto('/noutati/novi-sad-2026/');
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Noutăți' })).toHaveAttribute('aria-current', 'page');
});
test('the footer links parents and Facebook', async ({ page }) => { /* Pentru părinți → /pentru-parinti/; Facebook → https://www.facebook.com/badmintongalati; no #contact in the footer */ });
const ROUTES = ['/sportivi/', '/sportivi/bordeianu-nectarie-ioan/', '/calendar/', '/noutati/', '/noutati/novi-sad-2026/', '/program/', '/pentru-parinti/', '/contact/'];
test('every inner page fits 380px, sizes and describes its images, and raises no error', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 380, height: 800 });
  for (const r of ROUTES) {
    await page.goto(r);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), r).toBeLessThanOrEqual(0);
    expect(await page.locator('img:not([width]), img:not([height]), img:not([alt])').count(), r).toBe(0);
    expect(await page.locator('h1.display').count(), r).toBe(1);
  }
  expect(errors).toEqual([]);
});
test('every inner page shows its content without JavaScript', async ({ browser }) => { /* no-JS: each route's h1 visible and main has text */ });
// home.spec.ts: hrefs of "Vezi toți sportivii", the roster name links, the group links and the CTA button
// not-found.spec.ts: the ways link to /program/, /calendar/, /noutati/, /contact/
```

- [ ] **Step 2: Run, expect failure.** `pnpm -C web test -- nav`; `pnpm e2e -- shell.spec.ts home.spec.ts not-found.spec.ts` → FAIL.
- [ ] **Step 3: Implement** `nav.ts` and the shell, homepage and 404 link changes. Keep the shell focus-ring test target `#proba .btn`.
- [ ] **Step 4: Update the e2e-changed header table and `docs/ai/testing.md`'s mapping table** to the rules added by Tasks 2–10.
- [ ] **Step 5: Run.** `pnpm -C web test -- nav`; `pnpm e2e -- shell.spec.ts home.spec.ts not-found.spec.ts` → pass.
- [ ] **Step 6: Commit** `feat(web): menu marks sub-pages, footer and homepage link to the new pages`.

---

### Task 12: Docs and the full run

**Files:**
- Modify: `docs/ai/{architecture,content-model,design-system,testing,decisions,roadmap}.md`, `CLAUDE.md`, `README.md`

- [ ] **Step 1: Update the docs.** `architecture.md`: data flow with `SiteData`, `getSiteData`, the page getters and view modules, the routes table, the scripts. `content-model.md`: the fields the pages read and what plan 2b must add (birth year, coaches, sessions, categories, results link, club answers). `design-system.md`: confirm Task 2's section; add the tokens table rows and per-page notes (plate offsets, filter variants). `testing.md`: new specs and unit files, the fixture-roles table of this plan, measured timings. `decisions.md`: the rulings of this plan (Appendix B). `roadmap.md`: plan 2 split into 2a (done) and 2b; the later plan lists Despre club, Antrenori as a page, Documente, Proiecte, Galerie, Rezultate, Pentru sponsori, migration of the 15 old articles, redirects, SEO/OG, FRB sync, launch. `CLAUDE.md`: the motion rule now reads "the five homepage moments, one moment per inner page (table in `design-system.md`), the 404 rally"; layout lines for the new folders. `README.md`: status and page list.
- [ ] **Step 2: Full unit run.** `pnpm test` → all pass.
- [ ] **Step 3: Static checks.** `pnpm -C web check` → 0 errors; `pnpm build` → no warnings; `pnpm --filter studio test` → pass.
- [ ] **Step 4: Cold e2e.** `rm -rf web/dist-e2e && time pnpm e2e` → all pass, wall time under 45 s. If over 40 s, move assertions that only check data into unit tests before going on; record the time in `testing.md` and `README.md`.
- [ ] **Step 5: Screenshot review.** Full-page screenshots of the eight routes at 1440 and 390 on `home` and `quiet-season`, side by side with the mockups; fix spacing, type size and colour differences.
- [ ] **Step 6: Commit** `docs: inner pages, their tests and rulings`.

---

## Appendix A: Copy to confirm with the club

Agent-written text from the mockups (or written for this plan) that ships as below until the club confirms or corrects it. Items marked **not shipped** stay out until confirmed.

| Page | Text | Note |
|---|---|---|
| Sportivi | "Copiii și tinerii legitimați la club, de la primii pași până la competițiile naționale. Apasă pe un sportiv ca să vezi unde a ajuns." | lede |
| Sportivi | "Sportivii apar aici după ce părinții își dau acordul." | empty state, written for this plan |
| Sportivi | Age category from birth year (U-n while age < n; U23 for 19–22; Seniori from 23) | rule, to confirm with the coaches |
| Fișa sportivului | "Turneele care contează" / "Apar aici după prima sincronizare cu clasamentul FRB. Până atunci le găsești pe Profilul FRB." / "Încă nu are medalii trecute în articolele clubului." | and the medal row layout (not drawn in the mockup) for Mario |
| Calendar | "Sezonul din calendarul Federației Române de Badminton. Cupele României (CR) se joacă primăvara, Campionatele Naționale (CN) toamna; … la Galați." and the list headings "Primăvara, Cupele României" / "Toamna, Campionatele Naționale" | the split is by start month (≤ July) |
| Noutăți | "Articolele clubului, de la competiții, din viața clubului și despre proiecte." / "Încă nu sunt articole." | second is new |
| Program | Lede; "Copiii încep la Inițiere. Cine vrea competiții merge mai departe spre Performanță și Elite; cine vrea doar să joace are grupele de amatori."; CTA "Lăsați-ne vârsta copilului și un număr de telefon, iar clubul vă contactează ca să stabiliți ziua." | |
| Program, Părinți, Contact | Map link to coordinates 45.4194907, 28.0277769 | confirm the hall's position |
| Părinți | Lede; the quote "Asigurăm un climat prietenos pentru toate categoriile de vârstă." and "Așa își descrie clubul antrenamentele, din 7 martie 2002 încoace. …"; "De la club primește asistență calificată, instructaj și echipamentul minim necesar."; steps 1, 2, 4; "Ce urmează după?" paragraphs ("… de la U9 la U19 …"); "Clubul e condus de cei trei antrenori ai săi."; the CTA text | the "De confirmat de club" lines speak to the club; Mario approved them as the visible state |
| Părinți | Coach roles "președinte și antrenor", "vicepreședinte și antrenor" | **not shipped** (coaches appear by name only) |
| Contact | Lede, field hints, the consent sentence, all validation messages of Task 10, "Ați trimis deja câteva cereri…", "Cererea nu a putut fi trimisă de pe site." / "Trimiteți-o pe e-mail", the `noscript` line, "Mulțumim, {nume}." (full name as typed) | |
| Acasă | Trial button "Cere un antrenament de probă" and "sau scrieți la …" | replaces "Scrie-ne pentru o probă" |

## Appendix B: Rulings made in this plan

| Ruling | Why |
|---|---|
| Filters are radio groups with `:has()` (as the approved athletes mockup), also on the calendar and news pages where the mockups used `:target` links | `:target` filtering is lost as soon as an in-page link (`#ev-…`) changes the hash; radios are keyboard-native and need no JS |
| "Fotografii" and "Sportivi în articol" on the article are modest section headings, not big display | The mockup drew them big; Mario's rule allows big uppercase only for the page title, a featured title and the closing CTA |
| No empty timetable: without sessions the programme shows one "de confirmat" line | An empty grid is louder than the content |
| Share links are built in the browser; without JS the share row is hidden | The public address is unknown before launch; the mockup hard-coded the old domain |
| One site parse per build (`getSiteData` memoized) | Eight pages and the homepage share one consent filter and one source read |
| Body photos inside the text (`photo` blocks) are supported by the renderer now; the Studio field arrives in plan 2b | The mockup shows a photo in the text column |
| Calendar shows the build year; the panel's next event may be in the next year | Static site; the daily rebuild (plan 2b) keeps it current |
