// `pnpm e2e -- shell.spec.ts` hands Playwright a literal `--`, after which Playwright ignores
// every argument; drop it so file filters, --grep and the rest work as typed.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PLAYWRIGHT = fileURLToPath(new URL('../node_modules/.bin/playwright', import.meta.url));
const WEB = fileURLToPath(new URL('../', import.meta.url));

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
const r = spawnSync(PLAYWRIGHT, ['test', ...args], { cwd: WEB, stdio: 'inherit' });
if (r.error) {
  console.error(`e2e: could not start Playwright at ${PLAYWRIGHT} (${r.error.message}); run pnpm install.`);
  process.exit(1);
}
process.exit(r.status ?? 1);
