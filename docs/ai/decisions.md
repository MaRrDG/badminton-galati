# Decisions

All dated 2026-11-25 (plan 1 was built that day). "Cost if wrong" is what reverting or a
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

## Open items

### Owed before a Sanity-backed deploy
- Image sizing for Sanity images: `@sanity/image-url`, `srcset`, hotspot crop.
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
- Confirmation of the copy written for the mockup (group descriptions, trial text, captions).
- The FRB agreement for the ranking sync (contact@badminton.ro).
- Agreement to the project and DNS access for launch.
