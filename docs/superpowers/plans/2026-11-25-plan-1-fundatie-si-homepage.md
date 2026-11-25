# Plan 1: Foundation and Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Astro site whose homepage matches mockup D, fed from a Sanity content model the club can edit, running locally and on a test address.

**Architecture:** pnpm workspace with two packages: `web/` (Astro, static output) and `studio/` (Sanity Studio). All content reaches pages through one typed content layer (`web/src/lib/content.ts`) that can read either Sanity or local fixtures, so tests and CI never need the network. Homepage facts (next competition, roster order) are computed by pure functions in `web/src/lib/`, unit-tested apart from the markup. Motion lives in one script and is layered on top of markup that is complete without it.

**Tech Stack:** Node 26, pnpm 10 (npm is broken on this machine: use pnpm only), Astro 7.x, Sanity 6.x with `@sanity/client` 8.x and `@sanity/image-url` 2.x, GSAP 3.15 + ScrollTrigger, Vitest 5, Playwright 1.65, fonts via `@fontsource/big-shoulders-display` and `@fontsource-variable/instrument-sans`. Astro 7 and Sanity 6 are recent: read their current docs before using an API from memory.

**Spec:** `docs/superpowers/specs/2026-11-25-site-siderurgistul-design.md` (Romanian). Visual reference: `mockups/varianta-d.html`, open it in a browser before any UI task.

This is plan 1 of 5. Later plans, each written when its turn comes: (2) inner pages and forms, (3) migration of the 15 old articles, redirects and SEO, (4) FRB sync, (5) launch on the club's domain.

## Global Constraints

- All visible copy is Romanian with correct diacritics (ș ț ă î â, comma-below forms). No English labels.
- Tone: the homepage invites ("de ce să joci badminton"), it does not boast. Rankings appear as proof lower on the page, never in the hero.
- No invented facts. Unknown club data (training hours, prices, captions) renders as the literal text `de confirmat` or is omitted; never placeholder prose presented as fact.
- An athlete is rendered anywhere (roster, hero, counts, tags) only if `consent === true`. This filter lives in the content layer, not in components.
- Colours: blue `#1549A8`, red `#E23A45`, court orange `#F39A1E` (small touches only), white, mist (very light blue) for rest sections, ink (dark navy) for text. Take exact mist/ink/blue-deep values from the mockup's `:root`.
- Type: Big Shoulders Display for display, Instrument Sans for body. Self-hosted, no Google Fonts request at runtime.
- Scale: content column max ~1180px; display type capped near 6rem; hero at most ~85vh.
- Forbidden: cream backgrounds, rounded shadow cards, dashed pill badges, grey skeleton bars, all-caps eyebrow labels above headings, 01/02/03 markers, arrow-suffixed buttons, one accented word in a headline, charts or numbers without real data, decorative widgets (flip scoreboards), tables with empty cells or the same text on every row.
- Motion: only the five moments listed in the spec. No fade-in per section. `prefers-reduced-motion` shows final states. All content visible with JavaScript disabled.
- Every `<img>` carries `width` and `height` attributes.
- Secrets (Sanity tokens, passwords) never enter git. `.env*` is ignored.
- Commits: `type(scope): subject`, made with the repository's configured personal identity; no `Co-Authored-By`, session links or any AI/agent attribution (rule changed by Mario on 2026-11-25; history rewritten to match). Work on branch `dev`. Never push without asking Mario.

## Review Focus

1. **Athlete without parental consent who is tagged or ranked.** Expected: absent from hero, roster and any count, as if not in the data. Pinned in Task 2 (`visibleAthletes`) and Task 4 (mapping).
2. **No upcoming competition** (season ended, or calendar empty). Expected: the calendar block shows the most recent played events and no countdown, never "peste -3 zile" or an empty red band. Pinned in Task 2 (`nextCompetition`, `countdownLabel`) and Task 5.
3. **No ranking data at all** (FRB sync off, which is the launch state). Expected: roster shows name and FRB link without a rank numeral and without an empty gap where it would be; the heading and intro make no claim about rankings. Pinned in Task 2 (`bestRanking`, `rosterOrder`) and Task 5.
4. **Long names and narrow screens** ("Bordeianu Nectarie-Ioan" at 380px). Expected: no horizontal overflow, no clipped text. Pinned in Task 5 and Task 6.
5. **Photo strip with few or mixed-ratio photos** (1 photo, portrait photos). Expected: the strip never pins for a zero or negative distance and the last photo always ends fully in view. Pinned in Task 6.

