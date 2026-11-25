// `pnpm e2e:changed`: runs only the e2e specs affected by the diff against `dev` (committed on
// this branch, uncommitted and untracked files alike). Extra arguments go to Playwright;
// `--base <ref>` compares against another ref.
//
// The specs reach the site over HTTP, so no import graph links them to the site sources and
// Playwright's own `--only-changed` cannot see a component or lib change. Changed files are
// mapped to specs here instead. The rule is over-selection, never silence: a path that is not
// known to be irrelevant runs every spec.
//
// Paths relative to the repository root:
//   pnpm-lock.yaml, pnpm-workspace.yaml, package.json, .npmrc   every spec (dependencies)
//   studio/, docs/, deploy/, scripts/, .superpowers/, *.md, .gitignore, .deploy.env.example
//                                                               no e2e spec (not part of the site)
//   any other path outside web/                                 every spec
// Paths relative to web/:
//   src/pages/404.astro, src/components/notfound/**, src/lib/rally/**, src/scripts/rally.ts
//                                      not-found, build-output (the 404 page and its rally)
//   src/components/ui/**               every spec (shared by the homepage and every inner page)
//   src/pages/sportivi/**, src/components/athletes/**   athletes, build-output
//   src/pages/calendar/**, src/components/calendar/**   calendar, home, build-output
//   src/pages/noutati/index.astro, src/components/news/**   news, article
//   src/scripts/**                     motion, scroll-scan, home, athletes, calendar, news, build-output
//                                      (countdown.ts and calendar-panel.ts among them)
//   src/components/home/**             home, motion, scroll-scan, build-output
//     …/{Hero,CalendarBand,News,TrialCta}.astro   also shell (focus-ring targets live there)
//   src/fixtures/{sparse,mixed-strip,quiet-season}.json   home, motion, scroll-scan, athletes, calendar,
//                                                         news, build-output
//   tests/e2e/<name>.spec.ts           that spec
//   tests/unit/**, vitest.config.ts, .env.example, *.md   no e2e spec
//   everything else (src/lib, Site*.astro, layouts, pages, styles, public, src/fixtures/home.json,
//   tests/e2e helpers and setup, build and runner config, these scripts)   every spec
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WEB = fileURLToPath(new URL('../', import.meta.url));
const PLAYWRIGHT = fileURLToPath(new URL('../node_modules/.bin/playwright', import.meta.url));

const ALL = 'all';
const NONE = [];
const SHELL = 'shell.spec.ts', HOME = 'home.spec.ts', MOTION = 'motion.spec.ts';
const SCAN = 'scroll-scan.spec.ts', BUILD = 'build-output.spec.ts', NOT_FOUND = 'not-found.spec.ts';
const ATHLETES = 'athletes.spec.ts', CALENDAR = 'calendar.spec.ts', NEWS = 'news.spec.ts', ARTICLE = 'article.spec.ts';

/** Outside web/, relative to the repository root. First match wins; no match runs every spec. */
const ROOT_RULES = [
  [/^(pnpm-lock\.yaml|pnpm-workspace\.yaml|package\.json|\.npmrc)$/, ALL],
  [/^(studio|docs|deploy|scripts|\.superpowers)\//, NONE],
  [/^[^/]+\.md$/, NONE],
  [/^(\.gitignore|\.deploy\.env\.example)$/, NONE],
];

/** Inside web/, relative to web/. First match wins; no match runs every spec. */
const WEB_RULES = [
  [/^src\/(pages\/404\.astro|components\/notfound\/|lib\/rally\/|scripts\/rally\.ts)/, [NOT_FOUND, BUILD]],
  [/^src\/components\/ui\//, ALL],
  [/^src\/(pages\/sportivi|components\/athletes)\//, [ATHLETES, BUILD]],
  [/^src\/(pages\/calendar|components\/calendar)\//, [CALENDAR, HOME, BUILD]],
  [/^src\/(pages\/noutati\/index\.astro$|components\/news\/)/, [NEWS, ARTICLE]],
  [/^src\/scripts\//, [MOTION, SCAN, HOME, ATHLETES, CALENDAR, NEWS, BUILD]],
  [/^src\/components\/home\/(Hero|CalendarBand|News|TrialCta)\.astro$/, [HOME, MOTION, SCAN, SHELL, BUILD]],
  [/^src\/components\/home\//, [HOME, MOTION, SCAN, BUILD]],
  [/^src\/fixtures\/(sparse|mixed-strip|quiet-season)\.json$/, [HOME, MOTION, SCAN, ATHLETES, CALENDAR, NEWS, BUILD]],
  [/^tests\/e2e\/([^/]+\.spec\.ts)$/, m => [m[1]]],
  [/^tests\/unit\//, NONE],
  [/^(vitest\.config\.ts|\.env\.example|[^/]+\.md)$/, NONE],
];

const fail = message => {
  console.error(`e2e:changed: ${message}`);
  process.exit(1);
};

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
let base = 'dev';
const at = args.indexOf('--base');
if (at !== -1) {
  base = args[at + 1];
  args.splice(at, 2);
  if (!base) fail('--base needs a git ref.');
}

const git = (...a) => {
  const r = spawnSync('git', a, { cwd: WEB, encoding: 'utf8' });
  if (r.error) fail(`could not run git (${r.error.message}).`);
  return r;
};
if (git('rev-parse', '--verify', '--quiet', `${base}^{commit}`).status !== 0) fail(`"${base}" is not a commit or branch here.`);
const lines = r => {
  if (r.status !== 0) fail(r.stderr.trim());
  return r.stdout.split('\n').filter(Boolean);
};
const root = lines(git('rev-parse', '--show-toplevel'))[0];
const changed = [
  ...lines(git('-C', root, 'diff', '--name-only', base, '--')),
  ...lines(git('-C', root, 'ls-files', '--others', '--exclude-standard')),
];

/** The specs a changed path selects, or ALL. */
function specsFor(path) {
  const [rules, rel] = path.startsWith('web/') ? [WEB_RULES, path.slice(4)] : [ROOT_RULES, path];
  for (const [re, then] of rules) {
    const m = rel.match(re);
    if (m) return typeof then === 'function' ? then(m) : then;
  }
  return ALL;
}

const playwright = extra => {
  const r = spawnSync(PLAYWRIGHT, ['test', ...extra, ...args], { cwd: WEB, stdio: 'inherit' });
  if (r.error) fail(`could not start Playwright at ${PLAYWRIGHT} (${r.error.message}); run pnpm install.`);
  return r.status ?? 1;
};

const specs = new Set();
const everything = changed.filter(path => {
  const s = specsFor(path);
  if (s !== ALL) s.forEach(x => specs.add(x));
  return s === ALL;
});

if (everything.length) {
  console.log(`e2e:changed: ${everything.slice(0, 3).join(', ')}${everything.length > 3 ? ', …' : ''} changed against ${base}; running every spec.`);
  process.exit(playwright([]));
}
if (specs.size === 0) {
  console.log(`e2e:changed: no e2e spec is affected by the changes against ${base}.`);
  process.exit(0);
}
const list = [...specs].sort();
console.log(`e2e:changed: ${list.join(', ')}`);
process.exit(playwright(list.map(s => `tests/e2e/${s}`)));
