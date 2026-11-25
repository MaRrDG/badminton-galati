import { test as teardown } from '@playwright/test';
import type { ServerName } from './servers';
import { stop } from './site';

teardown('stop preview', async ({}, testInfo) => {
  await stop(testInfo.project.metadata.server as ServerName);
});
