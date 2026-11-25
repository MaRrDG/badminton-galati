# New site for CS Siderurgistul Galați: design

Date: 25 November 2026
Status: approved by Mario on 25 November 2026

> Translated from the Romanian original on 25 November 2026. Quoted site copy and the
> owner's quoted remarks stay in Romanian, with an English gloss in parentheses.

## Why

Mario is giving the club CS Siderurgistul Galați a new site, free of charge, to replace
https://www.badmintongalati.ro/ (built with SitePad 5.1.6). The current site is old and half
abandoned: counters that show "1", © 2023, news from 2024 on the front page, no schedule,
prices or gallery, addresses like `/page-2/`, sign-up through a PDF to print.

The new site must:

1. look alive and inspire: the sport and the children's talent up front, with scroll animations;
2. not look made by AI (an explicit, repeated requirement);
3. be maintainable by the coaches without technical help: text, photos, articles, calendar;
4. show the club that it can do its marketing with it: new sign-ups and sponsors.

## Who uses it

- **Parents in Galați** looking for a sport for their child. They come from a phone. They want
  to find out quickly: from what age, when, how much it costs, how to try it.
- **The athletes and their parents.** They want to see their results and photos and share them.
- **The coaches** (Dorel Badiu, Iulian Călin, Adrian Panfil). They publish, usually from a
  phone, after a competition, with photos from WhatsApp. Today they post rarely: 15 articles in
  3 years.
- **Mario.** Administrator, with full access.
- **Possible sponsors and the federation.** They want figures and seriousness.

## Goals

- All the useful pages of the old site, cleaned up, plus the new ones below.
- Publishing an article with photos, from a phone, in a few minutes.
- Real statistics about the athletes, updated automatically from the FRB ranking.
- Fast loading on cheap phones and mobile connections.
- Zero monthly cost for the club.

## What we do not do

- Shop, online payments, accounts for parents or athletes.
- An English version (Romanian only, with correct diacritics).
- Match scores or draws: FRB does not publish them, and the coaches will not enter them.
- Integration with tournamentsoftware.com: FRB is not on it, and the platform blocks access.
- Automatic import of Facebook posts.

## What would count as failure, even if it works

- It looks like a generated template: cream background, rounded cards with shadows, all-caps
  labels above every heading, a fade on every section, invented figures, stock photos.
- The coaches do not use it because editing is cumbersome, and a year later it is abandoned
  again.
- Data about minors appears without the parents' consent.
- The animations make it slow or tiring on a phone.
- Invented content presented as fact (training hours, prices, results).

## Constraints

- **Free**, so only free plans of external services. Their limits are checked during
  implementation; if a service stops being free for this volume, another one is chosen.
- **The domain** `badmintongalati.ro` belongs to the club. Launch needs DNS access from them.
  Until then the site lives on a test address.
- **Minors.** An athlete's page appears publicly only if "acord părinte" (parental consent) is
  ticked.
- **FRB.** Ranking data is taken from badminton.ro, which has no API. Automatic sync starts once
  the club has the federation's agreement (contact@badminton.ro). Without agreement, the site
  works only with links to the FRB profiles.
- **Data missing from the club:** the schedule with days and hours, prices, photo captions,
  group descriptions. Until they arrive, the pages show "de confirmat" (to be confirmed), not
  invented text.
- **Photos:** only the club's photos. Those on the old site are the starting point.

## Options considered

### How the club edits

| Option | Plus | Minus |
|---|---|---|
| **Astro + Sanity** (chosen) | simple panel, works from a phone, photos are optimised automatically, coaches fill in fields and cannot break the design | depends on an external service |
| WordPress on their hosting | familiar | updates, risk of being hacked, degrades within two years; the design's animations would need a theme written from scratch |
| Astro + git-based CMS | no external service | cumbersome photo upload, rudimentary panel |

Mario chose the first option. It is my technology choice, accepted by him, not a requirement.

### Where the statistics come from

| Option | Plus | Minus |
|---|---|---|
| **Sync from badminton.ro + links** (chosen) | zero effort for the coaches, real data weekly | stops if FRB changes its site; needs FRB's agreement |
| Links to FRB only | zero risk | no statistics on the club's site |
| Manual entry | any data | will not be done |

Mario chose the sync, with the links as a safety net.

### Visual direction

Four animated homepage sketches were made (in `.superpowers/brainstorm/…/content/`):

- A "Terenul" (the court): the hall seen from above, bright. Not chosen.
- B "Afiș" (the poster): a poster in the crest's blue. He liked the style and the animations,
  but it is too big, too full-screen.
- C "Tabela" (the scoreboard): results as the hero. He liked the structure, but it looked like
  AI.
- **D "Afiș + Tabela"** (chosen): the style and animations of B at a modest scale, the structure
  of C without the template elements. The file `varianta-d-afis-tabela.html` is the visual
  reference, in its form after Mario's corrections (hero with the club motto, no flip-card
  scoreboard; groups as two lists).

