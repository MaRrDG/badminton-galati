// `pnpm e2e:changed`: runs only the e2e specs affected by the diff against `dev` (committed on
// this branch, uncommitted and untracked files alike). Extra arguments go to Playwright;
// `--base <ref>` compares against another ref.
//
// Playwright's own `--only-changed=<ref>` follows imports between test files only, so it
// catches a changed spec or e2e helper but never a site source file: the specs reach the site
// over HTTP. Site files are mapped to specs here instead. Paths are relative to web/.
//
//   src/scripts/**                     motion, scroll-scan, home (hero settles, wrapped-line scrub)
//   src/components/home/**             home, motion, scroll-scan (every section has a drifting heading)
//     …/{Hero,CalendarBand,News,TrialCta}.astro   also shell (focus-ring targets live there)
//   src/components/Site*.astro         shell, home (no-JS content and overflow cover the whole page)
//   src/lib/**                         home (content, consent, countdown), motion (what the motion
//                                      paths get), build-output (the read token stays out)
//   src/fixtures/home.json             every spec (the default server)
//   src/fixtures/{sparse,mixed-strip}.json   home, motion, scroll-scan
//   src/fixtures/quiet-season.json     home
//   anything else that feeds the build or the runner (src/pages, src/layouts, src/styles,
//   public, astro.config.mjs, package.json, tsconfig.json, playwright.config.ts,
//   scripts/playwright.mjs)            every spec
//   tests/e2e/**                       left to Playwright's --only-changed (spec + its imports)
//   tests/unit/**, other scripts       no e2e spec
import { execFileSync, spawnSync } from 'node:child_process';

const ALL = 'all';
const SHELL = 'shell.spec.ts', HOME = 'home.spec.ts', MOTION = 'motion.spec.ts';
const SCAN = 'scroll-scan.spec.ts', BUILD = 'build-output.spec.ts';

/** First matching rule wins. */
const RULES = [
  [/^src\/scripts\//, [MOTION, SCAN, HOME]],
  [/^src\/components\/home\/(Hero|CalendarBand|News|TrialCta)\.astro$/, [HOME, MOTION, SCAN, SHELL]],
  [/^src\/components\/home\//, [HOME, MOTION, SCAN]],
  [/^src\/components\/Site[^/]*\.astro$/, [SHELL, HOME]],
  [/^src\/lib\//, [HOME, MOTION, BUILD]],
  [/^src\/fixtures\/home\.json$/, ALL],
  [/^src\/fixtures\/(sparse|mixed-strip)\.json$/, [HOME, MOTION, SCAN]],
  [/^src\/fixtures\/quiet-season\.json$/, [HOME]],
  [/^tests\/e2e\//, []],
  [/^tests\/unit\//, []],
  [/^scripts\/e2e-changed\.mjs$/, []],
  [/^(src|public)\//, ALL],
  [/^(astro\.config\.mjs|package\.json|tsconfig\.json|playwright\.config\.ts|scripts\/playwright\.mjs)$/, ALL],
];

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
let base = 'dev';
const at = args.indexOf('--base');
if (at !== -1) [, base] = args.splice(at, 2);

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).split('\n').filter(Boolean);
const changed = [...git('diff', '--name-only', '--relative', base), ...git('ls-files', '--others', '--exclude-standard')];

let all = false;
const mapped = new Set();
for (const file of changed) {
  const rule = RULES.find(([re]) => re.test(file));
  if (!rule) continue;
  if (rule[1] === ALL) all = true;
  else rule[1].forEach(s => mapped.add(s));
}

const playwright = extra => spawnSync('playwright', ['test', ...extra, ...args], { stdio: 'inherit' }).status ?? 1;

if (all) {
  console.log(`e2e:changed: a change against ${base} feeds every page; running every spec.`);
  process.exit(playwright([]));
}

// The specs Playwright itself sees as changed (a spec, or a helper it imports).
const listed = spawnSync('playwright', ['test', `--only-changed=${base}`, '--list', '--reporter=json'], { encoding: 'utf8' });
if (listed.status !== 0) {
  process.stderr.write(listed.stderr);
  process.exit(listed.status ?? 1);
}
const own = JSON.parse(listed.stdout).suites.map(s => s.file).filter(f => f.endsWith('.spec.ts'));
const specs = [...new Set([...mapped, ...own])].sort();

if (specs.length === 0) {
  console.log(`e2e:changed: no e2e spec is affected by the changes against ${base}.`);
  process.exit(0);
}
console.log(`e2e:changed: ${specs.join(', ')}`);
process.exit(playwright(specs.map(s => `tests/e2e/${s}`)));
