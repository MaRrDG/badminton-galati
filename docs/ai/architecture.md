# Architecture

## Data flow

```
Sanity (private dataset, read token)   or   web/src/fixtures/<HOME_FIXTURE>.json
                 \                              /
          web/src/lib/sanity.ts            (import.meta.glob)
     HOME_QUERY + toHomeData()                 /
                  \                           /
          web/src/lib/content.ts  getSiteData() -> parseSiteData()      one read + parse per build
            (shape check, consent filter, results of consented athletes only, sorts)
                               |
                         SiteData (memoized)
          /             |              |                \
   homeView()   athletesView()   calendarView() …   contactView()      page modules in lib/
          |             |              |                |
   pages/index   pages/sportivi/…  pages/calendar/   pages/contact/     -> components/<area>/*.astro
                               |
   web/src/scripts/*.ts   (motion, the calendar's "today", filters' status, form, share, lightbox;
                           layered on top; every page is complete without them)
```

Everything happens at build time: the output in `web/dist/` is plain HTML, CSS, JS and images.
No request to Sanity is made from the browser, and the read token never reaches the output
(`web/tests/e2e/build-output.spec.ts` checks this).

### The site-wide content layer

`getSiteData()` (`content.ts`) loads the source once per build and keeps the promise per
`CONTENT_SOURCE`, `SANITY_PROJECT_ID`, `SANITY_DATASET` and `HOME_FIXTURE` (a failed load is not
kept), so the homepage and every inner page share one read, one shape check and one consent
filter. `parseSiteData()` checks the shape (a bad field fails the build with its path), keeps
only consented athletes and only post results that name one of them, sorts competitions by
start and posts newest first, derives each competition's `postSlug` (the newest linked post) and
fills in the lists the inner pages added (`sessions`, `categories`, `body`, `gallery`,
`results`, `coaches`, `info`) when a source leaves them out.

The shared `SiteData` is never sorted or changed in place: each page module copies what it
reorders. Each page has one getter in `content.ts` that calls `getSiteData()` and hands the data
to a pure view function in its own module, which is where the page's rules live and are
unit-tested:

| Getter (`content.ts`) | View function | Route |
|---|---|---|
| `getHomeData()` | `homeView()` (`content.ts`; caps from `home.ts`) | `/` |
| `getAthletesPage()` | `athletesView()` (`athletes.ts`) | `/sportivi/` |
| `getAthleteProfiles()` | `athleteProfile()` (`athletes.ts`), one per consented athlete | `/sportivi/[slug]/` |
| `getCalendarPage()` | `calendarView()` (`calendar.ts`) | `/calendar/` |
| `getNewsPage()` | `newsView()` (`news.ts`) | `/noutati/` |
| `getPostPages()` | `postView()` (`article.ts`), one per post | `/noutati/[slug]/` |
| `getProgramPage()` | `programView()` (`program.ts`) | `/program/` |
| `getParentsPage()` | `parentsView()` (`parents.ts`) | `/pentru-parinti/` |
| `getContactPage()` | `contactView()` (`content.ts`) | `/contact/` |

`parseHomeData()` is kept as the plan 1 entry point (`homeView(parseSiteData(...))`). Pages
that depend on the date take `buildToday()` (athletes' categories count in its year; the
calendar marks it).

## Routes

