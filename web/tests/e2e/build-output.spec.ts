import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { DUMMY_READ_TOKEN, SERVERS } from './servers';

// Every e2e build runs with SANITY_READ_TOKEN set (see playwright.config.ts). The token is for
// the build only, so no built file, HTML or client bundle, may contain it.
test('the Sanity read token never reaches the built site', () => {
  const root = new URL('../../dist-e2e/', import.meta.url).pathname;
  const files = Object.keys(SERVERS).flatMap(name =>
    readdirSync(join(root, name), { recursive: true, withFileTypes: true })
      .filter(e => e.isFile())
      .map(e => join(e.parentPath, e.name)));
  expect(files.some(f => f.endsWith('.html'))).toBe(true);
  expect(files.some(f => f.endsWith('.js'))).toBe(true);
  const leaking = files.filter(f => readFileSync(f).includes(DUMMY_READ_TOKEN));
  expect(leaking).toEqual([]);
});
