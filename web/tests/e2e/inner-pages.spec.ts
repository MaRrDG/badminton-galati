import { test, expect } from '@playwright/test';
import { on, type ServerName } from './servers';

// Every inner page at every width the layouts switch around: nothing runs off the side, no text
// leaves the screen and no text sits on other text or on a picture. `home` has the real content;
// `quiet-season` fills what `home` leaves empty (the timetable, photos, every answer, the gallery).
const ROUTES: Record<'home' | 'quiet-season', string[]> = {
  home: ['/sportivi/', '/sportivi/bordeianu-nectarie-ioan/', '/calendar/', '/noutati/', '/noutati/novi-sad-2026/', '/program/', '/pentru-parinti/', '/contact/'],
  'quiet-season': ['/sportivi/', '/sportivi/zet-exemplu-ana/', '/calendar/', '/noutati/', '/noutati/articol-de-test-cu-galerie/', '/program/', '/pentru-parinti/', '/contact/'],
};
const WIDTHS = [1440, 1024, 861, 860, 380];

/** What is wrong with the layout at the current scroll position and width, one line per fault. */
const faults = () => {
  type Box = { left: number; right: number; top: number; bottom: number };
  const out: string[] = [];
  const W = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > innerWidth) out.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${innerWidth}`);
  const shown = (e: Element) => e.checkVisibility({ visibilityProperty: true, opacityProperty: true });
  /** Inside an element that scrolls sideways on purpose, text may sit off screen. */
  const inScroller = (e: Element) => {
    for (let p: Element | null = e; p; p = p.parentElement) {
      const x = getComputedStyle(p).overflowX;
      if ((x === 'auto' || x === 'scroll') && p !== document.documentElement && p !== document.body) return true;
    }
    return false;
  };
  const meet = (a: Box, b: Box, slack = 1) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > slack && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > slack;
  const label = (e: Element) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''} "${(e.textContent ?? '').trim().slice(0, 40)}"`;

  /** Text for screen readers only: inside a box clipped to a pixel (the visually-hidden pattern). */
  const clippedAway = (e: Element) => {
    for (let p: Element | null = e; p && p !== document.body; p = p.parentElement) {
      const r = p.getBoundingClientRect();
      if (getComputedStyle(p).overflow !== 'visible' && (r.width <= 1 || r.height <= 1)) return true;
    }
    return false;
  };

  // Text, line by line (a wrapped line is its own box), from every visible text node. A range
  // box is the font's whole ascent to descent, taller than the line in the tight display type,
  // so each box is trimmed to its line height: two lines of a heading touch, they do not overlap.
  const lines: { el: Element; box: Box }[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement!;
    if (!n.textContent!.trim() || !shown(el) || el.closest('.visually-hidden, [aria-hidden="true"], script, style, noscript') || clippedAway(el)) continue;
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      if (r.width <= 1 || r.height <= 1) continue;
      const trim = lh > 0 && lh < r.height ? (r.height - lh) / 2 : 0;
      lines.push({ el, box: { left: r.left, right: r.right, top: r.top + trim, bottom: r.bottom - trim } });
    }
  }
  /** The part of a line that shows: a label cut short with an ellipsis covers only its box. */
  const seen = (e: Element, b: Box): Box => {
    let v = { ...b };
    for (let p: Element | null = e; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).overflowX === 'visible') continue;
      const r = p.getBoundingClientRect();
      v = { left: Math.max(v.left, r.left), right: Math.min(v.right, r.right), top: v.top, bottom: v.bottom };
    }
    return v;
  };
  const shownBoxes = lines.map(({ el, box }) => seen(el, box));
  for (const { el, box } of lines)
    if ((box.left < -0.5 || box.right > W + 0.5) && !inScroller(el)) out.push(`off screen: ${label(el)} ${Math.round(box.left)}–${Math.round(box.right)}`);
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i], b = lines[j];
      if (a.el !== b.el && meet(shownBoxes[i], shownBoxes[j], 2)) out.push(`text on text: ${label(a.el)} / ${label(b.el)}`);
    }
  // Text on a picture (a caption may sit on its own photo only when the photo is its background).
  const imgs = [...document.querySelectorAll('main img')].filter(shown).map(e => ({ el: e, box: e.getBoundingClientRect() }));
  lines.forEach(({ el }, i) => {
    for (const img of imgs) if (meet(shownBoxes[i], img.box, 2)) out.push(`text on picture: ${label(el)} / ${label(img.el)}`);
  });
  // A sticky element never runs into the footer.
  const footer = document.querySelector('body > footer')!.getBoundingClientRect();
  for (const e of document.querySelectorAll('main *'))
    if (getComputedStyle(e).position === 'sticky' && shown(e) && meet(e.getBoundingClientRect(), footer, 0)) out.push(`sticky over footer: ${label(e)}`);
  return [...new Set(out)];
};

for (const server of ['home', 'quiet-season'] as const satisfies ServerName[])
  for (const route of ROUTES[server])
    test(`${route} fits every width without overlaps: ${server}`, on(server), async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(faults), `${route} at ${width}, top`).toEqual([]);
        // At the bottom a sticky column meets the footer.
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        expect(await page.evaluate(faults), `${route} at ${width}, bottom`).toEqual([]);
      }
    });
