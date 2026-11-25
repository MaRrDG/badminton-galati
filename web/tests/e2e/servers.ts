// The site is static, so one build serves one fixture. Each entry is built and previewed on
// its own port by its own Playwright project (see playwright.config.ts), and only when a
// selected test runs on it. Every build is pinned to BUILD_TODAY.
export const BUILD_TODAY = '2026-11-25';
/** Set as SANITY_READ_TOKEN for every e2e build; it must never show up in the built site. */
export const DUMMY_READ_TOKEN = 'dummy-token-should-not-leak';

export const SERVERS = {
  // The real homepage content. Not 4321, so a running `astro dev` is never mistaken for the built site.
  home: { fixture: 'home.json', port: 4329 },
  // Athletes without rankings (no places, no source line) and no competition left in the season.
  'quiet-season': { fixture: 'quiet-season.json', port: 4330 },
  // No athlete may be shown (the only one has no consent), a single 20-character hero line and
  // a single hall photo.
  sparse: { fixture: 'sparse.json', port: 4331 },
  // Two hall photos, landscape then portrait: they fit a column of 860px but not of 390px.
  // In the roster one ranked athlete, two unranked, and one without consent holding place 1.
  'mixed-strip': { fixture: 'mixed-strip.json', port: 4332 },
} as const;

export type ServerName = keyof typeof SERVERS;

export function serverURL(name: ServerName): string {
  return `http://localhost:${SERVERS[name].port}`;
}

/** The tag that puts a test on a server other than `home`; untagged tests run on `home`. */
export const tagOf = (name: Exclude<ServerName, 'home'>) => `@${name}`;

/**
 * Test details that run a test or describe block on `name`: `test('…', on('sparse'), …)`.
 * The tag selects the Playwright project, which sets the baseURL, so `page.goto('/')` opens
 * that server and only the servers of the selected tests are built.
 */
export const on = (name: ServerName) => (name === 'home' ? {} : { tag: tagOf(name) });
