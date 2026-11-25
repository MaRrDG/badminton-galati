import { defineConfig } from '@playwright/test';
import { BUILD_TODAY, DUMMY_READ_TOKEN, SERVERS, serverURL, type ServerName } from './tests/e2e/servers';

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: serverURL('home'),
    launchOptions: { executablePath: '/usr/bin/google-chrome' },
  },
  projects: [{ name: 'default' }],
  // One build and preview per fixture, each in its own output directory.
  webServer: (Object.keys(SERVERS) as ServerName[]).map((name) => {
    const { fixture, port } = SERVERS[name];
    const outDir = `dist-e2e/${name}`;
    return {
      command: `pnpm build --outDir ${outDir} && pnpm preview --outDir ${outDir} --port ${port} --ignore-lock`,
      url: serverURL(name),
      // Fixture builds never call Sanity; the dummy token only proves no token reaches the output.
      env: { CONTENT_SOURCE: 'fixtures', HOME_FIXTURE: fixture, BUILD_TODAY, SANITY_READ_TOKEN: DUMMY_READ_TOKEN },
      reuseExistingServer: false,
      timeout: 120_000,
    };
  }),
});
