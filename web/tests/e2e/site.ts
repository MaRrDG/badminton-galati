// Builds and previews one fixture server for the e2e run. serve.setup.ts runs it as the setup
// project of each server; global-teardown.ts stops the previews at the end of the run.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILD_TODAY, DUMMY_READ_TOKEN, SERVERS, serverURL, type ServerName } from './servers';

const WEB = fileURLToPath(new URL('../../', import.meta.url));
const ASTRO = join(WEB, 'node_modules/.bin/astro');
const OUT = join(WEB, 'dist-e2e');
/** Stamps, preview pids and logs live beside the builds, never inside an output directory. */
const STATE = join(OUT, '.state');

/**
 * Everything a build reads besides node_modules (pinned by the lockfile), and the code that
 * runs it: a changed build env or astro argument must not reuse an old build.
 */
const INPUTS = [
  'src', 'public', 'astro.config.mjs', 'package.json', 'tsconfig.json', '../pnpm-lock.yaml',
  'tests/e2e/site.ts', 'tests/e2e/servers.ts',
];
const FIXTURES = join(WEB, 'src/fixtures');

export const outDir = (name: ServerName) => join(OUT, name);
const stampFile = (name: ServerName) => join(STATE, `${name}.stamp`);
const pidFile = (name: ServerName) => join(STATE, `${name}.pid`);

/** Fixture builds never call Sanity; the dummy token only proves no token reaches the output. */
function buildEnv(name: ServerName): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CONTENT_SOURCE: 'fixtures',
    HOME_FIXTURE: SERVERS[name].fixture,
    BUILD_TODAY,
    SANITY_READ_TOKEN: DUMMY_READ_TOKEN,
    TRIAL_ENDPOINT: '', // the trial form without an endpoint, as built until plan 2b
  };
}

function filesUnder(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { recursive: true, withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => join(e.parentPath, e.name));
}

/**
 * A hash of every build input of `name`: the sources, its own fixture (not the other ones) and
 * the build settings. A change anywhere else in the inputs rebuilds every server.
 */
function inputHash(name: ServerName): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify({ name, ...SERVERS[name], BUILD_TODAY, DUMMY_READ_TOKEN }));
  const files = INPUTS.flatMap(p => filesUnder(join(WEB, p)))
    .filter(f => !f.startsWith(FIXTURES + '/') || f === join(FIXTURES, SERVERS[name].fixture))
    .sort();
  for (const file of files) {
    hash.update(relative(WEB, file));
    hash.update('\0');
    hash.update(readFileSync(file));
  }
  return hash.digest('hex');
}

/** Runs a command to its end, its output in `log`; throws with the log tail when it fails. */
function run(args: string[], env: NodeJS.ProcessEnv, log: string): Promise<void> {
  const fd = openSync(log, 'w');
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ASTRO, args, { cwd: WEB, env, stdio: ['ignore', fd, fd] });
    child.on('error', reject);
    child.on('exit', code => {
      closeSync(fd);
      if (code === 0) resolve();
      else reject(new Error(`astro ${args[0]} failed (${code}):\n${readFileSync(log, 'utf8').slice(-3000)}`));
    });
  });
}

/** Builds `name` unless the stamp says its output matches the current inputs. */
export async function build(name: ServerName): Promise<'built' | 'reused'> {
  mkdirSync(STATE, { recursive: true });
  const hash = inputHash(name);
  const stamp = stampFile(name);
  if (existsSync(join(outDir(name), 'index.html')) && existsSync(stamp) && readFileSync(stamp, 'utf8') === hash) return 'reused';
  rmSync(stamp, { force: true });
  await run(['build', '--outDir', outDir(name)], buildEnv(name), join(STATE, `${name}.build.log`));
  writeFileSync(stamp, hash);
  return 'built';
}

const responds = async (url: string) => {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1000) })).ok;
  } catch {
    return false;
  }
};

/** Stops the preview of `name` left by this or an earlier (interrupted) run, if any. */
export async function stop(name: ServerName): Promise<void> {
  const file = pidFile(name);
  if (!existsSync(file)) return;
  const pid = Number(readFileSync(file, 'utf8'));
  rmSync(file, { force: true });
  try {
    process.kill(-pid, 'SIGTERM'); // the preview runs in its own process group
  } catch {
    return; // already gone
  }
  for (let i = 0; i < 50 && (await responds(serverURL(name))); i++) await new Promise(r => setTimeout(r, 100));
}

/**
 * Starts `astro preview` for `name` in its own process group, so it outlives the setup worker;
 * the global teardown stops it. Resolves once the page answers.
 */
export async function serve(name: ServerName): Promise<void> {
  await stop(name);
  const url = serverURL(name);
  if (await responds(url)) throw new Error(`${url} is already in use by another process; stop it and run again.`);
  const log = join(STATE, `${name}.preview.log`);
  const fd = openSync(log, 'w');
  const args = ['preview', '--outDir', outDir(name), '--port', String(SERVERS[name].port), '--ignore-lock'];
  const child = spawn(ASTRO, args, { cwd: WEB, env: buildEnv(name), stdio: ['ignore', fd, fd], detached: true });
  closeSync(fd);
  writeFileSync(pidFile(name), String(child.pid));
  let exited: number | null | undefined;
  child.on('exit', code => (exited = code));
  child.unref();
  for (let i = 0; i < 300; i++) {
    if (await responds(url)) return;
    if (exited !== undefined) break;
    await new Promise(r => setTimeout(r, 100));
  }
  await stop(name);
  throw new Error(`astro preview for ${name} did not answer on ${url}:\n${readFileSync(log, 'utf8').slice(-3000)}`);
}
