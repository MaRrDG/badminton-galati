# Content model

Sanity project `4p2ry2u9` ("Siderurgistul Galati", organisation "CS Siderurgistul Galati"),
dataset `production`. Schemas in `studio/schemaTypes/`, registered in `index.ts`; Studio
structure and Romanian UI locale (`@sanity/locale-ro-ro`) in `studio/sanity.config.ts`.
Field titles, descriptions and validation messages are Romanian (they are for the coaches).

The site has the homepage and eight inner pages (plan 2a). The Studio still holds only the plan 1
model: "Used by" in the tables below names what `HOME_QUERY` (`web/src/lib/sanity.ts`) reads.
The inner pages read more fields than the Studio has; those live in the web types
(`web/src/lib/types.ts`) and the fixtures until plan 2b adds them to the Studio (section
"Fields of the inner pages" below). With `CONTENT_SOURCE=sanity` they take empty defaults, so
those pages show their "de confirmat" or empty states.

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

## Fields of the inner pages (plan 2a)

Added to `SiteData` in plan 2a, checked by `parseSiteData()` (`content.ts`) and filled in the
fixtures. "Studio" says whether the Studio has the field yet; everything marked "no" is plan 2b
work (schema, seed, GROQ projection, mapping in `toHomeData()`).

| Field (web type) | Meaning | Used by | Studio |
|---|---|---|---|
| `Athlete.birthYear` | Year of birth (1900–2100) | Age category when the athlete has no place (`athleteCategory`): wall tile line and filter, profile "Categoria", article tags | no |
| `Athlete.groupId` | The athlete's group (`Group.id`) | Profile "Grupa" (else "de confirmat") | `group` reference exists, not read |
| `Group.id`, `Group.slug` | Derived from the name when missing (`group-initiere`, `initiere`; Sanity: `_id` and `slugifyRo(name)`) | Anchors `/program/#slug`, homepage group links, filter values | no slug field |
| `Group.sessions[]{day, start, end, provisional?}` | Training sessions: ISO weekday 1–7, `HH:MM` 24 h, end after start; `provisional` = example hours | `/program/` timetable and filter counts; homepage group schedule line | no (`schedule` text exists, unused: drop it) |
| `Group.coachId`, `Group.coachProvisional` | The group's coach; whether that assignment is an example | `/program/` group guide (hatched when provisional) | `coachProvisional` is projected by GROQ, no field yet; no `coachId` |
| `coaches[]` (`Coach{id, name, role?, photo?}`) | The club's coaches | `/pentru-parinti/` "Cine sunt antrenorii?" (photo or initial tile; role only when given); `/program/` guide | no type |
| `Competition.categories[]` | From `COMPETITION_CATEGORIES` (U9 … U23, Seniori, Echipe) | `/calendar/` category filter (shown from two categories) | no |
| `Competition.resultsUrl` | FRB results page | `/calendar/` panel and list ("Rezultatele pe badminton.ro"), article aside | no |
| `Competition.postSlug` | Derived: the newest post whose `competitionId` is this competition (a source value is ignored) | `/calendar/` "Articolul clubului"; homepage band | derived |
| `Post.competitionId` | The competition the article is about | Article aside "Competiția din articol" with "În calendar" (only when the event is in the build year) | reference exists, not read |
| `Post.body[]` | Portable Text: `block` (normal, h2, h3, blockquote, bullet/number lists, strong, em, http(s)/mailto links) and `photo` blocks inside the text; unknown types and marks are dropped | Article text (first plain paragraph is the lead and the meta description) | text blocks yes, `photo` block no; not read |
| `Post.gallery[]` | Photos | Article "Fotografii" mosaic and lightbox | yes, not read |
| `Post.results[]{athleteId, discipline?, result}` | Results in the article; only consented athletes are kept | Article "Sportivi în articol"; profile "Apare în articolele clubului" and medals (`aur`, `argint`, `bronz`) | yes (`resultRow`), not read |
| `info.parents{age, equipment, cost, firstWeeks, registration}` | The club's answers to parents' questions (blank lines split paragraphs) | `/pentru-parinti/`; each missing answer is a `Tbc` line | no |
| `info.programNote` | A note under the timetable | `/program/` | no |
| `info.contact{phone, directions, replyDays}` | Club phone, how to get to the hall, reply time in days | `/contact/` panel and the sent state ("Vă sunăm în cel mult N zile."); each missing one is a `Tbc` | no |
| `info.venuePhoto` | The hall itself (the courts) | `/pentru-parinti/` "Unde e sala?" (fallback: the first hall photo that is not the opening one), `/contact/` (fallback: the first hall photo). No photo is ever chosen by file name | projected from `siteSettings`, no field yet |
| `info.parentsPhoto` | Children and coaches together | Opens `/pentru-parinti/`; fallback: first hall photo | projected from `siteSettings`, no field yet |
| `Img.position`, `Img.srcset` | CSS `object-position`; a `srcset` when the source has sizes | Every `Photo` | plan 2b (hotspot, image URL builder) |

`home.json` holds only real facts (coaches by name, no roles; the venue and parents' photos; the
competitions' categories). Test-only data (birth years, sessions, an example coach, answers,
an article with body, gallery and results) lives in `quiet-season.json` on fictional names.

## Studio fields still to add (plan 2b)

- `athlete.birthYear`; read `athlete.group` as `groupId`.
- `group.slug`, `group.sessions[]` (day, start, end, "oră dată ca exemplu" flag),
  `group.coach` (reference) and `group.coachProvisional`; remove the unused `group.schedule`.
- A `coach` type (name, optional role, photo with alt).
- `competition.categories[]`, `competition.resultsUrl`.
- `post.body` photo block; read `body`, `gallery`, `results` and `competition` in the query.
- A club-info document (or `siteSettings` fields): parents' answers, programme note, phone,
  directions, reply days, `venuePhoto`, `parentsPhoto` (move the GROQ projection if they land
  on another document).
- The query must fetch **all** posts for `/noutati/` (it still slices to 3 for the homepage).
- Seed and `home.json` updated together (the parity test).
- Alt-text guidance for athlete photos on the wall: describe the action, not the name.

## Known schema follow-ups

- Post and competition reference each other (`competition.post`, `post.competition`); make
  post -> competition canonical before coaches get access (plan 2).
- Hall photos: add `max(8)`; a captions field only if the club supplies captions (plan 2b).
- The web ignores the image hotspot and serves original asset URLs; image sizing with
  `@sanity/image-url` (srcset with a matching `sizes`, hotspot crop) must land before any
  Sanity-backed deploy (plan 2b).
- FRB URLs write mixed doubles as `xd`, the schema uses `DX`: map in the sync; points may use a
  decimal comma (plan 4).
- The spec lists fields not modelled yet beyond the plan 2b list above: competition host, and
  types for documents, sponsors, galleries and fixed-page texts (later plans).