---

## File Structure

```
pnpm-workspace.yaml            workspace: web, studio
package.json                   root scripts: dev, build, test, e2e
mockups/varianta-d.html        visual reference (already in repo)
mockups/img/                   the club's photos used by the mockup and by fixtures
web/
  astro.config.mjs
  src/styles/tokens.css        colours, type scale, spacing: the only place values live
  src/styles/base.css          reset, typography, .wrap, .display, focus styles
  src/layouts/Base.astro       <head>, header, footer, skip link
  src/components/SiteHeader.astro, SiteFooter.astro
  src/components/home/Hero.astro, Why.astro, Groups.astro, CalendarBand.astro,
                      Roster.astro, Hall.astro, News.astro, TrialCta.astro
  src/lib/types.ts             content types shared by everything
  src/lib/dates.ts             Romanian date formatting
  src/lib/home.ts              pure homepage logic
  src/lib/content.ts           getHomeData(): Sanity or fixtures
  src/lib/sanity.ts            client, GROQ, raw->typed mapping
  src/fixtures/home.json       real facts from the spec, used by tests and offline dev
  src/scripts/motion.ts        all GSAP code
  src/pages/index.astro
  tests/unit/*.test.ts         Vitest
  tests/e2e/*.spec.ts          Playwright
studio/
  sanity.config.ts, sanity.cli.ts
  schemaTypes/athlete.ts, group.ts, competition.ts, post.ts, siteSettings.ts, index.ts
  seed/seed.ndjson             same facts as the fixture, importable
```

---

### Task 1: Workspace, design tokens and page shell

**Files:**
- Create: `pnpm-workspace.yaml`, root `package.json`, `web/` (Astro minimal project), `web/src/styles/tokens.css`, `web/src/styles/base.css`, `web/src/layouts/Base.astro`, `web/src/components/SiteHeader.astro`, `web/src/components/SiteFooter.astro`, `web/src/pages/index.astro`, `web/playwright.config.ts`, `web/vitest.config.ts`
- Test: `web/tests/e2e/shell.spec.ts`

**Interfaces:**
- Produces: `Base.astro` with props `{ title: string; description: string }` and a default slot; CSS custom properties `--blue --red --court --white --mist --ink --blue-deep --display --body`; utility classes `.wrap` (max-width column) and `.display` (display face, uppercase, tight leading). Root scripts: `pnpm dev`, `pnpm build`, `pnpm test` (Vitest), `pnpm e2e` (Playwright against `astro preview`).
- Nav items, in order: Acasă, Sportivi, Program, Calendar, Noutăți, Contact. Header shows the crest (`mockups/img/logo.jpg` copied to `web/public/`) and "CS Siderurgistul Galați". Footer: "Sala Siderurgistul, Bd. Cloșca, Galați", `siderurgistul@badmintongalati.ro`, "Afiliat la Federația Română de Badminton", links to badminton.ro, badmintoneurope.com, bwfbadminton.com.

- [ ] **Step 1: Write the failing e2e test** `shell.spec.ts`:

