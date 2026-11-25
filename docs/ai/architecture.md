# Architecture

## Data flow

```
Sanity (private dataset, read token)   or   web/src/fixtures/<HOME_FIXTURE>.json
                 \                              /
          web/src/lib/sanity.ts            (import.meta.glob)
     HOME_QUERY + toHomeData()                 /
                  \                           /
                web/src/lib/content.ts  getHomeData() -> parseHomeData()
                  (shape check, consent filter, sort, caps)
                               |
                web/src/lib/home.ts, dates.ts   (pure functions)
                               |
           web/src/pages/index.astro -> web/src/components/home/*.astro   (static HTML)
                               |
           web/src/scripts/motion.ts   (GSAP, layered on top; page is complete without it)
```

Everything happens at build time: the output in `web/dist/` is plain HTML, CSS, JS and images.
No request to Sanity is made from the browser, and the read token never reaches the output
(`web/tests/e2e/build-output.spec.ts` checks this).

## Modules

| File | Responsibility |
|---|---|
| `web/src/lib/types.ts` | Content types (`HomeData`, `Athlete`, ...) and the `as const` lists `DISCIPLINES`, `TRACKS`, `POST_KINDS` from which the union types derive |
| `web/src/lib/content.ts` | `getHomeData()`: picks the source, loads it, runs `parseHomeData()` (fails the build with the path of a bad field), then applies `visibleAthletes`, `byStart`, `latestPosts`. Also `buildToday()` |
| `web/src/lib/sanity.ts` | `HOME_QUERY` (one GROQ request, already filters `consent == true`, slices 3 posts), `fetchHomeQuery()` (client with token, `useCdn: false`, `perspective: 'published'`), `toHomeData()` (null-tolerant mapping; drops images without url, size or alt) |
| `web/src/lib/home.ts` | Pure homepage logic: consent filter, roster order and layout, calendar split, countdown wording, Romanian plurals, labels, `groupsHeading`. Caps `HOME_POSTS = 3`, `HOME_ROSTER = 3` |
| `web/src/lib/dates.ts` | ISO date strings in the Europe/Bucharest calendar, Romanian formatting, `todayInBucharest()` |
| `web/src/pages/404.astro` | The not-found page: copy, ways out, and `components/notfound/RallyScene.astro` (the 404 net and two players as static SVG, once per framing) |
| `web/src/lib/rally/` | The 404 rally without DOM: `court.ts` (framings, the net's digits and cords), `flight.ts` (shuttle drag, launch solvers), `figure.ts` (jointed silhouette to transforms), `rally.ts` (shots, footwork, net faults; `frame()` also yields the still frame at build time) |
| `web/src/scripts/rally.ts` | `initRally()`: steps the rally per animation frame and writes transforms; no visitor input, the scene is decoration |
| `web/src/pages/index.astro` | The homepage. Omits the roster section and the hero's "Vezi toți sportivii" link when no athlete is visible |
| `web/src/layouts/Base.astro` | `<html lang="ro">`, head, skip link, header, footer |
| `web/src/components/Site{Header,Footer}.astro` | Shell. Nav links to `/sportivi/`, `/program/`, `/calendar/`, `/noutati/`, `/contact/` point to pages that do not exist yet (plan 2) |
| `web/src/components/home/*.astro` | One component per section: Hero, Why, Groups, CalendarBand, Roster, Hall, News, TrialCta |
| `web/src/scripts/motion.ts` | `initMotion()`: the five motion moments (see `design-system.md`) |
| `web/src/styles/tokens.css`, `base.css` | Design tokens; reset, `.wrap`, `.display`, focus ring |
| `studio/` | Sanity Studio; see `content-model.md` |

Components receive typed props and do no filtering of their own beyond presentation; rules
such as consent and caps belong in `lib/`, where they are unit-tested.

## Environment variables (web build)

Template: `web/.env.example`. `pnpm build` loads `web/.env` into `process.env` (a variable set
in the shell wins). `pnpm dev` (`astro dev`) does not: export the variables in the shell.

| Variable | Meaning |
|---|---|
| `CONTENT_SOURCE` | `fixtures` or `sanity`. Empty: `sanity` if `SANITY_PROJECT_ID` is set, else `fixtures`. Any other value fails the build |
| `SANITY_PROJECT_ID` | Sanity project id (`4p2ry2u9`) |
| `SANITY_DATASET` | Dataset, default `production` |
| `SANITY_READ_TOKEN` | Read-only (Viewer) token for the private dataset; required with `sanity`, build-time only |
| `HOME_FIXTURE` | File in `web/src/fixtures/` for `fixtures`, default `home.json` |
| `BUILD_TODAY` | `YYYY-MM-DD` pins "today" for the build (tests use `2026-11-25`); unset in production |

Studio variables (`studio/.env.example`): `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`.

## "Today" and the countdown

The site is static, so "today" is the build date: `buildToday()` returns `BUILD_TODAY` or
`todayInBucharest()`. With it, `splitCalendar()` picks the next competition (the earliest whose
end is not past) and up to three played ones, and `countdownLabel()` writes "peste N zile",
"începe mâine", "începe azi" or "în desfășurare" (nothing beyond 60 days).

The countdown element carries `data-start`/`data-end`; a small script in `CalendarBand.astro`
recomputes the label from the visitor's clock with the same functions and hides it once the
event is over. Without JS the build-time label stays. The next/played split itself only changes
on a rebuild; a daily scheduled rebuild was ruled for the deploy but is not built yet (see
`decisions.md`, open items).

## Why one build per fixture

A static page cannot switch content at runtime, so each content variant the e2e suite needs is
its own `astro build --outDir dist-e2e/<name>` with its own preview port. Four fixtures cover all
cases; builds are cached by an input hash and only the servers of the selected tests are built.
Details in `testing.md`.

## Deploy (test deployment)

Target: Mario's own server, behind his SSO, not public and not indexed. The first deploy uses
`CONTENT_SOURCE=fixtures` (the Sanity seed has no photos yet).

- `deploy/docker-compose.yml`: one `nginx:alpine` service, container `badminton-galati`, bound to
  `127.0.0.1:3013`, `restart: always`, mounts `./dist` and `./nginx.conf` read-only.
- `deploy/nginx.conf`: `try_files $uri $uri/ =404` with `index.html`, `error_page 404 /404.html`
  (the site's 404 page, status kept, not cached), gzip,
  `/_astro/` cached for a year (`immutable`), everything else 5 minutes, `X-Robots-Tag: noindex,
  nofollow` on every response, relative redirects (`absolute_redirect off`).
- `scripts/deploy.sh` (`pnpm deploy:test [--dry-run]`): reads `DEPLOY_HOST`, `DEPLOY_USER`,
  `DEPLOY_PATH` (absolute), optional `DEPLOY_SSH_KEY` from the untracked `.deploy.env` (template
  `.deploy.env.example`) without executing it; refuses on a missing file or value or a dirty git
  tree; builds with `CONTENT_SOURCE` (default `fixtures`; `sanity` requires `SANITY_PROJECT_ID`
  and `SANITY_READ_TOKEN` in the environment) and `BUILD_TODAY` unset; rsyncs `web/dist/` to
  `$DEPLOY_PATH/dist/` with `--delete` and the two deploy files to `$DEPLOY_PATH/` (in place,
  so the single-file mount sees changes); then over ssh runs `docker compose up -d`, `nginx -t`
  and `nginx -s reload`; prints the deployed commit. `--dry-run` builds and runs rsync with
  `--dry-run`, then stops.
- The one-time server setup (directory, reverse proxy, TLS, SSO in front of port 3013) is done
  by Mario's site-manager tool on the server, not by this repo. Server address, user, path and
  keys never enter the repo.

The hosted Studio is separate: `pnpm --filter studio run deploy` publishes it to
https://siderurgistul-galati.sanity.studio/.
