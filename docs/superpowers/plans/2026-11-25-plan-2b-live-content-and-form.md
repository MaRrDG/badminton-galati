# Plan 2b: Live Content and the Trial Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The inner pages of plan 2a read live content from Sanity with responsive images, the trial form reaches the club through a small endpoint on Mario's server, and a server-side pipeline rebuilds the site when coaches publish, without Mario's PC.

**Architecture:** The Studio gains the fields the eight pages read; one GROQ query per build (`SITE_QUERY`, composed of one projection per page's data) feeds `toSiteData()`, which hands the same `SiteData` to `parseSiteData()` that the fixtures use, so every page getter of plan 2a works unchanged on both sources. Images from Sanity get `srcset`, crop-true sizes and the hotspot as `object-position`; fixture images stay plain files. A new workspace package `deploy/` holds two Node 26 services run from TypeScript sources: `trial-api` (validates with the same `web/src/lib/trial.ts` as the browser, stores every request as a JSON line, mails when SMTP is configured) and `publisher` (checks Sanity and the `dev` branch every 15 minutes, builds once a day regardless, swaps releases atomically through a `current` symlink). nginx serves `site/current` and proxies `/api/`.

**Tech Stack:** As plan 2a, plus `@sanity/image-url` (web), `nodemailer` (deploy), Docker Compose on the server (nginx:alpine, node:26-alpine with corepack pnpm). Node 26 runs `.ts` files directly (type stripping), so service code uses erasable TypeScript only (no enums, no namespaces, no parameter properties). Read the current docs of `@sanity/image-url`, Sanity 6 schema validation, nodemailer and Docker Compose (`env_file` with `required: false`, git build contexts) before using them from memory.

**Spec:** `docs/superpowers/specs/2026-11-25-site-siderurgistul-design.md`, plan 2a (`docs/superpowers/plans/2026-11-25-plan-2a-inner-pages.md`, its types and getters are this plan's starting point), `docs/ai/architecture.md` (deploy section). Decisions for this stage (Mario, 2026-11-25) are copied into Global Constraints.

## Global Constraints

- Everything in plan 2a's Global Constraints holds (consent, no invented facts, Romanian copy with ș ț, test speed, commit rules, public repo).
- **The club's missing data never blocks.** Schedule, prices, consents, captions, coach roles, phone: every page renders its plan 2a "de confirmat" or omitted state from a Studio that holds only the seed. A Studio without the published `siteSettings` document still fails the build with its plan 1 message (the homepage has no designed empty state; this is intended).
- **Consent in Sanity:** the query returns only athletes with `consent == true` and only result rows whose athlete has `consent == true`; `parseSiteData` filters again.
- **Secrets** live only in untracked env files on the server (`publish.env`: Sanity read token; `trial.env`: SMTP settings), mode 600. Tracked templates (`deploy/*.env.example`) hold empty values. Mario creates the Sanity read token himself (documented steps in Task 8); no agent creates, reads or handles tokens or SMTP credentials.
- **Personal data** from the form (name, phone, child's age, message) is stored only in `data/trial/requests.jsonl` on the server volume and, when SMTP is configured, in one email to the club. It never enters git, logs (log lines carry no name, phone or message) or the built site.
- **The endpoint works without SMTP.** The club has not supplied SMTP credentials; without `SMTP_HOST` the request is stored and the parent sees success.
- **Publishing:** check every 15 minutes, build only if Sanity content changed (latest `_updatedAt` plus document count) or the `dev` commit changed, and once a day after 03:30 Europe/Bucharest regardless (keeps "next competition" and today's date right). A failed build never replaces the served site.
- No server address, user or path in tracked files; the repository URL `https://github.com/MaRrDG/badminton-galati.git` is public and may appear.
- Studio titles, descriptions and validation messages in Romanian, written for a coach on a phone.
- Tests: Studio and deploy logic are unit tests (no network, temporary directories); e2e adds no fixture server; the form's server answers are mocked with `page.route`.

## Review Focus

1. **A result row naming an athlete whose parents have not consented, coming from Sanity** (the Studio's reference filter only governs new picks; consent can be withdrawn later). Expected: the row is not in the query result and not on the article or the profile; the athlete has no page. Pinned in Task 3 (query and mapping tests).
2. **A publish that fails halfway** (Sanity unreachable, token revoked, a broken commit on `dev`, the disk full). Expected: the served site stays on the previous release, no half-written release is ever the target of `current`, the failure is logged, and the same content is retried at most once an hour. Pinned in Task 7.
3. **Coach photos as they really arrive** (portrait phone photos placed in landscape slots, a crop set in the Studio, a small 600px image, an image whose upload has no metadata). Expected: `width`/`height` match the cropped ratio, `srcset` never asks for more pixels than the source has, the hotspot positions the crop, an image without size or alt is dropped. Pinned in Task 2.
4. **Abuse of `/api/proba`** (honeypot filled, the same address sending a sixth request within ten minutes, a 50 KB body, JSON that is not an object, a GET). Expected: spam gets an ordinary success answer and is not stored; flood gets 429; oversized 413; garbage 400 with field errors; wrong method 405. Pinned in Task 4.
5. **SMTP missing or failing.** Expected: the request is stored before any mail attempt, the parent sees success either way, the failure is logged without personal data; with no `SMTP_HOST` no mail is attempted. Pinned in Task 4.

---

## File Structure

```
studio/schemaTypes/  coach.ts, clubInfo.ts (new); athlete.ts, group.ts, competition.ts, post.ts,
                     siteSettings.ts, shared.ts, index.ts (changed)
studio/seed/seed.ndjson, studio/tests/schema.test.ts, studio/sanity.config.ts
web/src/lib/images.ts          Sanity image -> Img with srcset, crop size, hotspot position
web/src/lib/sanity.ts          SITE_QUERY, fetchSiteQuery(), toSiteData() (HOME_QUERY, toHomeData removed)
web/src/pages/contact/{trimis,netrimis}.astro   no-JS outcome pages
deploy/                        workspace package "deploy"
  package.json, vitest.config.ts
  trial-api/{server,handler,rate,store,mail,config}.ts, Dockerfile
  publish/{main,decide,fingerprint,release,build,config}.ts, Dockerfile
  tests/*.test.ts
  docker-compose.yml, nginx.conf (changed), publish.env.example, trial.env.example
scripts/deploy.sh              syncs config, rebuilds services, asks the publisher to build now
```

---

### Task 1: Studio fields for the inner pages

**Files:**
- Create: `studio/schemaTypes/coach.ts`, `studio/schemaTypes/clubInfo.ts`
- Modify: `studio/schemaTypes/{athlete,group,competition,post,siteSettings,shared,index}.ts`, `studio/sanity.config.ts`, `studio/seed/seed.ndjson`, `web/src/fixtures/home.json` (parity only if a fact differs), `web/tests/unit/content.test.ts` (parity test)
- Test: `studio/tests/schema.test.ts`, `web/tests/unit/content.test.ts`

**Interfaces** (field names are the contract for Task 3's query):
- `shared.ts`: `captionField` (`caption`, string, optional, "Text sub poză", description "Opțional. Lasă gol dacă nu știi sigur ce se vede."); `weekdays` options `[{ title: 'Luni', value: 1 } … { title: 'Duminică', value: 7 }]`; `competitionCategories` options from the list `U9 U11 U13 U15 U17 U19 U23 Seniori Echipe`.
- `athlete`: + `birthYear` ("Anul nașterii", number, integer, 1950 to the current year, description "Pentru categoria de vârstă (U9, U11…) cât timp sportivul nu are loc în clasament."). `group` (exists) is now read by the site.
- `coach` ("Antrenor", new document): `name` (required), `role` ("Rolul în club", optional, e.g. "antrenor"), `photo` (image + `altField`), `order` (integer ≥ 1, required). Preview: name, role.
- `group`: + `slug` (from name, `slugifyRo`, required), + `coach` (reference to `coach`, optional), + `sessions[]` ("Antrenamente": `{ day (number, weekdays list, required), start, end }` with `start`/`end` strings validated `^([01]\d|2[0-3]):[0-5]\d$` and "Ora de sfârșit trebuie să fie după ora de început."); − `schedule` (replaced by `sessions`; empty in the dataset).
- `competition`: + `categories` (array of strings from `competitionCategories`, `layout: 'grid'`, unique), + `resultsUrl` ("Rezultatele pe badminton.ro", url, optional); − `post` (post → competition is the only link; a value left in a document shows in the Studio as an unknown field, see Task 8).
- `post`: `body` gains an image member `bodyImage` ("Poză în text", `altField`, `captionField`); gallery images gain `captionField`.
- `siteSettings`: `hallPhotos` `validation: max(8)` ("Cel mult 8 poze în bandă."), each with `captionField`.
- `clubInfo` ("Informații pentru părinți și contact", singleton id `clubInfo`): `parentsAge`, `parentsEquipment`, `parentsCost`, `parentsFirstWeeks`, `parentsRegistration`, `programNote` (all `text`, optional, each described with the question it answers, e.g. "De la ce vârstă poate începe copilul?"), `contactPhone` (string, "Un număr al clubului; nu numere personale."), `contactDirections` (text), `replyDays` (integer 1–30, "În câte zile răspundeți la o cerere de probă").
- `sanity.config.ts`: structure adds "Informații pentru părinți și contact" (singleton) after "Pagina principală" and "Antrenori" after "Grupe"; `singletons: ['siteSettings', 'clubInfo']`.
- Seed: 3 coach documents (`coach-dorel-badiu`, `coach-iulian-calin`, `coach-adrian-panfil`, names only, `order` 1–3); group `slug`s as plan 2a's `home.json`; competition `categories` as `home.json`; an empty `clubInfo` document; no sessions, no roles, no birth years.
- The live dataset already holds the plan 1 seed, so it needs the new values too: `shared.ts` exports `categoriesFromTitle(title: string): string[]` (every `U\d+`, `Seniori`, `Echipe` in the title, in list order, unique), and `studio/migrations/inner-pages/index.ts` (Sanity's `defineMigration`, read its current docs) sets `group.slug` from the name and `competition.categories` from the title only where they are missing. Mario runs it (Task 8); new seed documents (coaches, `clubInfo`) go in with an import of missing documents only.

- [ ] **Step 1: Write failing tests** in `schema.test.ts`:

```ts
expect(typeNames).toEqual(expect.arrayContaining(['coach', 'clubInfo']));
expect(field('competition', 'post')).toBeUndefined();
expect(options(field('competition', 'categories'))).toEqual(['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'U23', 'Seniori', 'Echipe']);
expect(field('group', 'schedule')).toBeUndefined();
expect(await validate(field('group', 'sessions'), [{ day: 1, start: '18:30', end: '17:00' }])).toContain('Ora de sfârșit trebuie să fie după ora de început.');
expect(await validate(field('group', 'sessions'), [{ day: 1, start: '9:00', end: '10:00' }])).not.toEqual([]);
expect(await validate(field('siteSettings', 'hallPhotos'), Array(9).fill(img))).not.toEqual([]);
expect(memberNames(field('post', 'body'))).toContain('bodyImage');            // with a required alt
expect(requiredFields('coach')).toEqual(['name', 'order']);
// seed
expect(ofType('coach').map(c => c.name)).toEqual(['Dorel Badiu', 'Iulian Călin', 'Adrian Panfil']);
expect(ofType('coach').every(c => c.role === undefined)).toBe(true);
expect(ofType('clubInfo')).toHaveLength(1);
expect(categoriesFromTitle('CR Echipe Seniori și Cupa U15')).toEqual(['U15', 'Seniori', 'Echipe']);
expect(ofType('competition').every(c => JSON.stringify(c.categories) === JSON.stringify(categoriesFromTitle(c.title)))).toBe(true);
```

And extend the web parity test: `home.json` group `id`/`slug`, competition `categories` and coach `id`/`name` equal the seed's.

- [ ] **Step 2: Run, expect failure.** `pnpm --filter studio test` and `pnpm -C web test -- content` → FAIL.
- [ ] **Step 3: Implement the schemas, structure and seed.**
- [ ] **Step 4: Run.** `pnpm --filter studio test`, `pnpm --filter studio typecheck`, `pnpm --filter studio validate`, `pnpm -C web test -- content` → pass.
- [ ] **Step 5: Commit** `feat(studio): coaches, sessions, categories, club answers and photo captions`.

---

### Task 2: Responsive images from Sanity

**Files:**
- Create: `web/src/lib/images.ts`
- Modify: `web/package.json` (`@sanity/image-url`), `web/src/lib/types.ts` (`Img.caption?`), `web/src/lib/content.ts` (parse accepts `caption`), `web/src/components/ui/Photo.astro`, the call sites that pass `sizes` (list below), `web/src/components/news/Gallery.astro`, `web/src/scripts/lightbox.ts`, `web/src/components/home/Hall.astro`
- Test: `web/tests/unit/images.test.ts`, `web/tests/unit/photo.test.ts`

**Interfaces:**
- `types.ts`: `Img` gains `caption?: string` (rendered as the lightbox caption, a `figcaption` under a body photo and under a hall photo; never invented).
- `images.ts`:
  - `type RawSanityImage = { alt?: string | null; caption?: string | null; hotspot?: { x: number; y: number } | null; crop?: { top: number; bottom: number; left: number; right: number } | null; asset?: { _id: string; url: string; width: number; height: number } | null }`
  - `IMAGE_PROJECTION` (GROQ): `{ alt, caption, hotspot, crop, "asset": asset->{ _id, url, "width": metadata.dimensions.width, "height": metadata.dimensions.height } }`
  - `SRCSET_WIDTHS = [480, 800, 1200, 1600]`
  - `toResponsiveImg(raw: RawSanityImage | null | undefined, cfg: { projectId: string; dataset: string }): Img | undefined`: undefined without asset, size or non-empty alt; `width`/`height` = the cropped size (`round(w × (1 − left − right))`, `round(h × (1 − top − bottom))`); `srcset` = the widths below the cropped width plus the cropped width itself when it is under 1600 (no upscaling), built with `@sanity/image-url` (`.image({ asset: { _ref: _id }, crop, hotspot }).width(x).fit('max').auto('format')`); `url` = the 1200 entry or the largest below it; `position` = the hotspot relative to the crop, `"x% y%"` rounded to one decimal; `caption` when set.
  - `largestSrc(img: Img): string` (the last `srcset` candidate, else `url`), used for the gallery link and the lightbox.
- `Photo.astro`: unchanged props; `sizes` becomes required by convention at every call site with these values: hero poster `(min-width: 861px) 30vw, 70vw`; why `(min-width: 861px) 45vw, 92vw`; hall `(min-width: 861px) 40vw, 85vw`; homepage news and news feature `(min-width: 861px) 60vw, 92vw`; news side and row items `(min-width: 861px) 33vw, 92vw`; athlete tiles `(min-width: 1100px) 25vw, (min-width: 861px) 33vw, 50vw`; profile poster `(min-width: 861px) 35vw, 72vw`; article cover `(min-width: 980px) 940px, 95vw`; body photo `300px`; mosaic `(min-width: 861px) 40vw, 50vw`; parents and contact posters `(min-width: 861px) 40vw, 92vw`; coach photo `160px`.

- [ ] **Step 1: Write failing tests:**

```ts
// images.test.ts
const asset = (w: number, h: number) => ({ _id: 'image-abc-' + w + 'x' + h + '-jpg', url: 'https://cdn.sanity.io/images/p/d/abc.jpg', width: w, height: h });
const big = toResponsiveImg({ alt: 'Sala', asset: asset(4000, 3000) }, cfg)!;
expect([big.width, big.height]).toEqual([4000, 3000]);
expect(big.srcset!.split(', ').map(s => s.split(' ')[1])).toEqual(['480w', '800w', '1200w', '1600w']);
expect(big.url).toContain('w=1200');
const small = toResponsiveImg({ alt: 'Mic', asset: asset(1000, 800) }, cfg)!;
expect(small.srcset!.split(', ').map(s => s.split(' ')[1])).toEqual(['480w', '800w', '1000w']);
const cropped = toResponsiveImg({ alt: 'Tăiată', asset: asset(4000, 3000), crop: { top: 0, bottom: 0, left: 0.25, right: 0.25 } }, cfg)!;
expect([cropped.width, cropped.height]).toEqual([2000, 3000]); expect(cropped.url).toContain('rect=1000,0,2000,3000');
expect(toResponsiveImg({ alt: 'P', asset: asset(800, 1200), hotspot: { x: 0.5, y: 0.2 } }, cfg)!.position).toBe('50% 20%');
expect(toResponsiveImg({ alt: '  ', asset: asset(800, 1200) }, cfg)).toBeUndefined();
expect(toResponsiveImg({ alt: 'Fără metadate', asset: { _id: 'x', url: 'u', width: 0, height: 0 } }, cfg)).toBeUndefined();
// photo.test.ts (Astro container API: read its current docs)
expect(await render(Photo, { img: { ...big }, sizes: '50vw' })).toMatch(/srcset="[^"]+480w[^"]*" sizes="50vw"/);
expect(await render(Photo, { img: { url: '/img/smash.jpg', width: 800, height: 1200, alt: 'x' }, sizes: '50vw' })).not.toContain('srcset');
```

- [ ] **Step 2: Run, expect failure.** `pnpm -C web test -- images photo` → FAIL.
- [ ] **Step 3: Add `@sanity/image-url`, implement `images.ts`, pass `sizes` at every call site, render captions, use `largestSrc` in the gallery and lightbox.**
- [ ] **Step 4: Run.** `pnpm -C web test -- images photo content` → pass. `pnpm e2e -- home.spec.ts article.spec.ts` → pass (fixture images stay plain files: no `srcset` in the HTML).
- [ ] **Step 5: Commit** `feat(web): responsive Sanity images that respect crop and hotspot`.

---

### Task 3: One site query for every page getter

**Files:**
- Modify: `web/src/lib/sanity.ts` (replace `HOME_QUERY`, `fetchHomeQuery`, `toHomeData`), `web/src/lib/content.ts` (Sanity branch of `getSiteData`), `docs/ai/architecture.md` (data flow)
- Test: `web/tests/unit/content.test.ts`, `web/tests/unit/empty-studio.test.ts`

**Interfaces:**
- `SITE_QUERY` (one request per build; each key is the data of one or more page getters):

```groq
{
  "settings": *[_id == "siteSettings"][0]{ heroLines, heroText, "heroPhoto": heroPhoto${IMG}, whyIntro, "whyPhoto": whyPhoto${IMG},
    whyPoints[]{ title, text }, hallText, "hallPhotos": hallPhotos[]${IMG}, groupsIntro, trialText, rankingWeek{ week, from, to } },
  "info": *[_id == "clubInfo"][0]{ parentsAge, parentsEquipment, parentsCost, parentsFirstWeeks, parentsRegistration, programNote,
    contactPhone, contactDirections, replyDays },
  "athletes": *[_type == "athlete" && consent == true] | order(name asc){ _id, name, "slug": slug.current, consent, frbUrl, birthYear,
    "groupId": group._ref, "photo": photo${IMG}, rankings[]{ category, discipline, place, points } },
  "groups": *[_type == "group"] | order(order asc){ _id, name, "slug": slug.current, audience, track, sessions[]{ day, start, end }, "coachId": coach._ref },
  "coaches": *[_type == "coach"] | order(order asc){ _id, name, role, "photo": photo${IMG} },
  "competitions": *[_type == "competition"] | order(start asc){ _id, title, city, start, end, home, categories, resultsUrl },
  "posts": *[_type == "post"] | order(date desc){ title, "slug": slug.current, kind, date, "cover": cover${IMG}, "competitionId": competition._ref,
    body[]{ ..., _type == "bodyImage" => { "_type": "photo", _key, "photo": @${IMG} } }, "gallery": gallery[]${IMG},
    "results": results[athlete->consent == true]{ "athleteId": athlete._ref, discipline, result } }
}
```

  (`${IMG}` = `IMAGE_PROJECTION` from Task 2.)
- `fetchSiteQuery(cfg: { projectId: string; dataset: string; token: string }): Promise<unknown>` (client as plan 1: token, `useCdn: false`, `perspective: 'published'`).
- `toSiteData(raw: unknown, cfg: { projectId: string; dataset: string }): SiteData`: null-tolerant mapping (plan 1 style); a group without a slug gets plan 2a's name rule (until the migration of Task 1 has run); images through `toResponsiveImg`; `body` `photo` blocks without a usable image are dropped; `info` fields to `ClubInfo` (`parentsAge` → `parents.age`, …, `contactPhone` → `contact.phone`, `contactDirections` → `contact.directions`, `replyDays` → `contact.replyDays`), absent ones left out; `sessions` default `[]`; drops athletes without `consent === true`. The result goes through `parseSiteData` exactly as a fixture does.
- `getSiteData()` Sanity branch: `parseSiteData(toSiteData(await fetchSiteQuery(…), …), 'Sanity …')`. The plan 2a page getters are untouched.

- [ ] **Step 1: Write failing tests** (`content.test.ts`, `empty-studio.test.ts`):

```ts
test('the query filters consent for athletes and for result rows', () => {
  expect(SITE_QUERY).toContain('*[_type == "athlete" && consent == true]');
  expect(SITE_QUERY).toContain('results[athlete->consent == true]');
});
test('mapping drops athletes without consent and keeps only tags of visible athletes', () => {
  const site = parseSiteData(toSiteData({ ...rawSite, athletes: [rawAthlete, { ...rawAthlete, _id: 'x', consent: false }],
    posts: [{ ...rawPost, results: [{ athleteId: 'x', result: 'aur' }, { athleteId: rawAthlete._id, result: 'locul 5' }] }] }, cfg), 't');
  expect(site.athletes.map(a => a.id)).toEqual([rawAthlete._id]);
  expect(site.posts[0].results.map(r => r.athleteId)).toEqual([rawAthlete._id]);
});
test('club answers map to ClubInfo and absent ones stay absent', () => {
  expect(toSiteData({ ...rawSite, info: { parentsCost: '50 lei', replyDays: 3, contactPhone: null } }, cfg).info)
    .toEqual({ parents: { cost: '50 lei' }, contact: { replyDays: 3 } });
});
test('a body photo becomes a photo block; one without alt is dropped', () => { /* bodyImage with alt → { _type: 'photo', photo: { …, srcset } }; without alt → removed */ });
test('a competition gets its article from the post that links it', () => { /* post.competitionId = competition _id → competition.postSlug */ });
// empty-studio.test.ts: the seed's settings and nothing the club owes
test('every page has its designed empty state from a seed-only Studio', () => {
  const site = parseSiteData(toSiteData({ settings: seedSettings, info: null, athletes: [], groups: seedGroups, coaches: seedCoaches,
    competitions: [], posts: [] }, cfg), 'empty');
  expect(athletesView(site, today).tiles).toEqual([]);
  expect(calendarView(site, today).next).toBeUndefined();
  expect(newsView(site).front.feat).toBeUndefined();
  const program = programView(site); expect(program.planner).toBeUndefined(); expect(program.missingCoach).toBe(true);
  expect(site.info).toEqual({ parents: {}, contact: {} });
  expect(homeView(site).posts).toEqual([]);
});
test('a Studio without the homepage settings fails with the plan 1 message', () =>
  expect(() => toSiteData({ settings: null }, cfg)).toThrow('Pagina principală'));
```

- [ ] **Step 2: Run, expect failure.** `pnpm -C web test -- content empty-studio` → FAIL.
- [ ] **Step 3: Implement `SITE_QUERY`, `fetchSiteQuery`, `toSiteData`; switch `getSiteData`; remove `HOME_QUERY`, `fetchHomeQuery`, `toHomeData` and their tests (replaced by the above).**
- [ ] **Step 4: Check the query against the real dataset once, read-only:** with Mario's token in the shell (`! export SANITY_READ_TOKEN=…`, typed by Mario, never echoed), `CONTENT_SOURCE=sanity pnpm build` → completes; the log names the Sanity source; every page renders. Skip if Mario has not created the token yet (Task 8) and note it in the task report.
- [ ] **Step 5: Run.** `pnpm -C web test` → pass; `pnpm -C web check` → 0 errors.
- [ ] **Step 6: Commit** `feat(web): one Sanity query feeds every page`.

---

### Task 4: The `/api/proba` endpoint

**Files:**
- Create: `deploy/package.json` (name `deploy`, private, type module; dependency `nodemailer`; dev `vitest`, `@types/nodemailer`; scripts `test`, `test:changed`), `deploy/vitest.config.ts`, `deploy/trial-api/{server,handler,rate,store,mail,config}.ts`, `deploy/trial-api/Dockerfile`, `deploy/trial.env.example`, `deploy/tests/{handler,rate,store,mail,server}.test.ts`
- Modify: `pnpm-workspace.yaml` (+ `deploy`), `web/scripts/e2e-changed.mjs` (comment: `deploy/` stays "no e2e spec")
- Test: `deploy/tests/*.test.ts`

**Interfaces:**
- Validation is `web/src/lib/trial.ts` from plan 2a, imported by relative path (`../../web/src/lib/trial.ts`).
- `rate.ts`: `class RateLimiter { constructor(limit?: number /* 5 */, windowMs?: number /* 600_000 */); hit(key: string, now: number): boolean }` (true = allowed; counts accepted and rejected attempts; old entries pruned on each hit). Declare fields in the class body (no parameter properties).
- `store.ts`: `type TrialRecord = TrialRequest & { id: string; receivedAt: string }`; `jsonlStore(path: string): (r: TrialRecord) => Promise<void>` (append one line, file created with mode 0o600, parent directory must exist).
- `mail.ts`: `smtpMailer(env: NodeJS.ProcessEnv): ((r: TrialRecord) => Promise<void>) | undefined`: undefined unless `SMTP_HOST` and `SMTP_FROM` are set; uses `SMTP_PORT` (587), `SMTP_SECURE` (`true` for 465), `SMTP_USER`, `SMTP_PASS`, `TRIAL_MAIL_TO` (default `siderurgistul@badmintongalati.ro`); subject "Cerere antrenament de probă: {name}"; plain-text body with the same lines as `trialMailto`; 10 s timeouts.
- `handler.ts`: `type TrialDeps = { store: (r: TrialRecord) => Promise<void>; mail?: (r: TrialRecord) => Promise<void>; limiter: RateLimiter; now: () => Date; newId: () => string; log: (line: string) => void }`; `handleTrial(req: { method: string; contentType: string; body: string; ip: string }, deps: TrialDeps): Promise<{ status: number; headers: Record<string, string>; body: string }>`. Order: method (405 unless POST) → body size is the server's job → parse (`application/json` object, or `application/x-www-form-urlencoded`; anything else 415; unparsable or non-object JSON 400 `{ ok: false, errors: [] }`) → rate limit by `ip` (429 `{ ok: false, reason: 'rate' }`) → honeypot (`isSpam`: answer as success, store nothing, log "spam dropped") → `validateTrial` (400 `{ ok: false, errors }`) → `store` (failure: 500 `{ ok: false }`, log "store failed") → answer success → `mail` in the background when configured (failure logged as "mail failed {id}"). JSON requests get JSON answers; form posts get `303` with `Location: /contact/trimis/` on success and `/contact/netrimis/` on any failure. Every answer has `Cache-Control: no-store`. Log lines contain the id and the outcome only.
- `server.ts`: `startServer(cfg: { port: number; dataFile: string }, env: NodeJS.ProcessEnv): http.Server`: `POST /api/proba` through `handleTrial` with a body limit of 8 KB (413 beyond, connection closed), `ip` from `x-real-ip` (set by nginx) else the socket address; `GET /api/health` → 200 `ok`; anything else 404. `config.ts`: `PORT` (8080), `DATA_FILE` (`/data/requests.jsonl`).
- `Dockerfile` (build context: the repository root): `node:26-alpine`, corepack pnpm, copy the workspace manifests, `pnpm install --frozen-lockfile --filter deploy --prod`, copy `deploy/` and `web/src/lib/trial.ts`, `USER node`, `CMD ["node", "deploy/trial-api/server.ts"]`.

- [ ] **Step 1: Write failing tests** (`handler.test.ts` with in-memory deps, `server.test.ts` on a random port with a temporary data file):

```ts
const ok = JSON.stringify({ nume: 'Ana Ionescu', telefon: '0745 123 456', varsta: '8', acord: true });
test('a valid request is stored, then mailed, and answered 200', async () => {
  const d = deps(); const r = await handleTrial(json(ok), d);
  expect(r.status).toBe(200); expect(d.stored).toEqual([{ id: 'id-1', receivedAt: '2026-11-25T09:00:00.000Z', name: 'Ana Ionescu', phone: '0745123456', age: 8 }]);
  await flush(); expect(d.mailed).toHaveLength(1);
});
test('without SMTP nothing is mailed and the parent still sees success', async () => { /* deps({ mail: undefined }) → 200, stored 1 */ });
test('a failing mail is logged without personal data', async () => {
  const d = deps({ mail: async () => { throw new Error('535 auth') } }); await handleTrial(json(ok), d); await flush();
  expect(d.logs.join('\n')).toContain('mail failed id-1'); expect(d.logs.join('\n')).not.toMatch(/Ana|0745/);
});
test('the honeypot answers like success and stores nothing', async () => { /* site_web: 'x' → 200, stored [] */ });
test('the sixth request from one address in ten minutes gets 429', async () => { /* 5 × 200 (or 400), 6th 429; after now + 10 min → allowed */ });
test('field errors come back as 400 in the form of trial.ts', async () => { /* telefon '0745 12' → 400, errors[0].summary 'Telefonul are prea puține cifre' */ });
test('a form post is redirected to the outcome page', async () => { /* urlencoded valid → 303 /contact/trimis/; invalid → 303 /contact/netrimis/ */ });
test('a store failure is a 500, never a false success', async () => { /* store throws → 500, mail not called */ });
for (const [what, req, status] of [['GET', get(), 405], ['text/plain', text('x'), 415], ['JSON array', json('[1]'), 400], ['broken JSON', json('{'), 400]] as const)
  test(`${what} gets ${status}`, async () => expect((await handleTrial(req, deps())).status).toBe(status));
// server.test.ts
test('the server refuses a 50 KB body with 413 and appends valid requests as JSON lines', async () => { /* start on port 0, POST 50 KB → 413; POST ok → file has one line; mode 0o600 */ });
test('the address comes from X-Real-IP', async () => { /* 6 posts with x-real-ip A → 429; one with B → not 429 */ });
```

- [ ] **Step 2: Run, expect failure.** `pnpm --filter deploy test` → FAIL.
- [ ] **Step 3: Implement** the package and modules; `pnpm install` at the root updates the lockfile.
- [ ] **Step 4: Run.** `pnpm --filter deploy test` → pass. `docker build -f deploy/trial-api/Dockerfile -t trial-api-test .` → builds; `docker run --rm -e PORT=8080 -p 127.0.0.1:18080:8080 trial-api-test` and `curl -s localhost:18080/api/health` → `ok`; stop it.
- [ ] **Step 5: Commit** `feat(deploy): trial request endpoint that stores and optionally mails`.

---

### Task 5: The form on the endpoint, with and without JavaScript

**Files:**
- Create: `web/src/pages/contact/trimis.astro`, `web/src/pages/contact/netrimis.astro`
- Modify: `web/src/layouts/Base.astro` (`noindex?: boolean` prop → `<meta name="robots" content="noindex">`), `web/src/components/contact/TrialForm.astro` (remove the `noscript` line), `web/src/scripts/trial-form.ts` (no change in behaviour; check the 429 text path), `web/scripts/e2e-changed.mjs`
- Test: `web/tests/e2e/contact.spec.ts`

**Interfaces:**
- `/contact/trimis/`: `noindex`; `PageHead` blue "Cererea a ajuns la club"; "Clubul vă contactează la numărul lăsat în formular ca să stabiliți ziua probei."; "Vă sunăm în cel mult {replyDays} zile." or the `Tbc` of plan 2a; link "ce e bine să știți înainte de primul antrenament" → `/pentru-parinti/`; link "Înapoi la contact" → `/contact/`.
- `/contact/netrimis/`: `noindex`; `PageHead` blue "Cererea nu a plecat"; "Verificați datele din formular și trimiteți din nou, sau scrieți-ne la siderurgistul@badmintongalati.ro."; link "Înapoi la formular" → `/contact/#formular`.
- Copy of both pages: Appendix A.

- [ ] **Step 1: Write failing e2e tests** (`contact.spec.ts`, on `home`):

```ts
test('without JavaScript a sent form lands on the confirmation page', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false }); const page = await ctx.newPage();
  await page.route('**/api/proba', r => r.fulfill({ status: 303, headers: { location: '/contact/trimis/' } }));
  await page.goto('/contact/'); await fillGood(page); await page.getByRole('button', { name: 'Trimite cererea' }).click();
  await expect(page).toHaveURL(/\/contact\/trimis\/$/); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cererea a ajuns la club');
  await expect(page.locator('noscript')).toHaveCount(0); await ctx.close();
});
test('the outcome pages are not indexed', async ({ page }) => { /* both have meta robots noindex */ });
test('too many requests are explained, not shown as a failure to send', async ({ page }) => { /* route 429 {ok:false,reason:'rate'} → alert contains "Ați trimis deja câteva cereri" */ });
```

- [ ] **Step 2: Run, expect failure.** `pnpm e2e -- contact.spec.ts` → FAIL.
- [ ] **Step 3: Implement** the two pages, the `noindex` prop, remove the `noscript` line.
- [ ] **Step 4: Run.** `pnpm e2e -- contact.spec.ts shell.spec.ts` → pass.
- [ ] **Step 5: Commit** `feat(web): outcome pages for the trial form without JavaScript`.

---

### Task 6: Server layout: releases, the API proxy and the deploy script

**Files:**
- Modify: `deploy/docker-compose.yml`, `deploy/nginx.conf`, `scripts/deploy.sh`, `.deploy.env.example`
- Create: `deploy/publish.env.example`
- Test: `deploy/tests/config.test.ts`

**Interfaces:**
- Server directory (`$DEPLOY_PATH`): `docker-compose.yml`, `nginx.conf`, `publish.env`, `trial.env` (both untracked, optional), `site/releases/<name>/`, `site/current -> releases/<name>` (relative symlink), `data/trial/`, `state/publish/`.
- `docker-compose.yml`:
  - `web`: `nginx:alpine`, `container_name: badminton-galati`, `127.0.0.1:3013:80`, `restart: always`, volumes `./site:/srv/site:ro`, `./nginx.conf:/etc/nginx/conf.d/default.conf:ro`.
  - `trial-api`: `build: { context: https://github.com/MaRrDG/badminton-galati.git#dev, dockerfile: deploy/trial-api/Dockerfile }`, `env_file: [{ path: ./trial.env, required: false }]`, volume `./data/trial:/data`, `restart: always`, no published port.
  - `publisher`: `build: { context: (same), dockerfile: deploy/publish/Dockerfile }`, `env_file: [{ path: ./publish.env, required: false }]`, volumes `./site:/srv/site`, `./state/publish:/state`, `restart: always`.
- `nginx.conf`: `root /srv/site/current;` (a directory bind mount cannot be swapped atomically by renaming; a symlink inside the mounted parent can, and nginx resolves it per request); plan 1 caching, `noindex` and the 404 page unchanged; plus

```nginx
map $http_x_real_ip $client_ip { "" $remote_addr; default $http_x_real_ip; }   # http context: a top-level line of the file
location /api/ {
    resolver 127.0.0.11 valid=30s;          # Docker DNS, resolved per request: nginx starts even when trial-api is down
    set $trial http://trial-api:8080;
    proxy_pass $trial;
    proxy_set_header X-Real-IP $client_ip;  # port 3013 is reachable only from the server's own reverse proxy
    client_max_body_size 16k;
    add_header X-Robots-Tag "noindex, nofollow" always;
    add_header Cache-Control "no-store" always;
}
```

- `scripts/deploy.sh` (`pnpm deploy:test [--dry-run]`): reads `.deploy.env` as before (no `CONTENT_SOURCE` any more: the content source lives in the server's `publish.env`); refuses a dirty tree; `git fetch origin dev` and refuses unless `HEAD` equals `origin/dev` ("the server builds what GitHub has: push dev first"); rsyncs `deploy/docker-compose.yml` and `deploy/nginx.conf` in place; over ssh: `mkdir -p site/releases data/trial state/publish && docker compose build --pull && docker compose up -d && docker compose exec -T web nginx -t && docker compose exec -T web nginx -s reload && docker compose exec -T publisher node deploy/publish/main.ts once --force && cat site/current/.release.json`; prints the served commit and source. `--dry-run` prints the remote command and runs rsync with `--dry-run`.

- [ ] **Step 1: Write failing tests** (`config.test.ts`, read the tracked files as text):

```ts
expect(nginx).toContain('root /srv/site/current;'); expect(nginx).toMatch(/location \/api\/ \{[^}]*proxy_pass \$trial;/s);
expect(nginx).toContain('error_page 404 /404.html;');
expect(compose).toContain('./site:/srv/site:ro'); expect(compose).toMatch(/trial-api:[\s\S]*required: false/);
expect(compose.match(/\b\d{1,3}(\.\d{1,3}){3}\b/g)).toEqual(['127.0.0.1']); // no server address
expect(deploySh).toContain('origin/dev'); expect(deploySh).not.toContain('CONTENT_SOURCE');
expect(examples.every(e => /=\s*$/m.test(e))).toBe(true); // templates hold empty values only
```

- [ ] **Step 2: Run, expect failure.** `pnpm --filter deploy test -- config` → FAIL.
- [ ] **Step 3: Implement** compose, nginx, the env template and `deploy.sh`.
- [ ] **Step 4: Verify locally.** `docker compose -f deploy/docker-compose.yml config -q` → no output, exit 0. `docker run --rm -v "$PWD/deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t` → "syntax is ok". `bash -n scripts/deploy.sh` → exit 0. `pnpm --filter deploy test -- config` → pass.
- [ ] **Step 5: Commit** `build(deploy): release symlink, API proxy, services built from dev`.

---

### Task 7: The publisher

**Files:**
- Create: `deploy/publish/{main,decide,fingerprint,release,build,config}.ts`, `deploy/publish/Dockerfile`
- Test: `deploy/tests/{decide,fingerprint,release,build}.test.ts`

**Interfaces:**
- `config.ts`: `type PublishConfig = { source: 'fixtures' | 'sanity'; projectId?: string; dataset: string; token?: string; repoUrl: string; branch: string; siteDir: string; stateDir: string; checkEveryMin: number; dailyAt: string }` from env `CONTENT_SOURCE` (default `fixtures`), `SANITY_PROJECT_ID`, `SANITY_DATASET` (`production`), `SANITY_READ_TOKEN` (required with `sanity`, else a startup error naming the variable), `REPO_URL` (the public repo), `REPO_BRANCH` (`dev`), `SITE_DIR` (`/srv/site`), `STATE_DIR` (`/state`), `CHECK_EVERY_MIN` (15), `DAILY_AT` (`03:30`).
- `decide.ts`: `type PublishState = { fingerprint?: string; commit?: string; lastBuildDay?: string; failed?: { fingerprint: string; commit: string; at: string } }`; `decide(s: PublishState, now: Date, fingerprint: string, commit: string, dailyAt: string): { build: boolean; reason?: 'first' | 'content' | 'code' | 'daily' }`: `first` with no previous build; `content` when the fingerprint differs; `code` when the commit differs; `daily` when the Bucharest date of `now` is after `lastBuildDay` and the Bucharest time is at or after `dailyAt`; no build when `failed` matches this fingerprint and commit and is less than an hour old (`todayInBucharest` logic from `web/src/lib/dates.ts`, imported by relative path).
- `fingerprint.ts`: `FINGERPRINT_QUERY = '{"latest": *[!(_id in path("drafts.**"))] | order(_updatedAt desc)[0]._updatedAt, "count": count(*[!(_id in path("drafts.**"))])}'`; `fetchFingerprint(c: PublishConfig, fetchImpl?: typeof fetch): Promise<string>` → `"<latest>|<count>"` through the HTTP query API with the token and `perspective=published`; `"fixtures"` for the fixture source; throws on a non-200 answer (the message names the status, never the token).
- `release.ts`: `releaseName(now: Date, commit: string): string` (`20261125T033000Z-abc1234`); `swapCurrent(siteDir: string, name: string): Promise<void>` (create `current.tmp` symlink to `releases/<name>`, `rename` over `current`); `pruneReleases(siteDir: string, keep?: number /* 3 */): Promise<string[]>` (removes the oldest, never the target of `current`, never `*.tmp`); `readState(stateDir): Promise<PublishState>`, `writeState(stateDir, s): Promise<void>` (write to a temporary file, then rename).
- `build.ts`: `type Runner = (cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }) => Promise<void>`; `buildRelease(c: PublishConfig, name: string, commit: string, run: Runner): Promise<void>`: in `${stateDir}/repo` (cloned on first use) `git fetch origin <branch>` + `git reset --hard <commit>`, `pnpm install --frozen-lockfile`, `pnpm -C web exec astro build --outDir ${siteDir}/releases/${name}.tmp` with `CONTENT_SOURCE`, `SANITY_*` and no `BUILD_TODAY`; fails unless `index.html` and `404.html` exist; writes `.release.json` `{ commit, source, builtAt, reason }`; renames `.tmp` to `name`. On any failure the `.tmp` directory is removed and the error rethrown.
- `main.ts`: `node deploy/publish/main.ts loop` (the container command: on start, then every `checkEveryMin` minutes: commit via `git ls-remote <repoUrl> refs/heads/<branch>`, fingerprint, `decide`, build, swap, prune, write state; a failure is logged and recorded in `failed`) and `once --force` (one build now, used by `deploy.sh`). A lock file `${stateDir}/build.lock` (created with `wx`; stale after 30 minutes) keeps two builds from overlapping. Logs never print the token.
- `Dockerfile`: `node:26-alpine` with `git` and corepack pnpm (no browser needed), `deploy` package installed as in Task 4, `CMD ["node", "deploy/publish/main.ts", "loop"]`.

- [ ] **Step 1: Write failing tests:**

```ts
// decide.test.ts  (times in UTC; Bucharest is UTC+2 in November)
const t = (iso: string) => new Date(iso);
expect(decide({}, t('2026-11-25T10:00:00Z'), 'f1', 'c1', '03:30')).toEqual({ build: true, reason: 'first' });
const s = { fingerprint: 'f1', commit: 'c1', lastBuildDay: '2026-11-25' };
expect(decide(s, t('2026-11-25T10:15:00Z'), 'f1', 'c1', '03:30')).toEqual({ build: false });
expect(decide(s, t('2026-11-25T10:15:00Z'), 'f2', 'c1', '03:30')).toEqual({ build: true, reason: 'content' });
expect(decide(s, t('2026-11-25T10:15:00Z'), 'f1', 'c2', '03:30')).toEqual({ build: true, reason: 'code' });
expect(decide(s, t('2026-11-26T01:00:00Z'), 'f1', 'c1', '03:30')).toEqual({ build: false });           // 03:00 in Galați
expect(decide(s, t('2026-11-26T01:45:00Z'), 'f1', 'c1', '03:30')).toEqual({ build: true, reason: 'daily' });
const failed = { ...s, failed: { fingerprint: 'f2', commit: 'c1', at: '2026-11-25T10:15:00Z' } };
expect(decide(failed, t('2026-11-25T10:45:00Z'), 'f2', 'c1', '03:30').build).toBe(false);
expect(decide(failed, t('2026-11-25T11:16:00Z'), 'f2', 'c1', '03:30').build).toBe(true);
// fingerprint.test.ts
expect(await fetchFingerprint(sanityCfg, fakeFetch({ result: { latest: '2026-11-25T09:00:00Z', count: 31 } }))).toBe('2026-11-25T09:00:00Z|31');
await expect(fetchFingerprint(sanityCfg, fakeFetch({}, 401))).rejects.toThrow(/401/); // and the message has no token
// a deletion changes the count, so it changes the fingerprint even when "latest" stays the same
// release.test.ts (temporary directory)
test('swapping points current at the new release in one rename', async () => { /* readlink(current) === 'releases/b' */ });
test('pruning keeps three and never the current target', async () => { /* 5 releases, current → oldest → removes 2 others, keeps current */ });
// build.test.ts (a fake Runner)
test('a failed build removes its .tmp directory and leaves current alone', async () => {
  /* runner throws on astro build → rejects; releases/<name>.tmp absent; current still → old */
});
test('a build without 404.html is refused', async () => { /* runner creates index.html only → rejects */ });
test('the token reaches the build env but no log line', async () => { /* captured env has SANITY_READ_TOKEN; captured logs do not */ });
```

- [ ] **Step 2: Run, expect failure.** `pnpm --filter deploy test` → FAIL.
- [ ] **Step 3: Implement** the modules and the Dockerfile.
- [ ] **Step 4: Run.** `pnpm --filter deploy test` → pass. `docker build -f deploy/publish/Dockerfile -t publisher-test .` → builds. A local dry run with fixtures: `docker run --rm -e CONTENT_SOURCE=fixtures -v "$(mktemp -d):/srv/site" -v "$(mktemp -d):/state" publisher-test node deploy/publish/main.ts once --force` → exits 0 and the site directory has `current/index.html` (it clones the public `dev`; run after `dev` holds plan 2a).
- [ ] **Step 5: Commit** `feat(deploy): server-side publisher with content checks and a daily build`.

---

### Task 8: Owner's steps, the switch to Sanity, docs and the full run

**Files:**
- Modify: `README.md`, `studio/README.md`, `docs/ai/{architecture,content-model,testing,decisions,roadmap}.md`, `CLAUDE.md`

- [ ] **Step 1: Write the owner's steps** in `README.md` ("Publicare automată și conținut din Sanity" kept in English: "Live content and the publish pipeline"), for Mario to do himself:
  1. One-time server move: after the first `pnpm deploy:test` of this plan the site is served from `site/current`; remove the old `dist/` directory on the server.
  2. Create the read token: sanity.io/manage → project `4p2ry2u9` → API → Tokens → Add API token, name "build server", permission **Viewer**; copy it once.
  3. On the server, in the deploy directory: copy `deploy/publish.env.example` to `publish.env`, set `CONTENT_SOURCE=sanity`, `SANITY_PROJECT_ID=4p2ry2u9`, `SANITY_DATASET=production`, `SANITY_READ_TOKEN=<token>`; `chmod 600 publish.env`.
  4. Bring the live dataset up to the new model (logged in as himself): deploy the Studio (`pnpm --filter studio run deploy`); import only the missing seed documents (`pnpm --filter studio exec sanity dataset import seed/seed.ndjson production --missing`, which adds the coaches and `clubInfo` and leaves edited documents alone); run the migration as a dry run, then for real (`pnpm --filter studio exec sanity migration run inner-pages`, then with `--no-dry-run`). Check the exact commands against the Sanity CLI help first.
  5. Before switching, in the Studio: tick consent only for athletes with written consent; check photos have alt text; competitions have categories. A competition that still shows an unknown "post" field: open the article and pick the competition under "Legături", then remove the old field.
  6. Switch: `docker compose up -d publisher && docker compose exec -T publisher node deploy/publish/main.ts once --force`; check `site/current/.release.json` says `"source": "sanity"` and the site shows Studio content. Back to fixtures: `CONTENT_SOURCE=fixtures` and the same command.
  7. Email for trial requests, when the club provides SMTP: `trial.env` from `deploy/trial.env.example`, `chmod 600`, `docker compose up -d trial-api`. Until then read requests with `docker compose exec trial-api cat /data/requests.jsonl`, and delete lines once handled.
  8. Revoking: delete the token in sanity.io/manage; builds then fail and the site stays on its last release until a new token is set.
- [ ] **Step 2: Update the docs.** `architecture.md`: Sanity → `SITE_QUERY` → `toSiteData` → `parseSiteData`; the server diagram (nginx, trial-api, publisher, `site/current`, volumes); the env files. `content-model.md`: the new types and fields, consent end to end including result rows, the seed. `testing.md`: the `deploy` package tests and `pnpm --filter deploy test`. `decisions.md`: one query per build (rather than one per page: one request, one consent filter); release symlink instead of swapping `dist/`; services built from the public `dev`; daily build at 03:30; `trial.ts` shared by browser and server; requests stored before mailing. `roadmap.md`: plan 2 done; what the club still owes; the later plan's list. `CLAUDE.md`: commands (`pnpm --filter deploy test`), layout (`deploy/` package), the rule that personal data from the form never enters git or logs.
- [ ] **Step 3: Full run.** `pnpm test` (web, studio, deploy) → pass. `pnpm -C web check`, `pnpm --filter studio typecheck`, `pnpm --filter studio validate` → clean. `pnpm build` → no warnings. `rm -rf web/dist-e2e && time pnpm e2e` → all pass, under 45 s; record the time in `testing.md` and `README.md`.
- [ ] **Step 4: Commit** `docs: live content, the trial endpoint and the publish pipeline`.
- [ ] **Step 5: Ask Mario** whether to push `dev` (the server builds only what GitHub has) and to run `pnpm deploy:test`. Do neither without his go-ahead.

---

## Appendix A: Copy to confirm with the club

| Where | Text |
|---|---|
| `/contact/trimis/` | "Cererea a ajuns la club" / "Clubul vă contactează la numărul lăsat în formular ca să stabiliți ziua probei." / "Înapoi la contact" |
| `/contact/netrimis/` | "Cererea nu a plecat" / "Verificați datele din formular și trimiteți din nou, sau scrieți-ne la siderurgistul@badmintongalati.ro." / "Înapoi la formular" |
| Email to the club | Subject "Cerere antrenament de probă: {nume}", body lines as the e-mail fallback of plan 2a |
| Studio | All new titles and descriptions of Task 1 (coaches and the club's answers are typed by the coaches; the Studio texts tell them what each field is for) |
