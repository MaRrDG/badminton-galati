import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { DUMMY_READ_TOKEN, SERVERS, type ServerName } from './servers';

const root = new URL('../../dist-e2e/', import.meta.url).pathname;
/** Every file in the build of one server. */
const filesOf = (name: ServerName) =>
  readdirSync(join(root, name), { recursive: true, withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => join(e.parentPath, e.name));

// Every e2e build runs with SANITY_READ_TOKEN set (see playwright.config.ts). The token is for
// the build only, so no built file, HTML or client bundle, may contain it.
test('the Sanity read token never reaches the built site', () => {
  const files = (Object.keys(SERVERS) as ServerName[]).flatMap(filesOf);
  expect(files.some(f => f.endsWith('.html'))).toBe(true);
  expect(files.some(f => f.endsWith('.js'))).toBe(true);
  const leaking = files.filter(f => readFileSync(f).includes(DUMMY_READ_TOKEN));
  expect(leaking).toEqual([]);
});

// Fără-Acord Zamfira (fictional) has no consent: place 1 on mixed-strip, the only athlete on
// sparse. No profile is generated for her and her name, slug and FRB link are in no file.
test('an athlete without consent is in no built file', () => {
  for (const name of ['mixed-strip', 'sparse'] as const) {
    expect(existsSync(join(root, name, 'sportivi/fara-acord-zamfira'))).toBe(false);
    expect(filesOf(name).filter(f => /Fără-Acord|fara-acord|jucator\/999\//.test(readFileSync(f, 'utf8')))).toEqual([]);
  }
  // The scan reads the profiles of the consented athletes, so it would see her if she were there.
  expect(existsSync(join(root, 'mixed-strip', 'sportivi/nistor-cristian-ionut/index.html'))).toBe(true);
});
