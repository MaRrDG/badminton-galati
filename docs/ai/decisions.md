# Decisions

Plan 1 rulings are dated 2026-11-25 (plan 1 was built that day); plan 2a rulings (inner pages)
2026-11-25/26, in their own section below. "Cost if wrong" is what reverting or a
mistaken assumption would cost. The spec (`docs/superpowers/specs/`) holds the earlier product
decisions; this log holds what was decided while building, and where it supersedes the spec.

## Owner's decisions (Mario)

| Decision | Why / note |
|---|---|
| The GitHub repository `MaRrDG/badminton-galati` stays public | His choice, made after being warned that it contains minors' names and club photos. Consequence: no secrets, server addresses or deploy settings in tracked files |
| Commits use his personal identity; no `Co-Authored-By`, session links or AI attribution | History was rewritten before the first push to match (21 commits). Supersedes the plan's original "attribution trailer" line |
| All repo artefacts in English (code, comments, docs, commits, README); site copy and Studio labels stay Romanian | The spec was translated; the Romanian original is not kept |
| Test deployment on his own server, behind his SSO, via his site-manager tool; static nginx container on port 3013 | Supersedes the spec's free static host (Cloudflare Pages/Netlify) for the test address. Hosting for launch on the club's domain is still open (plan 5) |
| First demo deploy uses `CONTENT_SOURCE=fixtures` | The Sanity seed has no photos, so a Sanity-backed page would be bare. Switch when content and photos are entered and image sizing has landed (start of plan 2) |
| Sanity dataset `production` is private | A public dataset would expose non-consented athlete documents via the API. Cost: one read token to manage on the build machine |
| Studio published at https://siderurgistul-galati.sanity.studio/; coaches not invited yet | Needs the coaches' emails from Mario |
| Tests must be targeted: only affected tests during work, the full suite once before merge/push, e2e fast | Led to the changed-only commands and the four-fixture setup (`testing.md`) |
| Mockup D approved; hero carries the club motto; groups as two plain lists; no flip-card scoreboard | See `design-system.md` for his objections |

## Build rulings

### Content and data
| Ruling | Why | Cost if wrong |
|---|---|---|
| Consent filter in the content layer, before caps, for both sources; seed athletes `consent: false` | Real minors, no written parental consent yet | A Sanity-backed site shows no athletes until consent is ticked (intended) |
| Competition titles use "și", never "&" | Romanian copy rule; the mockup uses "și" | Trivial |
| Hero and why photos optional; a missing image maps to `undefined`, never an empty image | Seed has no photos | None |
| Hall strip has no captions; the hero photo caption "Sala Siderurgistul, Galați" dropped | Captions were unconfirmed copy; the location of that photo is unknown | Re-add a captions field in plan 2 if the club supplies them |
| Homepage caps: 3 newest posts, 3 athletes, enforced in GROQ and in code | The mockup shows 3 of each and links to full lists | Trivial to change |
| Empty roster: section and hero link "Vezi toți sportivii" omitted | Avoids an empty heading at launch, the likely state until consents arrive | None |
| Posts sorted newest first and competitions by start in the content layer | Fixture file order must not matter | None |
| Groups heading derived from the data ("Cinci grupe, pe două drumuri") | It was hard-coded while groups are data | None |
| Accepted copy: "Nicio competiție programată deocamdată." for the empty calendar; "Tot calendarul {year}" with the year from data; empty alt only on the decorative logo | True statements needed for empty states | Trivial |
| Keep `@sanity/locale-ro-ro` | Coach-facing UI in Romanian serves the spec | None |
| Build needs `SANITY_READ_TOKEN` with `CONTENT_SOURCE=sanity`; missing token fails with a clear message; token never in output | Private dataset | One secret on the build machine |
| Production builds set `CONTENT_SOURCE` explicitly and log the source | No silent fallback to fixtures | None |

### Dates and countdown
| Ruling | Why | Cost if wrong |
|---|---|---|
| "Today" is the build date in Bucharest (`todayInBucharest()`, or `BUILD_TODAY`); a small inline script recomputes the countdown label in the browser and hides it after the event; a daily scheduled rebuild keeps the next/played split right | Static site; the spec wants a live countdown and the mockup computed it client-side | Split stale for up to a day if a rebuild fails. The daily rebuild is not built yet |

### Design and accessibility
| Ruling | Why | Cost if wrong |
|---|---|---|
| Roster without rankings: equal rows; with one ranked athlete, the unranked ones get small rows, never the medium pair | No unearned prominence | None |
| Hero lines may wrap below 860px | The coach-editable motto must never clip | Slightly different poster look on phones |
| Text on red fields uses `--red-field #D63340` (4.77:1); accents keep `--red #E23A45` | White on `#E23A45` is 4.26:1, below AA | Tiny visual shift; Mario may revert, it is a brand colour |
| Focus ring `3px solid currentColor` | The orange ring was 2.22:1 on white | None |
| Local photos resized to ≤1280px, hero eager/high priority, others lazy | A full scroll loaded 3.1 MB | Sanity image sizing still owed |

