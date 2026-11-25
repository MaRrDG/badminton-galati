# Roadmap

Five plans; each is written (in `docs/superpowers/plans/`) when its turn comes. Scope comes from
the spec (`docs/superpowers/specs/2026-11-25-site-siderurgistul-design.md`); deferred items come
from the plan 1 build (see `decisions.md`).

## Plan 1: foundation and homepage (done)

Workspace, tokens and shell, homepage logic, Studio content model and seed, content layer with
fixtures and Sanity, homepage sections from mockup D, motion, targeted tests, test-deploy
scaffolding.

## Plan 2: inner pages and forms

From the spec:
- Prerequisite: Sanity image sizing (`@sanity/image-url`, `srcset`, hotspot) before deploying
  from Sanity; then switch the test deploy to `CONTENT_SOURCE=sanity`.
- Pages: about the club (one page: history, founded 7 March 2002, the 4-court hall on Bd.
  Cloșca, the 2002 and 2023 Balkan Championships); coaches and board (photos, club address only);
  news list and article pages (three kinds, competition articles linked to the calendar event,
  tagged athletes and a gallery); full competition calendar (age filter, home events marked,
  played events link to the article and FRB results); documents; projects (Talents with
  Rackets, Erasmus+, two handbooks); contact (address, map, phone, form).
- New pages: athletes list and athlete page (consent only; FRB places, points, tournaments,
  medals, photos, articles, FRB link); schedule and groups; trial-training form (parent name,
  phone, child's age, message, to the club email); gallery; results by season (from article
  results and FRB data); for parents; for sponsors.
- Forms send email through a small server function with invisible spam protection.
- Studio: types for coaches, documents, sponsors, galleries and fixed-page texts; a phone-first
  "new article" flow with many photos in one selection.

Deferred from plan 1:
- `aria-current` in `SiteHeader.astro` matches the exact path only; make it match sub-pages by
  prefix. Remove the dead `id="contact"` on the footer; add the Facebook link
  (facebook.com/badmintongalati).
- `formatRangeRo` guard for start <= end; nested field check of the seed in the Studio test.
- Make post -> competition the canonical reference (drop the two-way link) before coaches get
  access.
- Hall photos `max(8)` in the Studio; captions field if the club supplies captions.
- Extract the shared poster plate and section-head components.
- Nav links (`/sportivi/`, `/program/`, `/calendar/`, `/noutati/`, `/contact/`) and article links
  currently lead to 404s; these pages fill them.

## Plan 3: migration, redirects and SEO

From the spec:
- Move the 15 old articles unchanged.
- Redirects from every old address (`/page-2/`, `/blog/post1/`, ...) to the new ones.
- Share previews for Facebook and WhatsApp (image, title, description); titles and descriptions
  for searches like "badminton Galați"; structured data for a local sports club; sitemap.
- Cookie-free visit statistics (no consent banner).

## Plan 4: FRB ranking sync

From the spec:
- Weekly scheduled job after FRB publishes the ranking; for each athlete with an FRB link it
  reads place, points and scoring tournaments, saves them with a weekly snapshot for history,
  and triggers a rebuild. The spec named GitHub Actions; revisit given the own-server deploy.
- Homepage figures computed from this data only; on failure keep the last good data, show
  "actualizat la data X" and email Mario; never show an error to visitors.
- Polite reading (few requests, pauses, identified as the club); off by default until the club
  has the FRB agreement.

Deferred from plan 1:
- FRB URLs write mixed doubles as `xd`; the schema uses `DX`: map it.
- Points may be written with a decimal comma: parse it.

## Plan 5: launch on the club's domain

From the spec:
- Choose hosting that serves `badmintongalati.ro` and `www` while the name servers stay at
  ROMARG; change only the site records; leave the email records (and the ROMARG hosting
  package, while email lives there) untouched.
- Remove the test deployment's `noindex`.
- Coaches' accounts and moving ownership to a club email at handover.

Deferred from plan 1:
- Safari and Firefox pass (including the `<details>` menu and `::details-content`).
- Font preload.
- Confirmation of all copy with the club.