```ts
test('shell renders in Romanian with nav and footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  for (const n of ['Acasă','Sportivi','Program','Calendar','Noutăți','Contact'])
    await expect(page.getByRole('navigation').getByRole('link', { name: n })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('siderurgistul@badmintongalati.ro');
});
for (const width of [380, 1440]) test(`no horizontal overflow at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
test('fonts are self-hosted', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', r => hosts.add(new URL(r.url()).host));
  await page.goto('/');
  expect([...hosts].some(h => h.includes('googleapis') || h.includes('gstatic'))).toBe(false);
});
```

- [ ] **Step 2: Run it, expect failure.** Run: `pnpm e2e` → FAIL (no project yet).
- [ ] **Step 3: Scaffold the workspace and Astro project** with pnpm (static output, TypeScript strict). Configure Playwright to use `/usr/bin/google-chrome` and a `webServer` that runs `astro preview` on a fixed port. On narrow screens the nav collapses behind a "Meniu" button that works without JavaScript (`<details>`).
- [ ] **Step 4: Port tokens and base styles** from the `<style>` block of `mockups/varianta-d.html` into `tokens.css` and `base.css`; build `Base.astro`, header and footer from the mockup's markup. Drop the mockup's fixed "Varianta D" bar.
- [ ] **Step 5: Run tests.** Run: `pnpm e2e` → 4 passed. Run: `pnpm build` → completes with no warnings.
- [ ] **Step 6: Commit** `feat(web): scaffold workspace, tokens and page shell`.

---

### Task 2: Homepage logic as pure functions

**Files:**
- Create: `web/src/lib/types.ts`, `web/src/lib/dates.ts`, `web/src/lib/home.ts`
- Test: `web/tests/unit/dates.test.ts`, `web/tests/unit/home.test.ts`

**Interfaces:**
- Produces, in `types.ts`:

```ts
export type Img = { url: string; width: number; height: number; alt: string };
export type Discipline = 'SB' | 'SF' | 'DB' | 'DF' | 'DX';
export type Ranking = { category: string; discipline: Discipline; place: number; points?: number };
export type RankingWeek = { week: number; from: string; to: string }; // ISO dates
export type Athlete = { id: string; name: string; slug: string; consent: boolean; frbUrl?: string; photo?: Img; rankings: Ranking[] };
export type Competition = { id: string; title: string; city: string; start: string; end: string; home: boolean; postSlug?: string };
export type Group = { name: string; audience: string; track: 'performanta' | 'amatori'; schedule?: string };
export type PostKind = 'competitie' | 'viata-clubului' | 'proiecte';
export type Post = { title: string; slug: string; kind: PostKind; date: string; cover?: Img };
export type HomeData = {
  athletes: Athlete[]; rankingWeek?: RankingWeek; competitions: Competition[];
  groups: Group[]; posts: Post[]; hallPhotos: Img[];
  heroLines: string[]; heroText: string; heroPhoto: Img;
  whyIntro: string; whyPhoto: Img; whyPoints: { title: string; text: string }[]; hallText: string; groupsIntro: string; trialText: string;
};
```

- Produces, in `dates.ts`: `formatDateRo(iso: string): string`, `formatRangeRo(start: string, end: string): string`.
- Produces, in `home.ts`:
  - `visibleAthletes(a: Athlete[]): Athlete[]`
  - `bestRanking(a: Athlete): Ranking | undefined` (lowest `place`)
  - `rosterOrder(a: Athlete[]): Athlete[]` (consented only; ranked first by best place ascending, then unranked by name using Romanian collation)
  - `splitCalendar(c: Competition[], today: string): { next?: Competition; played: Competition[] }` (`played` newest first, max 3)
  - `countdownLabel(next: Competition, today: string): string | undefined`
  - `disciplineLabel(d: Discipline): string` → `simplu băieți`, `simplu fete`, `dublu băieți`, `dublu fete`, `dublu mixt`
  - `postKindLabel(k: PostKind): string` → `Competiție`, `Viața clubului`, `Proiecte`

- [ ] **Step 1: Write failing tests** with the spec's real values:

```ts
// dates.test.ts
expect(formatDateRo('2026-06-30')).toBe('30 iunie 2026');
expect(formatRangeRo('2026-11-27', '2026-11-29')).toBe('27–29 noiembrie 2026');
expect(formatRangeRo('2026-10-30', '2026-11-01')).toBe('30 octombrie – 1 noiembrie 2026');

