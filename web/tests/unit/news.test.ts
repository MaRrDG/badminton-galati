import { describe, expect, test } from 'vitest';
import { frontLayout, kindFilters, newsView } from '../../src/lib/news';
import { parseSiteData } from '../../src/lib/content';
import type { Img, Post, PostKind } from '../../src/lib/types';
import home from '../../src/fixtures/home.json';
import quiet from '../../src/fixtures/quiet-season.json';

const img = (name: string): Img => ({ url: `/img/${name}.jpg`, width: 1280, height: 720, alt: name });
const post = (title: string, kind: PostKind, date: string, cover?: string): Post => ({
  title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), kind, date,
  ...(cover ? { cover: img(cover) } : {}), body: [], gallery: [], results: [],
});

/** The fifteen articles of the approved mockup, newest first, with the mockup's photos. */
const fifteen: Post[] = [
  post('Novi Sad 2026', 'competitie', '2026-06-30', 'echipa-u15'),
  post('Memorialul Rotaru U15 2026', 'competitie', '2026-05-13', 'meci-dublu'),
  post('Cupa Romaniei U15 2026', 'competitie', '2026-04-01', 'smash'),
  post('ONSS 2026', 'competitie', '2026-02-19', 'sala-turneu-2'),
  post('Incepem anul', 'viata-clubului', '2026-01-20'),
  post('Serbare 2025', 'viata-clubului', '2025-12-20', 'festivitate'),
  post('Un mediu sigur', 'proiecte', '2025-11-26'),
  post('Cantonament', 'viata-clubului', '2024-08-28', 'cantonament'),
  post('CR U13 si U23', 'competitie', '2024-04-24'),
  post('CR U11 si U19', 'competitie', '2024-04-11'),
  post('6 medalii', 'competitie', '2024-03-16', 'medalii'),
  post('Articol de test vechi', 'competitie', '2024-03-15'),
  post('CN U11', 'competitie', '2023-01-19'),
  post('CN U15', 'competitie', '2023-01-12'),
  post('CN U13', 'competitie', '2023-01-11'),
];
const homePosts = parseSiteData(home, 'home.json').posts;
const spans = (rows: { span: number }[][]) => rows.map(r => r.map(i => i.span));

describe('the news front', () => {
  test('fifteen posts as in the mockup', () => {
    const f = frontLayout(fifteen);
    expect(f.feat!.post.title).toBe(fifteen[0].title);
    expect(f.feat).toMatchObject({ kind: 'photo' });
    expect(f.side).toHaveLength(2);
    expect(f.side.map(i => i.span)).toEqual([4, 4]);
    expect(spans(f.rows)).toEqual([[5, 3, 4], [5, 7], [3, 3, 6]]);
    expect(f.older).toHaveLength(4);
    expect(f.older.map(p => p.title)).toEqual(fifteen.slice(11).map(p => p.title));
    expect(f.rows.flat().filter(i => i.kind === 'tile').map(i => i.tone)).toEqual(['red', 'blue', 'mist', 'red']);
    expect(f.rows.flat().filter(i => i.big).map(i => i.post.title)).toEqual(['Un mediu sigur']);
  });

  test('a photo item has no tone; a tile has no photo', () => {
    for (const i of frontLayout(fifteen).rows.flat()) {
      if (i.kind === 'photo') expect(i.post.cover && i.tone === undefined).toBeTruthy();
      else expect(i.post.cover === undefined && i.tone !== undefined).toBeTruthy();
    }
  });

  test('few posts: no rows up to three, then a partial row splits twelve columns evenly', () => {
    expect(frontLayout([])).toEqual({ side: [], rows: [], older: [] });
    expect(frontLayout(fifteen.slice(0, 1)).side).toEqual([]);
    expect(frontLayout(fifteen.slice(0, 2)).side).toHaveLength(1);
    expect(frontLayout(fifteen.slice(0, 3)).rows).toEqual([]);
    expect(spans(frontLayout(fifteen.slice(0, 4)).rows)).toEqual([[12]]);
    expect(spans(frontLayout(fifteen.slice(0, 5)).rows)).toEqual([[6, 6]]);
    expect(spans(frontLayout(fifteen.slice(0, 7)).rows)).toEqual([[5, 3, 4], [12]]);
    expect(spans(frontLayout(fifteen.slice(0, 11)).rows)).toEqual([[5, 3, 4], [5, 7], [3, 3, 6]]);
    expect(frontLayout(fifteen.slice(0, 11)).older).toEqual([]);
    expect(frontLayout(fifteen.slice(0, 12)).older).toHaveLength(1);
  });

  test('many posts: the front keeps eleven, the rest are older', () => {
    const many = [...fifteen, ...fifteen.map(p => ({ ...p, slug: `${p.slug}-2`, date: '2022-01-01' }))];
    const f = frontLayout(many);
    expect(spans(f.rows)).toEqual([[5, 3, 4], [5, 7], [3, 3, 6]]);
    expect(f.older).toHaveLength(19);
  });

  test('a featured post without a cover is a blue tile; the next tiles go on from blue', () => {
    expect(frontLayout([{ ...fifteen[0], cover: undefined }]).feat).toMatchObject({ kind: 'tile', tone: 'blue' });
    const bare = fifteen.map(({ cover: _c, ...p }) => p);
    const f = frontLayout(bare);
    expect([f.feat, ...f.side].map(i => i!.tone)).toEqual(['blue', 'mist', 'red']);
    expect(f.rows.flat().map(i => i.tone)).toEqual(['blue', 'mist', 'red', 'blue', 'mist', 'red', 'blue', 'mist']);
    expect(f.rows.flat().every(i => i.kind === 'tile' && i.big === (i.span >= 5))).toBe(true);
  });

  test('the same list always gives the same front, and the list is left as it was', () => {
    const copy = structuredClone(fifteen);
    expect(frontLayout(fifteen)).toEqual(frontLayout(copy));
    expect(fifteen).toEqual(copy);
  });

  test('the front puts posts newest first whatever their order', () => {
    const f = frontLayout([...fifteen].reverse());
    expect(f.feat!.post.title).toBe('Novi Sad 2026');
    expect(f.older.map(p => p.title).at(-1)).toBe('CN U13');
  });
});

describe('the kind filter', () => {
  test('"Toate" with the total, then the kinds that have posts', () => {
    expect(kindFilters(homePosts).map(o => [o.label, o.count])).toEqual([['Toate', 3], ['Competiție', 3]]);
    expect(kindFilters(fifteen).map(o => [o.value, o.label, o.count])).toEqual([
      ['toate', 'Toate', 15], ['competitie', 'Competiție', 11], ['viata-clubului', 'Viața clubului', 3], ['proiecte', 'Proiecte', 1],
    ]);
    expect(kindFilters([])).toEqual([]);
  });

  test('the quiet-season fixture gives the mockup front', () => {
    const page = newsView(parseSiteData(quiet, 'quiet-season.json'));
    expect(page.front.feat).toMatchObject({ kind: 'photo', post: { slug: 'novi-sad-2026' } });
    expect(spans(page.front.rows)).toEqual([[5, 3, 4], [5, 7], [3, 3, 6]]);
    expect(page.front.older.map(p => p.title)).toEqual([
      '6 medalii pentru Siderurgistul la Cupa României U15', 'Campionatul Național U11', 'Campionatul Național Cadeți U15', 'Campionatul Național U13',
    ]);
    expect(page.filters.map(o => o.count)).toEqual([15, 11, 3, 1]);
  });
});
