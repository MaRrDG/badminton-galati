import { describe, expect, test } from 'vitest';
import { answerParagraphs, coachesLead, parentsView, writeToCoaches } from '../../src/lib/parents';
import type { Group, Img, SiteData } from '../../src/lib/types';

const img = (name: string): Img => ({ url: `/img/${name}.jpg`, width: 1280, height: 720, alt: name });
const group = (slug: string, track: Group['track']): Group => ({ id: `group-${slug}`, slug, name: slug, audience: 'Copii', track, sessions: [] });

const site = (over: Partial<SiteData> = {}): SiteData => ({
  athletes: [], competitions: [], posts: [], hallPhotos: [], heroLines: ['x'], heroText: '', whyIntro: '', whyPoints: [],
  hallText: '', groupsIntro: '', trialText: '',
  groups: [group('amatori-copii', 'amatori'), group('initiere', 'performanta'), group('elite', 'performanta')],
  coaches: [], info: { parents: {}, contact: {} },
  ...over,
});

describe('coachesLead', () => {
  test('names no number, so it never goes stale', () => {
    expect(coachesLead(0)).toBeUndefined();
    expect(coachesLead(1)).toBe('Clubul e condus de antrenorul său.');
    expect(coachesLead(2)).toBe('Clubul e condus de antrenorii săi.');
    expect(coachesLead(3)).toBe('Clubul e condus de antrenorii săi.');
  });
});

describe('writeToCoaches', () => {
  test('one coach is "îi", several or none (the coaches in general) "le"', () => {
    expect(writeToCoaches(1)).toBe('Îi poți scrie');
    expect(writeToCoaches(0)).toBe('Le poți scrie');
    expect(writeToCoaches(3)).toBe('Le poți scrie');
  });
});

describe('answerParagraphs', () => {
  test('splits on blank lines and drops empty ones', () => {
    expect(answerParagraphs(undefined)).toEqual([]);
    expect(answerParagraphs('  ')).toEqual([]);
    expect(answerParagraphs('Unu.')).toEqual(['Unu.']);
    expect(answerParagraphs('Unu.\n\n  Doi.\r\n \r\nTrei.\n')).toEqual(['Unu.', 'Doi.', 'Trei.']);
    expect(answerParagraphs('Rând unu\nrând doi')).toEqual(['Rând unu\nrând doi']);
  });
});

describe('parentsView', () => {
  test('the first group of each road, in the order of the source', () => {
    expect(parentsView(site()).groupSlugs).toEqual({ first: 'initiere', play: 'amatori-copii' });
    expect(parentsView(site({ groups: [] })).groupSlugs).toEqual({});
  });

  test('coaches keep their order and take alternating tones', () => {
    const coaches = [{ id: 'a', name: 'A B' }, { id: 'b', name: 'C D' }, { id: 'c', name: 'E F' }, { id: 'd', name: 'G H' }];
    expect(parentsView(site({ coaches })).coaches.map(c => [c.coach.id, c.tone])).toEqual([['a', 'blue'], ['b', 'deep'], ['c', 'red'], ['d', 'blue']]);
  });

  test('the opening photo is the club\'s parents photo, else the first hall photo', () => {
    const hall = [img('meci-dublu'), img('cantonament'), img('medalii')];
    const info = { parents: {}, contact: {}, parentsPhoto: img('copii') };
    expect(parentsView(site({ hallPhotos: hall, info })).openingPhoto).toEqual(img('copii'));
    expect(parentsView(site({ hallPhotos: hall })).openingPhoto).toEqual(img('meci-dublu'));
    expect(parentsView(site()).openingPhoto).toBeUndefined();
  });

  test('the hall photo is the club\'s venue photo, else the first other hall photo, else none', () => {
    const hall = [img('meci-dublu'), img('cantonament')];
    const venue = img('sala-turneu-2');
    expect(parentsView(site({ hallPhotos: hall, info: { parents: {}, contact: {}, venuePhoto: venue } })).hallPhoto).toEqual(venue);
    expect(parentsView(site({ hallPhotos: hall })).hallPhoto).toEqual(img('cantonament'));
    // The opening photo is told apart by its url, so a copy of it is never shown twice.
    const parentsPhoto = img('cantonament');
    expect(parentsView(site({ hallPhotos: [img('cantonament'), img('medalii')], info: { parents: {}, contact: {}, parentsPhoto } })).hallPhoto).toEqual(img('medalii'));
    expect(parentsView(site({ hallPhotos: [img('cantonament')], info: { parents: {}, contact: {}, parentsPhoto } })).hallPhoto).toBeUndefined();
    expect(parentsView(site()).hallPhoto).toBeUndefined();
  });

  test('passes the club\'s answers through', () => {
    const parents = { cost: 'Răspuns.' };
    expect(parentsView(site({ info: { parents, contact: {} } })).parents).toEqual(parents);
  });
});
