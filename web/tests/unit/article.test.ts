import { describe, expect, test } from 'vitest';
import { mosaicLayout, photoCountLabel, postDescription, postNeighbours, postView, taggedRows } from '../../src/lib/article';
import { parseSiteData } from '../../src/lib/content';
import type { Img } from '../../src/lib/types';
import home from '../../src/fixtures/home.json';
import quiet from '../../src/fixtures/quiet-season.json';
import mixed from '../../src/fixtures/mixed-strip.json';

const homePosts = parseSiteData(home, 'home.json').posts;

describe('the article page', () => {
  const photo = (name: string, width: number, height: number): Img => ({ url: `/img/${name}.jpg`, width, height, alt: name });
  /** The gallery of the approved mockup, in its order. */
  const seven = [
    photo('cantonament', 1280, 960), photo('smash', 800, 1200), photo('meci-dublu', 1280, 720), photo('echipa-rosu', 1280, 854),
    photo('sala-turneu-1', 1280, 720), photo('festivitate', 1280, 720), photo('medalii', 1280, 579),
  ];

  test('the mosaic: a big first photo from four on, portraits tall, every fifth wide', () => {
    expect(mosaicLayout(seven)).toEqual(['big', 'tall', '', '', 'wide', '', '']);
    expect(mosaicLayout(seven.slice(0, 3))).toEqual(['', 'tall', '']);
    expect(mosaicLayout([seven[1], ...seven.slice(2, 5)])).toEqual(['big', '', '', '']);
    expect(mosaicLayout([...seven, ...seven]).slice(7)).toEqual(['', 'tall', 'wide', '', '', '', '']);
    expect(mosaicLayout([])).toEqual([]);
  });

  test('the photo count', () => {
    expect(photoCountLabel(7)).toBe('7 fotografii');
    expect(photoCountLabel(1)).toBe('o fotografie');
    expect(photoCountLabel(2)).toBe('2 fotografii');
    expect(photoCountLabel(20)).toBe('20 de fotografii');
  });

  test('neighbours by date, as the news list orders them, without reordering the list', () => {
    const posts = homePosts;
    const before = [...posts];
    expect(postNeighbours(posts, 'bucuresti-memorialul-rotaru-u15-2026')).toEqual({ older: posts[2], newer: posts[0] });
    expect(postNeighbours(posts, 'novi-sad-2026')).toEqual({ older: posts[1] });
    expect(postNeighbours(posts, 'bucuresti-cupa-romaniei-u15-2026')).toEqual({ newer: posts[1] });
    expect(postNeighbours([...posts].reverse(), 'novi-sad-2026')).toEqual({ older: posts[1] });
    expect(postNeighbours(posts, 'nu-exista')).toEqual({});
    expect(posts).toEqual(before);
  });

  test('tagged athletes: only those in the (consented) list', () => {
    const site = parseSiteData(quiet, 'quiet-season.json');
    const post = site.posts.find(p => p.slug === 'articol-de-test-cu-galerie')!;
    expect(taggedRows(post, [], 2026)).toEqual([]);
    const rows = taggedRows(post, site.athletes, 2026);
    expect(rows.map(r => [r.athlete.name, r.line, r.results])).toEqual([['Zet Exemplu-Ana', 'U13, simplu fete', [{ result: 'aur' }]]]);
    const unknown = { ...post, results: [{ athleteId: 'athlete-nobody', result: 'aur' }] };
    expect(taggedRows(unknown, site.athletes, 2026)).toEqual([]);
  });

  test('one row per athlete, in first-appearance order; several results name their disciplines', () => {
    const site = parseSiteData(quiet, 'quiet-season.json');
    const post = site.posts.find(p => p.slug === 'articol-de-test-cu-galerie')!;
    const zet = 'athlete-zet-exemplu-ana';
    const nistor = 'athlete-nistor-cristian-ionut';
    const results = [
      { athleteId: nistor, result: 'locul 5' },
      { athleteId: zet, discipline: 'SF' as const, result: 'aur' },
      { athleteId: nistor, discipline: 'DX' as const, result: 'bronz' },
      { athleteId: zet, discipline: 'DX' as const, result: 'argint' },
      { athleteId: 'athlete-nobody', result: 'aur' },
    ];
    const rows = taggedRows({ ...post, results }, site.athletes, 2026);
    expect(rows.map(r => r.athlete.id)).toEqual([nistor, zet]);
    expect(rows[1]).toMatchObject({
      line: 'U13',
      results: [{ discipline: 'simplu fete', result: 'aur' }, { discipline: 'dublu mixt', result: 'argint' }],
    });
    expect(rows[0].results).toEqual([{ result: 'locul 5' }, { discipline: 'dublu mixt', result: 'bronz' }]);
  });

  test('a result names a non-consented athlete: dropped before the page sees it', () => {
    const site = parseSiteData(mixed, 'mixed-strip.json');
    const post = site.posts.find(p => p.slug === 'novi-sad-2026')!;
    expect(post.results).toEqual([]);
    expect(postView(site, post, '2026-11-25').tagged).toEqual([]);
    expect(JSON.stringify(postView(site, post, '2026-11-25'))).not.toContain('Fără-Acord');
  });

  test('the test article: body, competition, tags, mosaic and neighbours', () => {
    const site = parseSiteData(quiet, 'quiet-season.json');
    const copy = structuredClone(site);
    const post = site.posts.find(p => p.slug === 'articol-de-test-cu-galerie')!;
    const page = postView(site, post, '2026-11-25');
    expect(page.body.map(b => b.kind)).toEqual(['html', 'photo', 'html']);
    expect(page.body[0]).toMatchObject({ html: expect.stringMatching(/^<p class="lead">/) });
    expect(page.competition?.title).toBe('CR U15 și CR U23');
    expect(page.inCalendar).toBe(true);
    expect(page.tagged).toHaveLength(1);
    expect(page.mosaic.map(m => [m.img.url, m.shape])).toEqual(seven.map((p, i) => [p.url, mosaicLayout(seven)[i]]));
    expect(page.neighbours.older?.slug).toBe('galati-olimpiada-nationala-a-sportului-scolar-2026');
    expect(page.neighbours.newer?.slug).toBe('bucuresti-cupa-romaniei-u15-2026');
    expect(site).toEqual(copy);
  });

  test('only a competition article shows its competition', () => {
    const site = parseSiteData(quiet, 'quiet-season.json');
    const post = site.posts.find(p => p.slug === 'articol-de-test-cu-galerie')!;
    expect(postView(site, { ...post, kind: 'viata-clubului' }, '2026-11-25').competition).toBeUndefined();
    const plain = postView(site, site.posts.find(p => p.slug === 'novi-sad-2026')!, '2026-11-25');
    expect(plain).toMatchObject({ body: [], tagged: [], mosaic: [], inCalendar: false });
    expect(plain.competition).toBeUndefined();
  });

  test('"În calendar" only for a competition in the year the calendar shows', () => {
    const site = parseSiteData(quiet, 'quiet-season.json');
    const post = site.posts.find(p => p.slug === 'articol-de-test-cu-galerie')!;
    expect(postView(site, post, '2026-11-25').inCalendar).toBe(true);
    const later = postView(site, post, '2027-01-05');
    expect(later.competition?.id).toBe(post.competitionId);
    expect(later.inCalendar).toBe(false);
  });

  test('the meta description: the first paragraph, or the kind, date and title', () => {
    expect(postDescription(homePosts[0])).toBe('Competiție, 30 iunie 2026: Novi Sad – 2026.');
    const site = parseSiteData(quiet, 'quiet-season.json');
    const post = site.posts.find(p => p.slug === 'articol-de-test-cu-galerie')!;
    expect(postDescription(post)).toBe('Paragraful de deschidere al articolului de test, scris ca să se vadă textul mai mare de la început.');
    const long = { ...post, body: [{ _type: 'block' as const, _key: 'x', style: 'normal' as const, children: [{ _type: 'span' as const, _key: 's', text: 'cuvânt, '.repeat(40) }] }] };
    const d = postDescription(long);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d).toMatch(/cuvânt…$/);
  });
});