| Route | Page | Layout (owner's rule: the layout natural to the content) |
|---|---|---|
| `/` | `pages/index.astro` | Homepage, mockup D |
| `/sportivi/` | `pages/sportivi/index.astro` | Wall of portrait tiles, category filter |
| `/sportivi/[slug]/` | `pages/sportivi/[slug].astro` | Profile poster, standing, articles, medals; generated only for consented athletes |
| `/calendar/` | `pages/calendar/index.astro` | Twelve month grids of the build year, category filter, side panel, plain list |
| `/noutati/` | `pages/noutati/index.astro` | Photo-led front, kind filter, older list |
| `/noutati/[slug]/` | `pages/noutati/[slug].astro` | Article: cover, body, linked competition, tagged athletes, gallery with lightbox, share row |
| `/program/` | `pages/program/index.astro` | Week timetable with group picker, guide to the groups |
| `/pentru-parinti/` | `pages/pentru-parinti/index.astro` | Calm reading page: questions, steps, coaches, the hall |
| `/contact/` | `pages/contact/index.astro` | The trial form beside the hall's address |
| 404 | `pages/404.astro` | Not-found page with the rally |

The menu (`SiteHeader.astro`) marks the current entry with `isCurrent()` (`lib/nav.ts`):
`aria-current="page"` on the section's own page, `"true"` on the pages under it.

## Modules

| File | Responsibility |
|---|---|
| `web/src/lib/types.ts` | Content types (`SiteData` = `HomeData` + `coaches` + `info`; `Athlete`, `Group`, `Session`, `Post`, `BodyBlock`, `ClubInfo`, ...) and the `as const` lists `DISCIPLINES`, `TRACKS`, `POST_KINDS`, `WEEKDAYS`, `COMPETITION_CATEGORIES` from which the union types derive |
| `web/src/lib/content.ts` | `getSiteData()`, `parseSiteData()`, the page getters above, `homeView()`, `contactView()`, `buildToday()` |
| `web/src/lib/sanity.ts` | `HOME_QUERY` (one GROQ request, already filters `consent == true`, slices 3 posts), `fetchHomeQuery()` (client with token, `useCdn: false`, `perspective: 'published'`), `toHomeData()` (null-tolerant mapping to `SiteData`; drops images without url, size or alt; inner-page fields not in the Studio yet take empty defaults), `slugifyRo()` (copy of the Studio's slug rule) |
| `web/src/lib/club.ts` | The club's fixed contact facts: `CLUB_EMAIL`, `FACEBOOK_URL`, `HALL_MAP_URL` (the hall on Google Maps by its coordinates). Every page and component that shows them imports them from here |
| `web/src/lib/home.ts` | Pure homepage logic: consent filter, roster order and layout, calendar split, countdown wording, labels, `groupsHeading`. Caps `HOME_POSTS = 3`, `HOME_ROSTER = 3` |
| `web/src/lib/athletes.ts` | Age category (`athleteCategory`: best place's category, else from the birth year), wall order and filter, the profile view (facts, standing, articles, medals) |
| `web/src/lib/calendar.ts` | Month grids from Monday, event blocks across days, statuses (`played`, `next`, `upcoming`), season intro, category filter, the plain list split by start month |
| `web/src/lib/news.ts`, `article.ts`, `body.ts` | News front layout and kind filter; article neighbours, gallery mosaic, tagged rows, meta description; Portable Text to safe HTML with photos as their own segments |
| `web/src/lib/program.ts` | Week planner (half-hour rows, lanes for overlaps, gap rows), group tones, schedule lines (`scheduleParts`, also used by the homepage groups), the programme view |
| `web/src/lib/parents.ts` | The parents' page: answers as paragraphs, coaches, opening and hall photos, count-aware coach sentences |
| `web/src/lib/trial.ts` | The trial request: checks and Romanian messages, the pre-filled e-mail (`trialMailto`), `trialDelivered`. Import-free so plan 2b's endpoint can run it on Node |
| `web/src/lib/filter.ts` | CSS for the radio + `:has()` filters (`filterCss`, `filterBarCss`), `DIM_OPACITY` |
| `web/src/lib/ro.ts`, `tiles.ts`, `nav.ts`, `dates.ts` | Romanian counts; initials and tile tones; the menu's current entry; ISO dates in Europe/Bucharest, Romanian formatting, `todayInBucharest()` |
| `web/src/lib/rally/` | The 404 rally without DOM: `court.ts` (framings, the net's digits and cords), `flight.ts` (shuttle drag, launch solvers), `figure.ts` (jointed silhouette to transforms), `rally.ts` (shots, footwork, net faults; `frame()` also yields the still frame at build time) |
| `web/src/layouts/Base.astro` | `<html lang="ro">`, head, skip link, header, footer (`base.css` makes `body` a full-height flex column, so short pages fill the window) |
| `web/src/components/Site{Header,Footer}.astro` | Shell: menu with the current entry marked; footer with the club, the hall, the e-mail, the parents' page, Facebook and the federations |
| `web/src/components/home/*.astro` | One component per homepage section: Hero, Why, Groups, CalendarBand, Roster, Hall, News, TrialCta |
| `web/src/components/ui/*.astro` | Pieces shared by the inner pages (and some by the homepage): `Photo`, `PlatePhoto`, `InitialTile`, `PageHead`, `SectionHeading`, `FilterBar`, `Tbc`, `Sample`, `ClosingCta` (table in `design-system.md`) |
| `web/src/components/{athletes,calendar,news,program,parents,contact}/` | The inner pages' own parts |
| `web/src/components/notfound/RallyScene.astro` | The 404 net and two players as static SVG, once per framing |
| `web/src/scripts/motion.ts` | `initMotion()`: the homepage's five motion moments (GSAP) |
| `web/src/scripts/page-motion.ts` | `initPageMotion(moment)`: the one moment of each inner page (GSAP); `roll.ts` holds the digit bands shared with the homepage roster |
| `web/src/scripts/rally.ts` | `initRally()`: steps the 404 rally per animation frame (no GSAP) |
| `web/src/scripts/countdown.ts`, `calendar-today.ts`, `calendar-panel.ts` | The visitor's clock: countdown labels; the calendar's today, statuses and next event; the calendar's side panel |
| `web/src/scripts/filter-status.ts`, `lightbox.ts`, `share.ts`, `trial-form.ts` | Filter count announcements; the article gallery's lightbox; the share row; the trial form's checks, states and sending |
| `web/src/styles/tokens.css`, `base.css` | Design tokens; reset, `.wrap`, `.display`, `.tbc`, focus ring, visually hidden |
| `studio/` | Sanity Studio; see `content-model.md` |

Components receive typed props and do no filtering of their own beyond presentation; rules
such as consent, caps, order and categories belong in `lib/`, where they are unit-tested.

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
| `TRIAL_ENDPOINT` | The trial form's endpoint (plan 2b, e.g. `/api/proba`). Read by `TrialForm.astro` at build time. Empty or unset (every build until plan 2b, and the e2e builds, which set it to `''` in `tests/e2e/site.ts`): a valid request opens a pre-filled e-mail to the club right inside the submit click, and nothing goes over the network. Set: the form POSTs JSON there and counts it delivered only on 2xx with `{ "ok": true }`; otherwise it offers the same e-mail |

Studio variables (`studio/.env.example`): `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`.

## "Today" on a static site

The site is static, so "today" is the build date: `buildToday()` returns `BUILD_TODAY` or
`todayInBucharest()`. With it, `splitCalendar()` picks the next competition (the earliest whose
end is not past) and up to three played ones, and `countdownLabel()` writes "peste N zile",
"începe mâine", "începe azi" or "în desfășurare" (nothing beyond 60 days). The athletes' age
categories count in the build year; the calendar shows the build year's months.

The browser corrects what the date would otherwise make false:

- **Countdowns** (`scripts/countdown.ts`): every `[data-countdown]` with `data-start`/`data-end`
  (homepage band, calendar panel) is recomputed from the visitor's clock with the same
  functions and emptied once the event is over.
- **The calendar** (`scripts/calendar-today.ts`): the calendar root carries `data-today` (the
  build date). When the visitor's date in Bucharest differs, the script recomputes everything
  that depends on it with the same `lib/` rules: the today mark (class and
  `aria-current="date"`), the legend's date, each block's and each list row's status (classes,
  words, labels), and the panel's next event or its season-over line. Owner's ruling: a static
  page must not state a false date.

Without JS the build-time state stays. The next/played split on the homepage and the calendar's
year change only on a rebuild; a daily scheduled rebuild (plan 2b) bounds the staleness.

## The provisional flag

Some values are examples the club has not confirmed yet: `Session.provisional` (the hours of one
session) and `Group.coachProvisional` (the group's coach assignment). They are never shown as
fact: `ui/Sample.astro` hatches the value in court orange and adds a hidden ", oră dată ca
exemplu" / ", antrenor dat ca exemplu" for screen readers. On `/program/` the timetable blocks
and the guide's coach names use it, and the page shows one note ("Orele sunt exemple, clubul
le confirmă. …") when any session or assigned coach is provisional (`ProgramPage.provisional`);
the homepage's group schedule line hatches example hours too. Unknown data (as opposed to an
example) is shown with `Tbc` ("De confirmat de club: …") or left out.

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
