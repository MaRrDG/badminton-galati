import { defineConfig } from '@playwright/test';
import { SERVERS, serverURL, type ServerName } from './tests/e2e/servers';

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
    const { fixture, today, port } = SERVERS[name];
    const outDir = `dist-e2e/${name}`;
    return {
      command: `pnpm build --outDir ${outDir} && pnpm preview --outDir ${outDir} --port ${port} --ignore-lock`,
      url: serverURL(name),
      env: { CONTENT_SOURCE: 'fixtures', HOME_FIXTURE: fixture, BUILD_TODAY: today },
      reuseExistingServer: false,
      timeout: 120_000,
    };
  }),
});
