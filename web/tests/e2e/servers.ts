// The site is static, so one build serves one fixture. Each entry is built and previewed on
// its own port; tests pick a server with `serverURL`. `today` pins the build date.
export const SERVERS = {
  // Not 4321, so a running `astro dev` is never mistaken for the built site.
  home: { fixture: 'home.json', today: '2026-11-25', port: 4329 },
  'empty-season': { fixture: 'empty-season.json', today: '2026-12-05', port: 4330 },
  'no-rankings': { fixture: 'no-rankings.json', today: '2026-11-25', port: 4331 },
} as const;

export type ServerName = keyof typeof SERVERS;

export function serverURL(name: ServerName): string {
  return `http://localhost:${SERVERS[name].port}`;
}
