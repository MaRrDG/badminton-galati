import { defineConfig } from '@playwright/test';

// Not 4321, so a running `astro dev` is never mistaken for the built site.
const PORT = 4329;

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    launchOptions: { executablePath: '/usr/bin/google-chrome' },
  },
  projects: [
    {
      name: 'default',
      use: { baseURL: `http://localhost:${PORT}` },
    },
  ],
  webServer: [
    {
      command: `pnpm build && pnpm preview --port ${PORT} --ignore-lock`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
