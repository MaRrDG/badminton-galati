import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { buildToday, getHomeData, parseHomeData } from '../../src/lib/content';
import { todayInBucharest } from '../../src/lib/dates';
import { toHomeData } from '../../src/lib/sanity';
import fixture from '../../src/fixtures/home.json';

const ENV_KEYS = ['CONTENT_SOURCE', 'SANITY_PROJECT_ID', 'SANITY_DATASET', 'HOME_FIXTURE', 'BUILD_TODAY'] as const;
let savedEnv: Record<string, string | undefined>;
beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

/** A Sanity image as the homepage GROQ projects it. */
const rawImg = (name: string, alt = `Poza ${name}`) => ({
  alt,
  url: `https://cdn.sanity.io/images/p/production/${name}-800x600.jpg`,
  width: 800,
  height: 600,
});

const rawAthlete = {
  _id: 'athlete-a',
  name: 'Nistor Cristian-Ionuț',
  slug: 'nistor-cristian-ionut',
  consent: true,
  frbUrl: 'https://badminton.ro/jucator/236/u17-sb-simplu-baieti/',
  photo: null,
  rankings: [{ category: 'U17', discipline: 'SB', place: 2, points: 168 }],
};

const rawSample = {
  settings: {
    heroLines: ['Ai reușit?', 'Continuă!'],
    heroText: 'Text erou',
    heroPhoto: rawImg('hero'),
    whyIntro: 'Intro',
    whyPhoto: rawImg('why'),
    whyPoints: [{ title: 'Dormi mai bine', text: 'Reduce stresul.' }],
    hallText: 'Sala',
    hallPhotos: [rawImg('hall-1'), rawImg('hall-2')],
    groupsIntro: 'Grupe',
    trialText: 'Probă',
    rankingWeek: { week: 46, from: '2026-11-09', to: '2026-11-15' },
  },
  athletes: [rawAthlete],
  groups: [{ name: 'Inițiere', audience: 'Copii', track: 'performanta', schedule: null }],
  competitions: [
    { _id: 'c1', title: 'CN U9 și CN U17', city: 'București', start: '2026-11-27', end: '2026-11-29', home: false, postSlug: null },
  ],
  posts: [{ title: 'Novi Sad – 2026', slug: 'novi-sad-2026', kind: 'competitie', date: '2026-06-30', cover: rawImg('cover') }],
};

