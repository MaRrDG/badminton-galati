# Studio (Sanity)

The content editor of the CS Siderurgistul Galați site: athletes, groups, the competition
calendar, articles and the homepage texts. The editor's labels and help texts are in Romanian,
for the coaches; everything else in this folder is in English.

- Sanity project: `4p2ry2u9` ("Siderurgistul Galati"), dataset `production`.
- The dataset is **private**: nothing can be read without a token. The site's build reads it
  with a read-only token (see the root README and `docs/ai/content-model.md`).
- Hosted Studio: https://siderurgistul-galati.sanity.studio/ (log in with a Sanity account that
  is a member of the project). Coaches have not been invited yet.

## How the Studio is organised

The coaches post rarely (after a tournament), mostly from a phone, so the Studio is built
around their tasks rather than around document types.

- **Start screen** (`start/`, the first tool, so the Studio opens on it): five plain choices
  („Scrie un articol”, „Adaugă o competiție în calendar”, „Sportivi”, „Program și grupe”,
  „Textele de pe prima pagină”) and a five-step „Cum postez după un turneu”. The two „create”
  choices are intent links to a new document; the others open a navigation item. The choices
  and steps live in `start/choices.ts`; the component in `start/StartTool.tsx` uses only
  `@sanity/ui` and `@sanity/icons`.
- **Navigation** (`structure.ts`, tool „Conținut”): Articole (newest first), Calendar
  („Urmează”, then „Au trecut”, split on today's date in Bucharest), Sportivi („Cu acordul
  părintelui” and „Fără acord”), Grupe și program, Textele site-ului (the `siteSettings`
  singleton). The global „create” menu offers only article, competition and athlete.
- **Forms**: each form opens on a first tab with only what the common task needs; the rest
  sits in a „Mai multe” tab. The built-in „Toate câmpurile” tab is hidden, so every field must
  name a tab (a test checks it). The site texts are split into tabs by what the visitor sees.
- **Releases, scheduled publishing and tasks are switched off**: the coaches do not need them,
  and without releases every publish goes through the publish button below.

**Rule for new fields:** a new field goes into „Mai multe” unless a coach needs it every week.
Give it a short Romanian title, one example in the description where useful, and a validation
message that says what to do („Alege o poză principală”), not what is wrong.

**Fields the coaches never fill** are written by the publish button (`actions.ts`), just
before publishing:

- `slug` of articles and athletes: from the title or name with `slugifyRo`, only when the
  document has none, with `-2`, `-3`… if another document already uses it. An existing slug
  is never changed, so published URLs stay stable. The field is read-only and shown in „Mai
  multe” once it exists. „Duplicate” is removed for these types (a copy would carry the slug).
- `home` of competitions: ticked exactly when the city is Galați (however it is typed).

## Local start

1. Copy `.env.example` to `.env` and set `SANITY_STUDIO_PROJECT_ID=4p2ry2u9`.
   `SANITY_STUDIO_DATASET` can stay empty for `production`. `.env` is git-ignored.
2. `pnpm install` at the repository root.
3. `pnpm --filter studio dev` starts the Studio on http://localhost:3333.

## Commands

| Command | What it does |
|---|---|
| `pnpm --filter studio test` | Tests of the content model, the seed data, the navigation, the form tabs and the publish action |
| `pnpm --filter studio validate` | Schema validation with the Sanity CLI (works without a project) |
| `pnpm --filter studio typecheck` | TypeScript check |
| `pnpm --filter studio build` | Builds the Studio into `dist/` |
| `pnpm --filter studio run deploy` | Publishes the Studio to the hosted URL above (needs `.env` and a Sanity login). Use `run`: plain `pnpm --filter studio deploy` is pnpm's own deploy command. |

`sanity.cli.ts` holds the hosted Studio's `studioHost` and `deployment.appId`, so a deploy
updates the existing Studio instead of asking for a new host name.

## Seed data

`seed/seed.ndjson` holds the known real data: the 3 ranked athletes, the 5 groups, the 12
competitions of the 2026 calendar, the 3 most recent articles and the homepage texts (from
mockup `varianta-d`). It has already been imported into `production` (24 documents). On a new
dataset it is imported once:

```sh
pnpm --filter studio exec sanity dataset import seed/seed.ndjson --dataset production --missing
```

`--missing` skips documents that already exist, so it does not overwrite what the coaches
changed.

> **Parental consent:** the three athletes in the seed are minors and are imported with
> "Acord părinte" unticked (`consent: false`), because the parents' written consent has not
> been received yet. Until it is ticked they appear nowhere on the site and cannot be picked in
> an article's results. Tick "Acord părinte" for each athlete only after the club has the
> written consent of that athlete's parent.

The seed has no photos: photos are uploaded from the Studio (the photo fields are empty after
import). Athletes are linked to groups and articles to competitions in the Studio too, because
those links are not known yet.