// home.test.ts
const nistor = { id:'1', name:'Nistor Cristian-Ionuț', slug:'nistor-cristian-ionut', consent:true,
  rankings:[{category:'U17',discipline:'SB',place:2,points:168}] };
const pazargic = { id:'2', name:'Pazargic Ligia-Beatrice', slug:'pazargic-ligia-beatrice', consent:true,
  rankings:[{category:'U15',discipline:'SF',place:3}] };
const bordeianu = { id:'3', name:'Bordeianu Nectarie-Ioan', slug:'bordeianu-nectarie-ioan', consent:true,
  rankings:[{category:'U13',discipline:'DX',place:58}] };
const hidden = { ...nistor, id:'4', name:'Fără Acord', consent:false, rankings:[{category:'U19',discipline:'SB',place:1}] };
test('no consent means not in the roster', () =>
  expect(rosterOrder([hidden, nistor]).map(a => a.name)).toEqual(['Nistor Cristian-Ionuț']));
test('an athlete without rankings has no best ranking', () =>
  expect(bestRanking({ ...nistor, rankings: [] })).toBeUndefined());
test('roster order: best place first, unranked last by name', () =>
  expect(rosterOrder([bordeianu, { ...pazargic, rankings: [] }, nistor]).map(a => a.id)).toEqual(['1','3','2']));

const comps = [
  { id:'a', title:'CN U9 & CN U17', city:'București', start:'2026-11-27', end:'2026-11-29', home:false },
  { id:'b', title:'CN U15 & CN Seniori', city:'Blejoi/Bacău', start:'2026-11-20', end:'2026-11-22', home:false },
  { id:'c', title:'CN U11 & CN U19', city:'Galați', start:'2026-10-23', end:'2026-10-25', home:true },
  { id:'d', title:'CN U13 & CN U23', city:'Blejoi/Bacău', start:'2026-09-25', end:'2026-09-27', home:false },
  { id:'e', title:'CN Echipe U15', city:'Galați', start:'2026-09-18', end:'2026-09-20', home:true } ];
test('calendar splits on today', () => {
  const s = splitCalendar(comps, '2026-11-25');
  expect(s.next?.id).toBe('a'); expect(s.played.map(c => c.id)).toEqual(['b','c','d']);
});
test('an event in progress is still "next"', () =>
  expect(splitCalendar(comps, '2026-11-28').next?.id).toBe('a'));
