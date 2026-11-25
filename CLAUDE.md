# CLAUDE.md

New website for CS Siderurgistul Galați, a badminton club, built by Mario as a gift to replace
badmintongalati.ro. Plans 1 (foundation + homepage) and 2a (inner pages) are done; next is 2b
(Studio fields, images, trial endpoint, rebuild); see `docs/ai/roadmap.md`.

Stack: pnpm workspace (pnpm only, npm is broken on the dev machine), Node 26. `web/` is Astro 7,
static output, GSAP 3 + ScrollTrigger, Vitest 5, Playwright 1.65 (uses `/usr/bin/google-chrome`).
`studio/` is Sanity Studio 6 (project `4p2ry2u9`, private dataset `production`).
Repo artefacts (code, comments, docs, commits) are English; site copy and Studio labels are Romanian.

## Layout
- `web/src/lib/` content layer (`content.ts`: `getSiteData` + one getter per page; `sanity.ts`),
  one pure view module per page (`athletes`, `calendar`, `news`, `article`, `program`, `parents`,
  `trial`), shared logic (`home`, `dates`, `filter`, `ro`, `body`, `nav`, `tiles`), `club.ts`
  (club e-mail, Facebook, hall map), `types.ts`
- `web/src/pages/` routes; `web/src/components/ui/` shared inner-page pieces; `components/home/`
  and one folder per inner page (`athletes`, `calendar`, `news`, `program`, `parents`, `contact`)
- `web/src/scripts/`: `motion.ts` (homepage GSAP), `page-motion.ts` (inner-page GSAP), browser
  helpers (calendar today, filters, form, share, lightbox, 404 rally)
- `web/src/styles/tokens.css` every colour/type/layout value; `web/src/fixtures/*.json` offline content
- `web/tests/unit`, `web/tests/e2e`, `web/scripts/` (test runners); `studio/schemaTypes`, `studio/seed`
- `deploy/` + `scripts/deploy.sh` test deployment; `mockups/varianta-d.html`, `mockups/pagini/` approved visuals
- `docs/superpowers/` spec and plans (history); `docs/ai/` the docs to read before working

## Commands (repo root)
- `pnpm dev` (fixtures unless `SANITY_PROJECT_ID` is exported), `pnpm build`, `pnpm -C web check`;
  `TRIAL_ENDPOINT` unset = the trial form opens an e-mail (until plan 2b)
- `pnpm test:changed`, `pnpm e2e:changed` (diff against `dev`); `pnpm e2e -- <spec or -g "title">`
- `pnpm test`, `pnpm e2e` full suites; `pnpm --filter studio test|typecheck|validate`
- `pnpm deploy:test [--dry-run]` (needs untracked `.deploy.env`)

## Non-negotiable rules
- **Parental consent.** An athlete appears nowhere (roster, hero, counts, tags, links) unless
  `consent === true`. The filter lives in the content layer (GROQ + `visibleAthletes`) and runs
  before any cap or ordering. Why: real minors; publishing without consent is the worst failure.
- **No invented facts or copy.** Unknown data is omitted or shown as `de confirmat`. Why: the old
  site lost trust with stale and fake numbers; the spec lists invented content as failure.
- **Romanian copy, comma-below diacritics** (ș ț, never ş ţ); no English labels on the site.
- **Tone invites, never boasts.** Rankings are proof lower on the page, never in the hero.
  Why: Mario rejected a hero with ranking places; the club says "why play", not "how good we are".
- **Forbidden visual patterns** (Mario rejected drafts as "AI slop"): flip-card scoreboard widget,
  bordered table with empty cells, staircase layout, cream background, rounded shadow cards,
  dashed pills, all-caps eyebrows, 01/02/03 markers, fade-in per section, charts without real
  data. Also: arrow-suffixed buttons, one accented word in a headline. See `docs/ai/design-system.md`.
- **Motion** only the approved moments: the five on the homepage (hero load, hero scrub, roster
  numerals, heading drift, hall strip), one per inner page (table in `design-system.md`), the
  rally on the 404 page. `prefers-reduced-motion` shows final states; all content works without JS.
- **Example vs unknown.** Example values (`provisional` hours, `coachProvisional`) are hatched
  with `Sample`; unknown ones are `Tbc` or omitted. Our own copy goes in `docs/ai/copy-to-confirm.md`.
- Every `<img>` has `width` and `height` (motion distances depend on it).
- Text on red fields uses `--red-field` (white 4.77:1); `--red` is for accents only (4.26:1).

## Testing
- Run only the tests your change affects: `pnpm test:changed`, `pnpm e2e:changed`, or a named
  spec. Run the full suite (`pnpm test && pnpm e2e`) once before merge or push.
- Do not add a fixture build when an existing fixture can carry the case; each fixture is a
  separate build and preview. See `docs/ai/testing.md`.

## Git
- Work on `dev`; feature work in a worktree/branch merged into `dev`. Never push unless asked.
- Commit format `type(scope): subject`, optional plain body.
- Commits MUST NOT contain `Co-Authored-By`, session links or any AI/agent attribution. Use the
  repo's configured identity; do not override it.
- The repo is PUBLIC: never commit secrets, tokens, `.env*`, `.deploy.env`, server addresses,
  SSH users/keys or personal data beyond what is already there.

## Read before working
| Task | Read |
|---|---|
| Any code change | `docs/ai/architecture.md` |
| Studio schema, content, consent | `docs/ai/content-model.md` |
| UI, CSS, motion | `docs/ai/design-system.md`, `mockups/varianta-d.html`, `mockups/pagini/` |
| Tests | `docs/ai/testing.md` |
| "Why is it like this?" | `docs/ai/decisions.md` |
| Site copy we wrote | `docs/ai/copy-to-confirm.md` |
| Starting plan 2b–5 | `docs/ai/roadmap.md`, then the spec in `docs/superpowers/specs/` |