## The design

### Visual identity

It comes from what the club already has, not from something invented:

- **The crest's blue** (~`#1549A8`) and **the kit's red** (~`#E23A45`), as solid surfaces.
  White. **The orange of the court** in their hall only as a small touch. A very light blue for
  resting sections. Text colour: dark navy.
- **Type:** Big Shoulders Display for headings (condensed, industrial, a nod to the name
  "Siderurgistul", the steelworker), Instrument Sans for text. Both have ș, ț, ă, î, â.
- **Straight edges.** Real photos treated as a poster, with an offset red plate behind.
- **Scale:** content in a column of ~1180px, headings capped at ~6rem, hero at most ~85% of the
  screen height. Sections alternate blue, red, white.
- **The hero carries the club motto**, the one on the current site: „Ai reușit? Continuă!
  N-ai reușit? Continuă!” ("Did you make it? Keep going! Didn't make it? Keep going!"), as a
  poster headline, with one sentence about the club below. The text is edited from the panel.
  Mario rejected the version with ranking places in the headline; the ranking appears lower, in
  the list of athletes.
- **The groups** appear as two plain lists, side by side: „Pentru cine vrea performanță” (for
  those who want performance: Inițiere, Performanță, Elite) and „Pentru cine vrea doar să
  joace” (for those who just want to play: Amatori copii, Amatori adulți). Each row: the group
  name large, who it is for and, when known, the days and hours. Mario rejected the bordered
  table and the staircase version („nu prea se înțelege”, "it's hard to follow").
- **The club crest** (blue circle, red disc, white shuttlecock) stays unchanged. It must be
  requested from the club in vector format; the one on the site is 270px.

Forbidden: cream background, rounded cards with shadows, labels with a dotted outline, grey
filler bars, all-caps labels above headings, 01/02/03 numbering, arrows on buttons, a single
coloured word in a heading, charts or figures without real data behind them, decorative widgets
(Mario rejected the scoreboard with flipping cards: „AI slop masiv”, "massive AI slop") and
tables with empty cells or with the same text repeated on every row.

### Motion

Mario wants the site "viu" (alive) and liked B's animations. The rule: few, tied to the sport,
the rest of the page stays calm.

- **Hero:** a sequence on load (the poster settles, the headline lines come in from opposite
  sides), then on scroll the lines slide in opposite directions and the photo grows. A short
  pin.
- **The list of athletes:** the place numerals roll when you reach them.
- **Section headings:** drift slightly sideways on scroll.
- **The photo strip:** flows sideways as you scroll, up to the last photo.

No fade on every section. With "reduce motion" on, the final state is shown. All content is
visible without JavaScript too. On mobile, scroll pins are shorter or absent. Photos have
declared dimensions, so animation distances are computed correctly (a bug found in the sketch).

### Pages

**Kept from the old site**