test('after the season there is no next event', () => {
  const s = splitCalendar(comps, '2026-12-05');
  expect(s.next).toBeUndefined(); expect(s.played[0].id).toBe('a');
});
test('countdown wording', () => {
  expect(countdownLabel(comps[0], '2026-11-25')).toBe('peste 2 zile');
  expect(countdownLabel(comps[0], '2026-11-26')).toBe('începe mâine');
  expect(countdownLabel(comps[0], '2026-11-27')).toBe('începe azi');
  expect(countdownLabel(comps[0], '2026-11-28')).toBe('în desfășurare');
  expect(countdownLabel(comps[0], '2026-08-01')).toBeUndefined(); // more than 60 days away
});
```

- [ ] **Step 2: Run, expect failure.** Run: `pnpm test` → FAIL (modules missing).
- [ ] **Step 3: Implement `dates.ts` and `home.ts`.** All date maths on ISO date strings in the `Europe/Bucharest` calendar, never on local `Date` time-of-day.
- [ ] **Step 4: Run tests.** Run: `pnpm test` → all pass.
- [ ] **Step 5: Commit** `feat(web): homepage logic with tests`.

---

### Task 3: Sanity Studio and content model

**Prerequisite (Mario, once, about 3 minutes):** a Sanity account, signed up with email and a password of Mario's choosing. In this session Mario runs `! pnpm dlx sanity@latest login`. The implementer then creates the project (name `Siderurgistul Galati`, dataset `production`) with the CLI and records the project id in `studio/.env` and `web/.env` (both git-ignored) and in `web/.env.example` as an empty key. If Mario has not logged in yet, do Tasks 4 to 6 first (they run on fixtures) and return here.

**Files:**
- Create: `studio/package.json`, `studio/sanity.config.ts`, `studio/sanity.cli.ts`, `studio/schemaTypes/{athlete,group,competition,post,siteSettings,index}.ts`, `studio/seed/seed.ndjson`
- Test: `studio/tests/schema.test.ts`

**Interfaces:**
- Produces document types and field names (the content layer in Task 4 depends on these exact names):
  - `athlete`: `name` (required), `slug` (from name, required), `consent` (boolean, **initial value false**, title "Acord părinte"), `frbUrl` (url), `photo` (image with `alt`), `group` (reference to `group`), `rankings[]` of `{category, discipline, place, points}` (read-only in the Studio: filled by the sync in plan 4)
  - `group`: `name`, `audience`, `track` (`performanta` | `amatori`), `schedule` (string, optional), `order` (number)
  - `competition`: `title`, `city`, `start` (date), `end` (date), `home` (boolean), `post` (reference to `post`, optional)
  - `post`: `title`, `slug`, `kind` (`competitie` | `viata-clubului` | `proiecte`), `date`, `cover` (image with `alt`), `body` (portable text), `gallery[]` (images), `competition` (reference, optional), `results[]` of `{athlete (reference), discipline, result}` where `result` is `aur` | `argint` | `bronz` | free text place; all of `results` optional
  - `siteSettings` (singleton): `heroLines[]` (2 to 4 short strings, the motto, one per headline line), `heroText`, `heroPhoto`, `whyIntro`, `whyPhoto`, `whyPoints[]` of `{title, text}`, `hallText`, `hallPhotos[]`, `groupsIntro`, `trialText`, `rankingWeek` `{week, from, to}`
- All field titles and descriptions in the Studio are Romanian, written for a coach on a phone ("Poza principală", not "Cover image"). The `post` form lists `title`, `kind`, `date`, `cover`, `body`, `gallery` first; references and results come after, in a collapsed group "Legături".

- [ ] **Step 1: Write the failing test** `schema.test.ts`: import the schema array and assert (a) the five type names exist, (b) `athlete.consent` has `initialValue === false`, (c) `post.kind` options are exactly `competitie`, `viata-clubului`, `proiecte`, (d) every image field declares a required `alt` sub-field.
- [ ] **Step 2: Run, expect failure.** Run: `pnpm --filter studio test` → FAIL.
- [ ] **Step 3: Create the Studio package and schemas.**
- [ ] **Step 4: Write `seed.ndjson`** with the real facts: the three athletes above (all `consent: true` for the seed only, flagged in a comment line in the README as test data pending real consent), the five groups (Inițiere, Performanță, Elite → `performanta`; Amatori copii, Amatori adulți → `amatori`; audiences as in the mockup; no `schedule`), the 12 competitions of the 2026 calendar from the audit (dates, cities, `home: true` for Galați), the three posts (Novi Sad – 2026, 2026-06-30; București, Memorialul Rotaru U15 – 2026, 2026-05-13; București, Cupa României U15 – 2026, 2026-04-01; all `competitie`), `siteSettings` with `heroLines` [`Ai reușit?`, `Continuă!`, `N-ai reușit?`, `Continuă!`] (the club's own motto, from their current site), `whyIntro` and the five `whyPoints` copied from the "De ce badminton" section of `mockups/varianta-d.html` (they are the club's own benefit list from its current homepage, shortened), `heroText` "CS Siderurgistul Galați crește jucători de badminton din 7 martie 2002, în sala cu patru terenuri de pe Bulevardul Cloșca." and `rankingWeek {46, 2026-11-09, 2026-11-15}`.
- [ ] **Step 5: Run tests and validate.** Run: `pnpm --filter studio test` → pass. Run the Sanity CLI schema validation → no errors. If the project exists: import the seed and open the Studio locally; confirm an athlete can be created and saved from a 390px-wide window.
- [ ] **Step 6: Commit** `feat(studio): content model and seed data`.

---

### Task 4: Content layer

**Files:**
- Create: `web/src/lib/content.ts`, `web/src/lib/sanity.ts`, `web/src/fixtures/home.json`, `web/.env.example`
- Test: `web/tests/unit/content.test.ts`

**Interfaces:**
- Consumes: types from Task 2; field names from Task 3.
- Produces: `getHomeData(): Promise<HomeData>`. Source chosen by env `CONTENT_SOURCE` (`fixtures` | `sanity`; default `fixtures` when `SANITY_PROJECT_ID` is unset). `toHomeData(raw: unknown): HomeData` in `sanity.ts` maps the GROQ result to `HomeData`, applies `visibleAthletes`, and builds each `Img` with `url`, `width`, `height` from Sanity asset metadata.
- `home.json` holds the same facts as the seed, with images pointing at files copied from `mockups/img/` into `web/public/img/` and their real pixel sizes.

- [ ] **Step 1: Write failing tests:**

```ts
test('fixtures satisfy HomeData', async () => {
  process.env.CONTENT_SOURCE = 'fixtures';
  const d = await getHomeData();
  expect(d.groups).toHaveLength(5); expect(d.competitions).toHaveLength(12);
  expect(d.posts.map(p => p.title)).toContain('Novi Sad – 2026');
  for (const img of [d.heroPhoto, ...d.hallPhotos]) { expect(img.width).toBeGreaterThan(0); expect(img.alt).not.toBe(''); }
});
test('mapping drops athletes without consent', () => {
  const raw = { ...rawSample, athletes: [{ ...rawAthlete, consent: true }, { ...rawAthlete, _id: 'x', consent: false }, { ...rawAthlete, _id: 'y' /* consent missing */ }] };
  expect(toHomeData(raw).athletes).toHaveLength(1);
});
test('mapping tolerates empty optional data', () => {
  const d = toHomeData({ ...rawSample, athletes: [], competitions: [], posts: [], settings: { ...rawSample.settings, hallPhotos: null, rankingWeek: null } });
  expect(d.hallPhotos).toEqual([]); expect(d.rankingWeek).toBeUndefined();
});
```

- [ ] **Step 2: Run, expect failure.** `pnpm test` → FAIL.
- [ ] **Step 3: Implement.** One GROQ query for the whole homepage. Read-only public dataset, no token in the web package.
- [ ] **Step 4: Run tests.** `pnpm test` → pass.
- [ ] **Step 5: Commit** `feat(web): typed content layer with fixtures`.

---

### Task 5: Homepage sections, without motion

**Files:**
- Create: the eight components in `web/src/components/home/`; modify `web/src/pages/index.astro`
- Test: `web/tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `getHomeData()`, the functions of Task 2, `Base.astro`.
- Produces: one section per component, in this order and with these ids: `Hero` (no id), `Why` `#de-ce`, `Groups` `#program`, `CalendarBand` `#calendar`, `Roster` `#sportivi`, `Hall`, `News` `#noutati`, `TrialCta` `#proba`. Each takes only the slice of `HomeData` it renders. Class hooks used by Task 6: hero lines `.l1 .l2 .l3`, `.poster`, `.poster img`; roster numerals `[data-roll]`; section headings `h2.display`; strip `.hall .track`.
- Markup and styles come from `mockups/varianta-d.html` section by section. Hero: one headline line per entry of `heroLines` (odd lines get class `.l1`/`.l3`, even lines `.l2`, as in the mockup), `heroText` below, primary action "Vino la un antrenament de probă" → `#proba`, secondary "Vezi toți sportivii" → `#sportivi`. Why: heading "De ce badminton", `whyIntro`, `whyPhoto` with the red offset plate, `whyPoints` as a plain two-column list (title, text), no icons and no cards. Calendar: next event large with `countdownLabel`, then `played` with the word `jucat` and the mark `acasă` when `home`; link "Tot calendarul 2026". Roster: `rosterOrder`; the first row large, later rows smaller; numeral, name, discipline and category, points when known, link "Profilul FRB" when `frbUrl`; heading "Unde ajung cei care continuă"; under it the source line "Clasamentul FRB, săptămâna {week}, {range}" only when `rankingWeek` exists. Groups: heading "Cinci grupe, pe două drumuri", two lists titled "Pentru cine vrea performanță" and "Pentru cine vrea doar să joace"; `schedule` on the row when present. News: first post with cover, others as a list, each with kind label and date; link "Toate articolele". Links to pages that plan 2 will build point at their future paths (`/sportivi/`, `/calendar/`, `/noutati/`).

