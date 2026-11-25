// The site menu: which entry is the page the visitor is on, or the section it belongs to.

/**
 * Whether the menu entry `href` is current on the page at `path`. The homepage only on itself;
 * a section ('/noutati/') on its own page and on every page under it ('/noutati/novi-sad-2026/'),
 * never on an address that merely starts with the same letters ('/noutati-vechi/').
 */
export function isCurrent(href: string, path: string): boolean {
  if (href === '/') return path === '/';
  return path === href || (href.endsWith('/') && path.startsWith(href));
}
