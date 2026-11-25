# Roadmap

Five plans (plan 2 split into 2a and 2b); each is written (in `docs/superpowers/plans/`) when
its turn comes. Scope comes from the spec
(`docs/superpowers/specs/2026-11-25-site-siderurgistul-design.md`); deferred items come from the
plan 1 and plan 2a builds (see `decisions.md`).

## Plan 1: foundation and homepage (done)

Workspace, tokens and shell, homepage logic, Studio content model and seed, content layer with
fixtures and Sanity, homepage sections from mockup D, motion, targeted tests, test-deploy
scaffolding.

## Plan 2a: inner pages (done)

Plan `docs/superpowers/plans/2026-11-25-plan-2a-inner-pages.md`. The site-wide content layer
(`getSiteData`, one view module per page), the shared inner-page components, and eight pages:
athletes wall and athlete profiles (consent only), the season calendar, the news front and
article pages, the programme, the parents' page, contact with the trial form (e-mail until the
endpoint exists). Menu, footer and homepage link to them; the inner-pages sweep covers every
page at five widths. Copy to confirm with the club: `copy-to-confirm.md`.

## Plan 2b: Studio, images, endpoint, rebuild

- **Studio fields** for what the inner pages already read (list in `content-model.md`, "Studio
  fields still to add"): birth year, group slug, sessions with the example flag, coach type and
  group coach (+ `coachProvisional`), competition categories and results link, body photo block,
  club answers, programme note, phone, directions, reply days, `venuePhoto`, `parentsPhoto`.
  Remove the unused `group.schedule`.
- **Query:** fetch **all** posts for `/noutati/` (it still slices to 3 for the homepage), with
  body, gallery, results and competition; sessions, categories, coaches and club info. Must land
  with the query task.
- **Seed** and `home.json` updated together (parity test); post -> competition canonical.
- **Images:** `@sanity/image-url`, `srcset` with a matching `sizes`, hotspot crop (the web
  ignores the hotspot today; `Img.position` overrides the hero crop with no fixture covering it);
  then switch the test deploy to `CONTENT_SOURCE=sanity`.
- **Trial endpoint** `/api/proba` (server function, spam protection, `lib/trial.ts` checks the
  request again on Node), then build with `TRIAL_ENDPOINT`; replace the no-JS mailto.
- **Publisher:** a rebuild trigger after publishing in the Studio, and a **daily rebuild** (the
  calendar's year, the next/played split, categories by year).
- Studio usability for coaches: alt-text guidance for wall photos (describe the action), a
  phone-first "new article" flow with many photos in one selection; hall photos `max(8)`.
- Deferred from 2a: deep-freeze the shared site data; `slugifyRo` to one module with a parity
  test against the Studio; id uniqueness checks (competition, coach, athlete); calendar date
  clamped to the build date and a try/catch around its script; a second, non-colour cue for home
  events and dimmed rows (ask the owner); a photo between numbered list items restarts the
  numbering; the `Sample` HTML comment once per page; page-note wording when only a coach is
  provisional; homepage name links' underline.
- Still open from plan 1: a `formatRangeRo` guard for start <= end; a nested field check of the
  seed in the Studio test.

## Later plans: remaining pages

From the spec, not yet planned: Despre club (history, founded 7 March 2002, the hall on Bd.
Cloșca, the 2002 and 2023 Balkan Championships), Antrenori as a page (coaches and board),
Documente, Proiecte (Talents with Rackets, Erasmus+, the two handbooks), Galerie, Rezultate (by
season, from article results and FRB data), Pentru sponsori. Forms send email through a small
server function with invisible spam protection. Studio types for documents, sponsors, galleries
and fixed-page texts.

## Plan 3: migration, redirects and SEO

From the spec:
- Move the 15 old articles unchanged (migration).
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

Deferred from plans 1 and 2a:
- Points with decimals would print with a dot.
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
- Confirmation of all copy with the club (`copy-to-confirm.md`).