- [ ] **Step 1: Write failing e2e tests** (fixtures as source):

```ts
test('hero carries the club motto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Ai reușit\?\s*Continuă!\s*N-ai reușit\?\s*Continuă!/);
  await expect(page.locator('.hero')).not.toContainText('Locul');
});
test('roster names its source', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sportivi')).toContainText('Clasamentul FRB, săptămâna 46, 9–15 noiembrie 2026');
});
test('sections appear in the agreed order', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('main > section').evaluateAll(s => s.map(e => e.id || e.className.split(' ')[0]));
  expect(ids).toEqual(['hero','de-ce','program','calendar','sportivi','hall','noutati','proba']);
});
test('groups are two plain lists', async ({ page }) => {
  await page.goto('/');
  const g = page.locator('#program');
  await expect(g.getByRole('heading', { name: 'Pentru cine vrea performanță' })).toBeVisible();
  await expect(g.getByRole('listitem')).toHaveCount(5);
  await expect(g.locator('table')).toHaveCount(0);
});
test('every image declares its size and has alt text', async ({ page }) => {
  await page.goto('/');
  const bad = await page.locator('img').evaluateAll(i => i.filter(e => !e.getAttribute('width') || !e.getAttribute('height') || !e.getAttribute('alt')).length);
  expect(bad).toBe(0);
});
test('all content is visible without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false }); const page = await ctx.newPage();
  await page.goto('/');
  for (const t of ['Ai reușit?', 'Prinzi încredere', 'Nistor Cristian-Ionuț', 'Amatori adulți', 'Novi Sad – 2026'])
    await expect(page.getByText(t).first()).toBeVisible();
});
for (const width of [380, 768, 1440]) test(`no overflow or clipped names at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const name = page.getByText('Bordeianu Nectarie-Ioan').first();
  const box = await name.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
});
```

Plus two tests that swap the fixture through an env-selected file (`HOME_FIXTURE=empty-season.json`, `HOME_FIXTURE=no-rankings.json`, both created in this task):
- no upcoming competition: `#calendar` shows three `jucat` rows, no element with the countdown, and no text matching `/peste -?\d+ zile/`;
- no rankings: `#sportivi` has no "Clasamentul FRB" line, roster rows show names and FRB links, and there is no `[data-roll]` element.