### Motion
| Ruling | Why | Cost if wrong |
|---|---|---|
| Pin the hero's inner `.wrap`, not the section | Keeps `main > section` order | None |
| Strip pin length kept at the mockup ratio | Mario approved the mockup behaviour | None |
| A strip with fewer than 2 photos never pins at any width; a single photo is capped to the column width | One photo pinned and overflowed (570px in a 358px column) | None |
| Running e2e clock (`clock.ts`) instead of a frozen one | GSAP's ticker needs time to advance | None |
| Still frames accepted instead of video for motion review | Viewed by the reviewer | None |

### Testing
| Ruling | Why | Cost if wrong |
|---|---|---|
| One build + preview per fixture, separate outDir and port, chosen by test tag | The site is static: one build = one fixture | Slower e2e; mitigated by caching and selection |
| Seven fixtures merged into four | Cold e2e from 109.5 s to 22.9 s with every guarded risk still tested | See `testing.md` for what moved where |
| 1440px scroll scans removed; 390px scans kept on `home` and `sparse` | Wide screens offset at most 90px with room; overflow at 1440 covered elsewhere | A wide-only clip would be caught only by the 1440 overflow tests |

### Process
| Ruling | Why |
|---|---|
| Plan task order 1–6; the Studio schema, tests and seed were written before the Sanity project existed | The web runs on fixtures, so nothing waited for the login |
| The test-address task (plan task 7) not started without Mario's explicit go-ahead | Publishing is an outside side effect. Replaced by the own-server deploy scaffolding (`deploy/`, `scripts/deploy.sh`); no deploy has been run from this repo yet |

## Plan 2a rulings (inner pages, 2026-11-25/26)

### Owner (Mario)
| Ruling | Why | Cost if wrong |
|---|---|---|
| Each page gets the layout natural to its content; big uppercase display type once per page (title, a featured article title, the closing CTA headline); modest section headings; no thick rules as dividers; empty states never louder than content; one motion moment per inner page | He rejected the first round: "you abuse those lines and the big blue text far too much… the same layout on every page" | A redesign of one page |
| Adults can ask for a trial: the form asks "Cine vine la antrenament?" (Copilul meu / Eu); a child needs the parent's name and an age of 3–18, an adult only a name | There is an "Amatori adulți" group | Small form change |
| Example hours and coaches never read as fact: `provisional` on a session and `coachProvisional` on a group, hatched (`Sample`), with one page note on `/program/`; also hatched on the homepage group line. The note ships whenever data is provisional | Sample hours from the mockup looked real | None; the Studio flag comes in plan 2b |
| The parents' page "De confirmat de club" lines speak to the club and are the visible state until answers arrive | Approved as the launch state | Copy change |