describe('fixtures', () => {
  test('fixtures satisfy HomeData', async () => {
    process.env.CONTENT_SOURCE = 'fixtures';
    const d = await getHomeData();
    expect(d.groups).toHaveLength(5); expect(d.competitions).toHaveLength(12);
    expect(d.posts.map(p => p.title)).toContain('Novi Sad – 2026');
    for (const img of [d.heroPhoto!, ...d.hallPhotos]) { expect(img.width).toBeGreaterThan(0); expect(img.alt).not.toBe(''); }
  });

  test('fixtures are the default when no Sanity project is configured', async () => {
    const d = await getHomeData();
    expect(d.heroLines).toEqual(['Ai reușit?', 'Continuă!', 'N-ai reușit?', 'Continuă!']);
  });

  test('HOME_FIXTURE naming a missing file fails with the available names', async () => {
    process.env.HOME_FIXTURE = 'nu-exista.json';
    await expect(getHomeData()).rejects.toThrow(/nu-exista\.json.*home\.json/);
  });

  test('a malformed fixture fails with the path of the bad field', () => {
    const { heroText: _drop, ...noHeroText } = fixture;
    expect(() => parseHomeData(noHeroText, 'home.json')).toThrow(/home\.json: heroText/);
    const badImg = { ...fixture, hallPhotos: [{ ...fixture.hallPhotos[0], width: 0 }] };
    expect(() => parseHomeData(badImg, 'home.json')).toThrow(/hallPhotos\[0\]\.width/);
    const badTrack = { ...fixture, groups: [{ ...fixture.groups[0], track: 'altceva' }] };
    expect(() => parseHomeData(badTrack, 'home.json')).toThrow(/groups\[0\]\.track/);
  });

  test('fixtures drop athletes without consent too', () => {
    const withHidden = { ...fixture, athletes: [...fixture.athletes, { ...fixture.athletes[0], id: 'x', consent: false }] };
    expect(parseHomeData(withHidden, 'home.json').athletes).toHaveLength(fixture.athletes.length);
  });

  test('every fixture photo exists in public/ with its real pixel size', () => {
    const d = parseHomeData(fixture, 'home.json');
    const imgs = [d.heroPhoto!, d.whyPhoto!, ...d.hallPhotos, ...d.posts.flatMap(p => (p.cover ? [p.cover] : []))];
    expect(d.hallPhotos).toHaveLength(7);
    for (const img of imgs) {
      const size = jpegSize(readFileSync(new URL(`../../public${img.url}`, import.meta.url)));
      expect(size, img.url).toEqual({ width: img.width, height: img.height });
    }
  });

  test('the fixture holds the same facts as the Studio seed', () => {
    const seed = readFileSync(new URL('../../../studio/seed/seed.ndjson', import.meta.url), 'utf8')
      .split('\n').filter(l => l.trim() !== '').map(l => JSON.parse(l));
    const ofType = (t: string) => seed.filter((d: { _type: string }) => d._type === t);
    const settings = ofType('siteSettings')[0];
    for (const key of ['heroLines', 'heroText', 'whyIntro', 'hallText', 'groupsIntro', 'trialText', 'rankingWeek'] as const) {
      expect(fixture[key], key).toEqual(settings[key]);
    }
    expect(fixture.whyPoints).toEqual(settings.whyPoints.map(({ title, text }: { title: string; text: string }) => ({ title, text })));
    expect(fixture.groups.map(g => [g.name, g.audience, g.track]))
      .toEqual(ofType('group').sort((a: { order: number }, b: { order: number }) => a.order - b.order).map((g: { name: string; audience: string; track: string }) => [g.name, g.audience, g.track]));
    expect(fixture.competitions.map(c => [c.id, c.title, c.city, c.start, c.end, c.home]).sort())
      .toEqual(ofType('competition').map((c: Record<string, unknown>) => [c._id, c.title, c.city, c.start, c.end, c.home]).sort());
    expect(fixture.posts.map(p => [p.title, p.slug, p.kind, p.date]).sort())
      .toEqual(ofType('post').map((p: Record<string, any>) => [p.title, p.slug.current, p.kind, p.date]).sort());
    expect(fixture.athletes.map(a => [a.id, a.name, a.slug, a.consent, a.frbUrl, a.rankings]))
      .toEqual(ofType('athlete').map((a: Record<string, any>) => [a._id, a.name, a.slug.current, a.consent, a.frbUrl,
        a.rankings.map(({ _key, _type, ...r }: Record<string, unknown>) => r)]));
  });

  test('competition titles use "și", never "&"', () => {
    for (const c of fixture.competitions) expect(c.title).not.toContain('&');
    expect(fixture.competitions.map(c => c.title)).toContain('CN U9 și CN U17');
  });
});

describe('Sanity source', () => {
  test('CONTENT_SOURCE=sanity without a project id names the missing variable', async () => {
    process.env.CONTENT_SOURCE = 'sanity';
    await expect(getHomeData()).rejects.toThrow(/SANITY_PROJECT_ID/);
  });

  test('an unknown CONTENT_SOURCE is refused', async () => {
    process.env.CONTENT_SOURCE = 'altceva';
    await expect(getHomeData()).rejects.toThrow(/CONTENT_SOURCE/);
  });
});

