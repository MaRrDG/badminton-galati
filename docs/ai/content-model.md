# Content model

Sanity project `4p2ry2u9` ("Siderurgistul Galati", organisation "CS Siderurgistul Galati"),
dataset `production`. Schemas in `studio/schemaTypes/`, registered in `index.ts`; Studio
structure and Romanian UI locale (`@sanity/locale-ro-ro`) in `studio/sanity.config.ts`.
Field titles, descriptions and validation messages are Romanian (they are for the coaches).

Only the homepage exists so far; "Used by" names what `HOME_QUERY` (`web/src/lib/sanity.ts`)
reads. Everything else is stored for plan 2 pages.

## Document types

### `siteSettings` ("Pagina principală", singleton, id `siteSettings`)
| Field | Type | Meaning | Used by |
|---|---|---|---|
| `heroLines` | string[] | Motto, one line per entry; 2–4 required, warning above 20 chars | Hero headline |
| `heroText` | text | Sentence under the headline | Hero |
| `heroPhoto` | image + `alt` | Poster photo; missing = warning only | Hero |
| `whyIntro`, `whyPhoto`, `whyPoints[]{title,text}` | text, image, objects | "De ce badminton" section | Why |
| `hallText`, `hallPhotos[]` | text, images | Hall section and photo strip | Hall |
| `groupsIntro` | text | Intro of the groups section | Groups |
| `trialText` | text | Trial-training call to action | TrialCta |
| `rankingWeek{week,from,to}` | object | FRB ranking week the places come from | Roster source line |

### `athlete` ("Sportiv")
| Field | Meaning | Used by |
|---|---|---|
| `name` | As in the FRB ranking | Roster |
| `slug` | From the name via `slugifyRo` (strips diacritics) | Roster (future athlete page) |
| `consent` | "Acord părinte"; `initialValue: false` | Consent filter everywhere |
| `frbUrl` | Profile on badminton.ro | Roster "Profilul FRB" link |
| `photo` | image + `alt` | Mapped, not rendered on the homepage yet |
| `group` | reference to `group` | Not read yet (plan 2) |
| `rankings[]{category, discipline, place, points}` | Read-only in the Studio: meant to be written by the FRB sync (plan 4); the seed holds the current values | Roster order, rank numerals |

### `group` ("Grupă")
`name`, `audience` (who it is for), `track` (`performanta` or `amatori`), `schedule` (optional
days and hours; empty until the club supplies it), `order` (integer from 1). Used by Groups
(two lists by track, heading from `groupsHeading()`), sorted by `order`.

### `competition` ("Competiție")
`title` (uses "și", never "&"), `city` (may be "de confirmat"), `start`, `end` (not before
`start`), `home` (played in Galați), `post` (optional reference to the results article). Used by
CalendarBand (next with countdown, three played). `post` is mapped to `postSlug` but not
rendered yet.

### `post` ("Articol")
`title`, `kind` (`competitie`, `viata-clubului`, `proiecte`), `date`, `cover`, `body` (Portable
Text: normal, h2, h3, blockquote, lists, strong, em, links), `gallery[]`, `slug`, and in the
collapsed "Legături" fieldset `competition` (reference) and `results[]` (`resultRow`: `athlete`
reference filtered to `consent == true`, `discipline`, `result` text such as "aur" or "locul 5").
The homepage reads `title`, `slug`, `kind`, `date`, `cover` of the 3 newest posts.

Shared (`shared.ts`): `altField` (required alt text, validation error), `imageOptions`
(`hotspot: true`), `disciplines` (SB, SF, DB, DF, DX), `slugifyRo`.

## Consent, end to end

1. Studio: `consent` starts false; the athlete preview says whether they appear on the site;
   `post.results[].athlete` only offers consented athletes.
2. Seed: all three real athletes have `consent: false` (no written parental consent yet).
3. GROQ: `*[_type == "athlete" && consent == true]`, so other athletes' data never leaves Sanity.
4. `toHomeData()` filters again; `parseHomeData()` filters again for both sources (fixtures
   included); `rosterOrder()` filters again before the 3-athlete cap.
5. Page: with no visible athlete the roster section and the hero link to it are omitted.
6. Tests: unit (`visibleAthletes`, `rosterOrder`, mapping, fixtures), e2e on `mixed-strip` (a
   non-consenting athlete holding place 1 is absent from the HTML), on `sparse` (roster omitted),
   Studio schema test for the reference filter and for the seed.

Spec rule: a non-consented athlete has no page, is not in lists, counts or figures, and is not
a link or taggable in articles; their FRB data is not shown either.

## Private dataset and token

The dataset is private (an anonymous API read returns `[]`), because a public dataset would
expose non-consented athlete documents through the API. The web build therefore needs
`SANITY_READ_TOKEN`, a read-only "Viewer" token created in sanity.io/manage, kept only in the
build environment (never in git, never in client code). A missing token fails the build with a
message naming the variable.

## Seed (`studio/seed/seed.ndjson`)

24 documents, imported into `production`: `siteSettings` (motto, texts, ranking week 46,
9–15 November 2026), 5 groups, 3 athletes (consent false, one ranking each, FRB links), 12
competitions of the 2026 FRB calendar, 3 recent posts. No images and no references (athlete to
group, post to competition) yet. `web/src/fixtures/home.json` must hold the same facts (a unit
test compares them, ignoring `consent`; fixtures keep consent true as local test data).

## Known schema follow-ups

- Post and competition reference each other (`competition.post`, `post.competition`); make
  post -> competition canonical before coaches get access (plan 2).
- Hall photos: add `max(8)`; a captions field only if the club supplies captions (plan 2).
- The web ignores the image hotspot and serves original asset URLs; image sizing with
  `@sanity/image-url` (srcset, hotspot crop) must land before any Sanity-backed deploy.
- FRB URLs write mixed doubles as `xd`, the schema uses `DX`: map in the sync; points may use a
  decimal comma (plan 4).
- The spec lists fields not modelled yet: athlete birth year, competition categories and host,
  and types for coaches, documents, sponsors, galleries and fixed-page texts (plan 2).