### Content and data
| Ruling | Why | Cost if wrong |
|---|---|---|
| One site parse per build (`getSiteData` memoized per source variables); pages never sort or change the shared data in place | Eight pages and the homepage share one read and one consent filter | A deep-freeze is still owed; a mutating page would corrupt other pages |
| Consent filter before any cap, order or count, also for article results; duplicate slugs refused before the filter; a non-consenting athlete has no profile route | Real minors | None |
| Invented test data only on fictional names (`Zet Exemplu-Ana`, `Fără-Acord Zamfira`, `Antrenor Exemplu`); a result first written for a real athlete moved to a fictional one; invented answers only in `quiet-season.json`, never in `home.json` (the deployed test site builds from it) | No invented facts about real people | None |
| Group `id`/`slug` derived from the name when missing (`slugifyRo`, the Studio's rule); `postSlug` derived from the newest linked post, never read | The Studio has no group slug yet; post -> competition is the canonical link | Small edits in `content.ts` |
| No photo is ever chosen by file name: optional `info.venuePhoto` and `info.parentsPhoto`, with fallbacks to hall photos | File names change to Sanity URLs | Studio fields in plan 2b |
| Coach sentence count-aware: "antrenorul său" (1), "antrenorii săi" (2+), none for 0; "Îi/Le poți scrie" to match ("tu" since the owner's decision of 2026-11-26; was "Îi/Le puteți scrie") | A number word goes stale | Copy change |
| Coach roles ("președinte și antrenor", …) not shipped; coaches by name only | Roles are unconfirmed | None |
| Age category: the best place's category, else from the birth year counted in the build year (U-n while younger than n; U23 for 19–22; Seniori from 23) | Needed for athletes without a place | To confirm with the coaches (calendar year vs FRB season) |
| Body photos inside the text (`photo` blocks) are supported by the renderer now; unknown block types are dropped, never fail the build | The mockup shows a photo in the text; a new CMS field must not break a build | The Studio field comes in plan 2b |
| An athlete with several results in one article gets one row listing them all | One person, one row | None |

### Pages and design
| Ruling | Why | Cost if wrong |
|---|---|---|
| Filters are radio groups with `:has()`, also on the calendar and news where the mockups used `:target` links; no filter below two categories | `:target` filtering is lost when an in-page link changes the hash; radios are keyboard-native and need no JS | None |
| Dimmed (filtered-out) items: `opacity 0.8` + grayscale, at least 3:1 for text (`tokens.test.ts`) | 0.25 gave ~1.7:1; 0.7 failed on played calendar rows | Faint on neutral rows; a non-colour cue may be added |
| One red-plate implementation: `PlatePhoto` (with a slot for the initials poster and body photos) | Two plates had appeared (profile, article body) | None |
| No empty timetable: without sessions the programme shows one "de confirmat" line | An empty grid is louder than the content | None |
| "Fotografii" and "Sportivi în articol" are modest headings; competition title without uppercase | Owner's rule on big display type | None |
| Share links are built in the browser; without JS the share row is hidden | The public address is unknown before launch; the mockup hard-coded the old domain | None |
| A profile without articles: the quiet block (tournaments, medals) starts from the left | Launch state of all three real athletes; quiet and readable | Layout tweak |
| The narrow-screen filter fix lives in the shared `FilterBar` `links` variant | The news page needed it next | None |
| News: tile colours cycle on from a blue featured tile; "Mai vechi" as a `SectionHeading` | Neighbouring tiles never share a colour | None |
| Menu: `aria-current="page"` on a section's own page, `"true"` on pages under it | Sub-pages belong to their section | None |
| Homepage trial button "Cere un antrenament de probă" to `/contact/#formular` replaces the mailto "Scrie-ne pentru o probă" | The form exists now | None |

### Dates and the calendar
| Ruling | Why | Cost if wrong |
|---|---|---|
| The calendar recomputes today, statuses and the next event in the browser (`calendar-today.ts`); without JS the build-time state stays | A static page must not state a false date | ~80 lines of script; daily rebuild (plan 2b) bounds staleness |
| The calendar shows the build year; the panel's next event may be in the next year | Static site | Stale across New Year until a rebuild |
| Upcoming events all solid; no "show next" button once the season is over; a block shared by several competitions lists the others under "Tot în aceste zile:" | Matches the legend and the mockup | None |
| The article's "În calendar" link only when the competition is in the build year (has a block there) | No link to a missing block | None |

### The trial form
| Ruling | Why | Cost if wrong |
|---|---|---|
| `TRIAL_ENDPOINT` build switch: unset ⇒ the valid form opens a pre-filled e-mail synchronously inside the submit click; set ⇒ POST, delivered only on 2xx with `{ "ok": true }`, else the e-mail | Chrome needs the click's user activation to open `mailto:`; `/api/proba` does not exist yet | None; plan 2b builds the endpoint |
| Without JS the age is not required (the adult path has none); the no-JS e-mail body has raw `name=value` lines | A hidden required field would block adults; no-JS is rare | Plan 2b replaces it with a server post |
| Error summary takes focus and has no `role="alert"` | One announcement, not two | None |
| The `:has()` rules and the script's `[data-who]` rules are separate rule sets | One selector list with `:has()` is dropped whole by browsers without it, killing the fallback | None |

### Testing
| Ruling | Why | Cost if wrong |
|---|---|---|
| Inner pages reuse the four fixture servers; no new fixture build | Keep the cold e2e fast | Fixtures carry more cases |
| The sweep checks every inner page at 1440, 1024, 861, 860 and 380 on `home` and `quiet-season`; it also flags squeezed columns and sticky blocks taller than the window | The 861–1100 band broke (parents' question list, article side column) while only 1440/390 were tested | A few seconds of e2e |
| Per-task flow implementer → reviewer, with a controller look at screenshots beside the mockup for UI tasks | Screenshots missed a scroll-range bug once; a standalone repro found it | Review cost |

## Open items

### Owed before a Sanity-backed deploy
- Image sizing for Sanity images: `@sanity/image-url`, `srcset` with `sizes`, hotspot crop.
- The Studio fields of the inner pages and the query for all posts (`content-model.md`).
- Real content and photos entered in the Studio; consent ticked per athlete with written consent.
- A read token created and placed in the build environment (not recorded as done).
- Studio click-through at 390px (owed since Task 3; not recorded as done).
- A daily scheduled rebuild (and a rebuild trigger after publishing in the Studio).

### Deferred to later plans
See `roadmap.md` for the list per plan.

### The club must supply
- Training schedule (days, hours), prices.
- Written parental consents and the list of athletes who may appear.
- The crest in vector format (the site's copy is 270px); new photos, ideally a short hero video.
- Confirmation of the copy written for the mockup (group descriptions, trial text, captions)
  and of the inner pages' copy: `copy-to-confirm.md`.
- Answers for the parents' page (minimum age, equipment, fees, first weeks, registration), a
  club phone, directions to the hall, reply time, coaches' photos and a line about each.
- The FRB agreement for the ranking sync (contact@badminton.ro).
- Agreement to the project and DNS access for launch.
