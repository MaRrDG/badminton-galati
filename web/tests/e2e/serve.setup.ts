import { test as setup } from '@playwright/test';
import type { ServerName } from './servers';
import { build, serve } from './site';

// One setup project per server (see playwright.config.ts); they run in parallel workers.
setup('build and preview', async ({}, testInfo) => {
  setup.setTimeout(120_000);
  const name = testInfo.project.metadata.server as ServerName;
  const result = await build(name);
  testInfo.annotations.push({ type: 'build', description: `${name}: ${result}` });
  await serve(name);
});