- **Home.** The tone is invitation, not boasting: Mario noticed that the club's current site
  says "why play badminton", not "look how high we are", and wants it to stay that way. Order:
  motto, „De ce badminton” ("Why badminton": the benefits from the club's text, rewritten
  briefly, with diacritics), groups, calendar, athletes („Unde ajung cei care continuă”, "where
  those who keep going end up", as proof, not as a page title), hall, news, trial training. The
  old order in the sketch: calendar, athletes, groups, hall, news, trial training.
- **About the club.** History, founded 7 March 2002, the hall with 4 courts on Bd. Cloșca, the
  Balkan Championships of 2002 and 2023. A single page instead of the two duplicates.
- **Coaches and board of directors.** With photos. Contact through the club's address, not
  personal ones.
- **News (blog).** The 15 old articles moved over. Three kinds: Competiție (competition), Viața
  clubului (club life), Proiecte (projects). A competition article is linked to the event in the
  calendar and to the athletes who played, and has a gallery.
- **Competition calendar.** The whole season, filter by age category, the Galați events marked
  "acasă" (home). A played event leads to its article and to the FRB results.
- **Documents.** Statute, internal rules, sign-up form.
- **Projects.** Talents with Rackets (Erasmus+), with its two handbooks.
- **Contact.** Address, map, phone, form.

Removed as pages, kept as links in the footer: the general history of badminton and the
addresses of FRB, Badminton Europe, BWF.

**New**

- **Athletes.** A list and a page for each: place and points in the FRB ranking per discipline,
  scoring tournaments, medals, photos, the articles they appear in, a link to the FRB profile.
  Progress over time appears only once there is real history collected by the sync.
- **Schedule and groups.** Inițiere, Performanță, Elite, Amatori copii, Amatori adulți: days,
  hours, coach, who it is for.
- **Trial training.** An online form: parent's name, phone, child's age, message. It reaches
  the club's email.
- **Gallery.** By competitions and events, linked to articles.
- **Results.** Honours by season, built from the articles and the FRB data.
- **For parents.** From what age, what the child needs, how much it costs, what follows after
  the first training.
- **For sponsors.** The club's real figures and how a sponsor appears on the site.

### What the club edits

Everything in the list below is edited from the panel, without code:

- articles (title, kind, date, text, photos, the competition, the ticked athletes);
- competitions in the calendar (date, place, categories, host);
- athletes (name, year, group, photo, FRB profile link, **parental consent**);
- groups and schedule; coaches; documents; sponsors; galleries;
- the texts of the fixed pages (about, for parents, for sponsors, contact).

The "new article" form is designed for a phone: few required fields, many photos from a single
selection. The links between article, competition and athletes are made by ticking, once, and
then appear everywhere.

### Sync with FRB

- Runs automatically once a week, after FRB publishes the ranking.
- For each athlete who has an FRB profile link, it reads the place, points and scoring
  tournaments and saves them, also keeping the week's snapshot, so history accumulates.
- The homepage figures (how many athletes in the national top 10, etc.) are computed from this
  data. There are no hand-written figures.
- If reading fails, the site keeps the last good data and shows "updated on date X". Mario gets
  an email. The site never shows an error to the visitor.
- Polite reading: few requests, with pauses, identified as the club's.
- It is off by default and starts when the club has FRB's agreement.

### Marketing

- Correct preview when shared on Facebook and WhatsApp (photo, title, description).
- Titles and descriptions for searches like "badminton Galați" and "badminton copii Galați";
  structured data for a local sports club; a sitemap.
- Redirects from all old addresses (`/page-2/`, `/blog/post1/` etc.) to the new ones.
- Cookie-free visit statistics, so no consent banner.

## Rules set after reviewing the document

The decisions below are mine, to be confirmed by Mario:

- **Launch does not wait for FRB's agreement.** Without synced data, the list of athletes shows
  name, group, photo and link to the FRB profile, and the computed figures and the
  ranking-based results page are absent. The hero does not depend on data. The sync is added
  afterwards, without design changes.
- **What the lack of parental consent hides:** the athlete has no page, does not appear in the
  list of athletes, on the homepage or in figures, and their name is not a link and cannot be
  ticked as a tag in articles. Their data from the FRB ranking is not displayed on the club's
  site, even though it is public at the federation. Group photos and article text remain the
  club's responsibility, as until now. The 15 old articles are moved unchanged, being already
  public.
- **Medals come from articles.** On a competition article, each ticked athlete can optionally
  get a result (gold, silver, bronze or the place) and the discipline. The field is optional, so
  the form stays short. The honours list is built from these fields.
- **Coaches publish directly**, without approval. Mario can withdraw anything.

## Accounts and deadline (decided by Mario)

- **For now a single administrator account**, Mario's, with email and password. The coaches'
  accounts and moving ownership to a club email come later, at handover.
- The password is not written in code and does not enter the git repository. Mario chooses it
  when creating the account.
- **There is no deadline.** Everything is built before launch.

## Domain and email (checked on 25 November 2026)

- The domain has its name servers at ROMARG (`ns1–ns4.romarg.com`), and the old site lives on
  `89.42.218.134`.
- The club's email also goes through ROMARG (`mx01–03.whmpanels.com`, SPF `relay.romarg.net`).
- **The name servers do not move.** At launch only the site records change (`www` and the bare
  domain). The email records stay untouched, so the address
  `siderurgistul@badmintongalati.ro` keeps working.
- Hosting is chosen so that it works with DNS remaining at ROMARG, including for the domain
  without `www`.
- The ROMARG hosting package must be kept while the email lives there, even if the site leaves.
  To check with the club what they pay and what it includes.

## Decisions made by me, to be checked

Mario talked about the result, not the tools, so these are my choices:

- Astro for the site, Sanity for content, free static hosting (Cloudflare Pages, Netlify or
  similar, once it works with the DNS at ROMARG).
- GSAP with ScrollTrigger for the animations, as in the sketch.
- FRB sync as a weekly scheduled job (GitHub Actions), which writes to Sanity and triggers a
  rebuild.
- Forms send email through a small server function, with spam protection without a visible
  captcha.
- Cookie-free visit statistics, through a free service.
- Removed the pages with the general history of badminton and the federations' addresses.
- Three article kinds: Competiție, Viața clubului, Proiecte.
- The coaches' personal emails no longer appear on the site.

## Left to whoever builds it

- The exact structure of the panel fields and of the page addresses.
- The look of the inner pages, in the visual language of sketch D.
- How the FRB page is read and how it is tested without hitting the federation's site.
- The email service for forms and alerts.
- The build order and the split into stages.

## Depends on the club

- Agreement to the project and DNS access for launch.
- FRB's agreement for the sync.
- The schedule with hours, prices, the list of athletes with parental consent.
- The crest in vector format, new photos and, ideally, a short video for the hero.
- Confirmation of the texts I wrote in the sketch (group descriptions, photo captions).
