// The site is static, so one build serves one fixture. Each entry is built and previewed on
// its own port; tests pick a server with `serverURL`. Every build is pinned to BUILD_TODAY.
export const BUILD_TODAY = '2026-11-25';

export const SERVERS = {
  // Not 4321, so a running `astro dev` is never mistaken for the built site.
  home: { fixture: 'home.json', port: 4329 },
  'empty-season': { fixture: 'empty-season.json', port: 4330 },
  'no-rankings': { fixture: 'no-rankings.json', port: 4331 },
  'one-photo': { fixture: 'one-photo.json', port: 4332 },
} as const;

export type ServerName = keyof typeof SERVERS;

export function serverURL(name: ServerName): string {
  return `http://localhost:${SERVERS[name].port}`;
}
