# CS Siderurgistul Galați: new website

A new website for CS Siderurgistul Galați, the badminton club in Galați, built by Mario as a
gift to the club. It will replace https://www.badmintongalati.ro/. The club edits the content
itself (athletes, groups, calendar, articles, homepage texts) in a Sanity Studio; the site is a
static Astro build.

The visible site is in Romanian; this repository (code, docs, commits) is in English.

## Status

- **Plan 1, done:** foundation and homepage. The homepage follows the approved mockup
  (`mockups/varianta-d.html`), reads its content from fixtures or Sanity, and has the scroll
  motion. The Studio is live. Deploy scaffolding for a private test address exists; no deploy
  has been run from this repo yet.
- **Plan 2, pending:** inner pages (athletes, schedule, calendar, news, about, contact, ...) and
  the forms. Until then the menu links lead to "not found".
- **Plan 3, pending:** moving the 15 old articles, redirects from the old addresses, SEO.
- **Plan 4, pending:** weekly sync of the FRB rankings (needs the federation's agreement).
- **Plan 5, pending:** launch on badmintongalati.ro.

Details per plan: `docs/ai/roadmap.md`. The design (why it looks and behaves this way):
`docs/superpowers/specs/2026-11-25-site-siderurgistul-design.md`.

## Requirements

Node 26 and pnpm 10 (`packageManager` pins pnpm 10.34.5). Use pnpm only. The e2e tests drive
Google Chrome at `/usr/bin/google-chrome`.

```sh
pnpm install
```

## Run

| Command | What it does |
|---|---|
| `pnpm dev` | Site on http://localhost:4321 (Astro dev), with content from fixtures |
| `pnpm build` | Static build into `web/dist/` |
| `pnpm -C web preview` | Serves the last build |
| `pnpm --filter studio dev` | Studio on http://localhost:3333 (needs `studio/.env`, see `studio/README.md`) |

## Test

| Command | What | Time on the dev machine |
|---|---|---|
| `pnpm test:changed` | Unit tests affected by the diff against `dev` | at most the full unit run |
| `pnpm e2e:changed` | E2E specs affected by the diff against `dev` | up to ~24 s |
| `pnpm e2e -- shell.spec.ts` | One spec (builds only the content variant it needs) | 4–5 s |
| `pnpm test` | All unit tests (web 77, studio 14) | ~3 s |
| `pnpm e2e` | All e2e tests (50, on four content variants) | ~23 s |
| `pnpm -C web check` | Astro and TypeScript check | |

During work run only the affected tests; run the full suite once before merging or pushing.
How the e2e setup works and how to add tests: `docs/ai/testing.md`.

## Content

The site reads its content at build time from one of two sources:

- **Fixtures** (`web/src/fixtures/*.json`): local data, no network. The default when no Sanity
  project is configured, and what all tests use. `home.json` holds the same real facts as the
  Studio seed.
- **Sanity**: project `4p2ry2u9`, dataset `production`. The dataset is **private** (so athletes
  without parental consent cannot be read through the public API); the build reads it with a
  read-only token.

Settings (template `web/.env.example`; `web/.env` is git-ignored):

| Variable | Meaning |
|---|---|
| `CONTENT_SOURCE` | `fixtures` or `sanity`. Empty: `sanity` if `SANITY_PROJECT_ID` is set, otherwise `fixtures` |
| `SANITY_PROJECT_ID` | `4p2ry2u9` |
| `SANITY_DATASET` | default `production` |
| `SANITY_READ_TOKEN` | Read-only ("Viewer") token from sanity.io/manage; required with `sanity`; used only by the build, never reaches the browser. Never commit it |
| `HOME_FIXTURE` | Fixture file for `fixtures`, default `home.json` |
| `BUILD_TODAY` | `YYYY-MM-DD`, pins "today" (for tests); leave unset otherwise |

`pnpm build` reads `web/.env`; `pnpm dev` does not, so export the variables in the shell to run
the dev server against Sanity.

**Parental consent:** an athlete appears on the site only when "Acord părinte" is ticked in the
Studio. The three athletes in the seed are unticked, because written consent has not been
received yet, so a Sanity-backed build currently shows no athletes.

## Editing content in the Studio

Hosted Studio: https://siderurgistul-galati.sanity.studio/ (sign in with a Sanity account that
is a member of the project; the coaches have not been invited yet). The editor is in Romanian:
"Pagina principală" (homepage texts and photos), "Articole", "Calendar competițional",
"Sportivi", "Grupe". Changes reach the site on the next build. Running, deploying and seeding
the Studio: `studio/README.md`. The content model: `docs/ai/content-model.md`.

## Deploy (private test address)

The test deployment runs on Mario's own server, behind his single sign-on, in an
`nginx:alpine` container (`deploy/docker-compose.yml`, `deploy/nginx.conf`) that sends
`X-Robots-Tag: noindex, nofollow`. The one-time server setup (directory, reverse proxy, TLS,
SSO) is done by Mario's site-manager tool on the server, not by this repository.

1. Copy `.deploy.env.example` to `.deploy.env` (git-ignored) and fill in `DEPLOY_HOST`,
   `DEPLOY_USER`, `DEPLOY_PATH` (absolute) and optionally `DEPLOY_SSH_KEY`. Never commit real
   values: the repository is public.
2. Commit your work (the script refuses a dirty tree).
3. `pnpm deploy:test -- --dry-run` builds and shows what would be copied.
4. `pnpm deploy:test` builds, copies `web/dist/` and the two deploy files with rsync, starts or
   reloads the container with `docker compose`, and prints the deployed commit.

The build uses fixtures unless you run it as
`CONTENT_SOURCE=sanity SANITY_PROJECT_ID=4p2ry2u9 SANITY_READ_TOKEN=... pnpm deploy:test`.
Do not deploy from Sanity before image sizing for Sanity photos is done (`docs/ai/decisions.md`).

## Repository layout

```
web/                 Astro site
  src/lib/           content layer (content.ts, sanity.ts) and pure logic (home.ts, dates.ts)
  src/components/    shell and homepage sections (home/)
  src/scripts/       motion.ts (GSAP)
  src/styles/        tokens.css, base.css
  src/fixtures/      local content variants
  tests/unit, tests/e2e, scripts/   tests and test runners
studio/              Sanity Studio: schemaTypes/, seed/, tests/
deploy/              docker-compose.yml, nginx.conf for the test server
scripts/deploy.sh    test deployment (pnpm deploy:test)
mockups/             approved mockup D and the club photos it uses
docs/superpowers/    design spec and plan 1
docs/ai/             architecture, content model, design system, testing, decisions, roadmap
CLAUDE.md            rules for AI coding agents working in this repo
```
