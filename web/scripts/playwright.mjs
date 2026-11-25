// `pnpm e2e -- shell.spec.ts` hands Playwright a literal `--`, after which Playwright ignores
// every argument; drop it so file filters, --grep and the rest work as typed.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
const { status } = spawnSync('playwright', ['test', ...args], { stdio: 'inherit', shell: false });
process.exit(status ?? 1);
