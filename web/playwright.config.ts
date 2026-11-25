import { defineConfig, type Project } from '@playwright/test';
import { SERVERS, serverURL, tagOf, type ServerName } from './tests/e2e/servers';

const names = Object.keys(SERVERS) as ServerName[];
const others = names.filter((n): n is Exclude<ServerName, 'home'> => n !== 'home');
/** Matches the tag of `name` as a whole word, so no tag can match another's prefix. */
const tagged = (name: Exclude<ServerName, 'home'>) => new RegExp(`${tagOf(name)}(?![\\w-])`);

// How a run picks its servers: each server is a project that runs the spec tests carrying its
// tag (`on('sparse')` in servers.ts; untagged tests run on `home`) with its URL as baseURL, and
// depends on a setup project that builds and previews that one fixture. Playwright runs a setup
// project only when its dependent project has selected tests, so `pnpm e2e -- shell.spec.ts`
// or `--grep …` builds just the servers those tests use. Setups run in parallel workers and
// reuse an unchanged build (see tests/e2e/site.ts).
const perServer = names.flatMap((name): Project[] => [
  { name: `serve ${name}`, testMatch: 'serve.setup.ts', metadata: { server: name } },
  {
    name,
    testMatch: '*.spec.ts',
    testIgnore: 'build-output.spec.ts',
    dependencies: [`serve ${name}`],
    use: { baseURL: serverURL(name) },
    ...(name === 'home' ? { grepInvert: others.map(tagged) } : { grep: tagged(name) }),
  },
]);

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  // Stops the previews the setup projects started, also when a run is interrupted.
  globalTeardown: './tests/e2e/global-teardown.ts',
  reporter: 'list',
  use: {
    launchOptions: { executablePath: '/usr/bin/google-chrome' },
  },
  projects: [
    ...perServer,
    // Scans the output of every server, so it needs them all built.
    { name: 'build-output', testMatch: 'build-output.spec.ts', dependencies: names.map(n => `serve ${n}`) },
  ],
});