- [ ] **Step 2: Run, expect failure.** `pnpm e2e` → FAIL.
- [ ] **Step 3: Build the components** one section at a time, comparing each against the mockup in a browser at 1440 and 390.
- [ ] **Step 4: Run tests.** `pnpm e2e` → pass. `pnpm build` → no warnings.
- [ ] **Step 5: Screenshot review.** Capture full-page screenshots at 1440 and 390 and look at them next to the mockup; fix differences in spacing, type size and colour.
- [ ] **Step 6: Commit** `feat(web): homepage sections from mockup D`.

---

### Task 6: Motion

**Files:**
- Create: `web/src/scripts/motion.ts`; modify `web/src/pages/index.astro` to load it
- Test: `web/tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: the class hooks of Task 5.
- Produces: `initMotion(): void`, called once on page load. It returns immediately when `prefers-reduced-motion: reduce` matches. The five moments, ported from the mockup's `<script>`: hero load sequence; hero scrub (pinned for 70% of a viewport on wide screens, unpinned scrub on narrow); roster numerals rolling with scroll; section headings drifting sideways; hall strip travelling sideways while pinned. GSAP is bundled from the npm package, not loaded from a CDN.
- Strip distance is `track.scrollWidth - visibleWidth`; when it is ≤ 0 the strip is not pinned at all. Recalculate on resize and after each strip image loads.

- [ ] **Step 1: Write failing e2e tests:**

```ts
test('photo strip travels until the last photo is fully in view', async ({ page }) => {
  for (const [w, h] of [[1904, 950], [1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h }); await page.goto('/', { waitUntil: 'networkidle' });
    const top = await page.evaluate(() => document.querySelector('.hall')!.getBoundingClientRect().top + scrollY);
    await page.evaluate(y => scrollTo(0, y - 200), top); await page.waitForTimeout(800);
    const startX = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.hall .track')!).transform).m41);
    await page.evaluate(y => scrollTo(0, y + 6000), top); await page.waitForTimeout(1200);
    const end = await page.evaluate(() => { const t = document.querySelector('.hall .track')!;
      return { x: new DOMMatrix(getComputedStyle(t).transform).m41, right: t.lastElementChild!.getBoundingClientRect().right }; });
    expect(end.x).toBeLessThan(startX - 500);
    expect(end.right).toBeLessThanOrEqual(w + 1);
  }
});
test('a strip with a single photo does not pin', async ({ page }) => { /* HOME_FIXTURE=one-photo.json: scrolling past .hall moves the page, track transform stays identity */ });
test('reduced motion shows final states', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' }); const page = await ctx.newPage(); await page.goto('/');
  await expect(page.locator('#sportivi [data-roll]').first()).toHaveText('2');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.l1')!).transform)).toMatch(/none|matrix\(1, 0, 0, 1, 0, 0\)/);
});
test('motion never causes horizontal overflow mid-scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(150);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0); }
});
test('no page errors', async ({ page }) => { const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('/'); await page.mouse.wheel(0, 8000); await page.waitForTimeout(800); expect(errs).toEqual([]); });
```

- [ ] **Step 2: Run, expect failure.** `pnpm e2e` → FAIL.
- [ ] **Step 3: Implement `motion.ts`** from the mockup's script, split into one function per moment.
- [ ] **Step 4: Run tests.** `pnpm e2e` → pass (Task 5's no-JS and overflow tests included).
- [ ] **Step 5: Watch it move.** Record a scroll-through at 1440 and 390 (Playwright video) and review the frames: nothing blocks reading, the hero pin feels short, the strip ends on the last photo.
- [ ] **Step 6: Commit** `feat(web): scroll motion for hero, roster and photo strip`.

---

### Task 7: Test address

**Prerequisite (Mario):** an account at the chosen static host and permission to publish the unfinished site at a public test URL. Do not create accounts or publish without Mario's explicit go-ahead in the session.

**Files:**
- Create: `README.md` (how to run, test, edit content, deploy; in Romanian), host config file as required
- Modify: `web/astro.config.mjs` (`site` URL)

**Interfaces:**
- Produces: a public test URL serving the build with `CONTENT_SOURCE=sanity`; a documented rebuild trigger so a change published in the Studio reaches the test site without Mario running a command.

- [ ] **Step 1: Choose the host.** Requirement from the spec: must later serve `badmintongalati.ro` and `www` while nameservers stay at ROMARG (apex via A/ALIAS record without moving DNS). Check the current docs of Cloudflare Pages and Netlify for this and record the choice and the reason in the README.
- [ ] **Step 2: Add `<meta name="robots" content="noindex">` on the test address only** (env-driven), so the unfinished site is not indexed.
- [ ] **Step 3: Deploy and verify.** Run the e2e suite against the test URL (`BASE_URL=<url> pnpm e2e`) → pass. Edit a post title in the Studio, publish, confirm the test site shows it after the rebuild.
- [ ] **Step 4: Commit** `chore(deploy): test address and README`.