describe('toHomeData', () => {
  test('mapping drops athletes without consent', () => {
    const raw = { ...rawSample, athletes: [{ ...rawAthlete, consent: true }, { ...rawAthlete, _id: 'x', consent: false }, { ...rawAthlete, _id: 'y', consent: undefined /* consent missing */ }] };
    expect(toHomeData(raw).athletes).toHaveLength(1);
  });

  test('mapping tolerates empty optional data', () => {
    const d = toHomeData({ ...rawSample, athletes: [], competitions: [], posts: [], settings: { ...rawSample.settings, hallPhotos: null, rankingWeek: null } });
    expect(d.hallPhotos).toEqual([]); expect(d.rankingWeek).toBeUndefined();
  });

  test('missing hero and why photos map to undefined', () => {
    const { whyPhoto: _absent, ...settings } = rawSample.settings;
    const d = toHomeData({ ...rawSample, settings: { ...settings, heroPhoto: null } });
    expect(d.heroPhoto).toBeUndefined();
    expect(d.whyPhoto).toBeUndefined();
  });

  test('images come from asset metadata; broken ones are dropped, never emptied', () => {
    const noAsset = { alt: 'Fără fișier', url: null, width: null, height: null };
    const d = toHomeData({
      ...rawSample,
      settings: { ...rawSample.settings, whyPhoto: noAsset, hallPhotos: [rawImg('ok'), noAsset, null, { ...rawImg('fara-alt'), alt: null }] },
      athletes: [{ ...rawAthlete, photo: noAsset }],
      posts: [{ ...rawSample.posts[0], cover: noAsset }],
    });
    expect(d.heroPhoto).toEqual(rawImg('hero'));
    expect(d.whyPhoto).toBeUndefined();
    expect(d.hallPhotos).toEqual([rawImg('ok')]);
    expect(d.athletes[0].photo).toBeUndefined();
    expect(d.posts[0].cover).toBeUndefined();
  });

  test('maps the full shape and leaves absent optionals out', () => {
    const d = toHomeData({
      ...rawSample,
      athletes: [{ ...rawAthlete, photo: rawImg('nistor'), rankings: null }, { ...rawAthlete, _id: 'b', frbUrl: null, rankings: [{ category: 'U15', discipline: 'SF', place: 3, points: null }] }],
      competitions: [{ ...rawSample.competitions[0], postSlug: 'novi-sad-2026' }],
    });
    expect(d.athletes[0]).toEqual({ id: 'athlete-a', name: 'Nistor Cristian-Ionuț', slug: 'nistor-cristian-ionut', consent: true, frbUrl: rawAthlete.frbUrl, photo: rawImg('nistor'), rankings: [] });
    expect(d.athletes[1]).not.toHaveProperty('frbUrl');
    expect(d.athletes[1].rankings).toEqual([{ category: 'U15', discipline: 'SF', place: 3 }]);
    expect(d.groups).toEqual([{ name: 'Inițiere', audience: 'Copii', track: 'performanta' }]);
    expect(d.competitions[0]).toEqual({ id: 'c1', title: 'CN U9 și CN U17', city: 'București', start: '2026-11-27', end: '2026-11-29', home: false, postSlug: 'novi-sad-2026' });
    expect(d.posts[0]).toEqual({ title: 'Novi Sad – 2026', slug: 'novi-sad-2026', kind: 'competitie', date: '2026-06-30', cover: rawImg('cover') });
    expect(d.rankingWeek).toEqual({ week: 46, from: '2026-11-09', to: '2026-11-15' });
    expect(d.whyPoints).toEqual([{ title: 'Dormi mai bine', text: 'Reduce stresul.' }]);
  });

  test('a result without settings fails with a readable message', () => {
    expect(() => toHomeData({ ...rawSample, settings: null })).toThrow(/siteSettings/);
  });
});

/** Reads width and height from a JPEG's start-of-frame marker. */
function jpegSize(b: Buffer): { width: number; height: number } {
  let i = 2;
  while (i + 9 < b.length) {
    const marker = b[i + 1];
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('no JPEG frame header');
}

describe('buildToday', () => {
  test('is today in Bucharest when BUILD_TODAY is not set', () => {
    expect(buildToday()).toBe(todayInBucharest());
  });

  test('BUILD_TODAY pins the date, so builds are repeatable', () => {
    process.env.BUILD_TODAY = '2026-12-05';
    expect(buildToday()).toBe('2026-12-05');
  });

  test('a malformed BUILD_TODAY fails the build', () => {
    process.env.BUILD_TODAY = '5 decembrie';
    expect(() => buildToday()).toThrow(/BUILD_TODAY/);
    process.env.BUILD_TODAY = '2026-13-05';
    expect(() => buildToday()).toThrow(/BUILD_TODAY/);
  });
});
