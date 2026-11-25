import { describe, expect, test } from 'vitest';
import { bodySegments, bodyToHtml } from '../../src/lib/body';
import type { BodyBlock, Img } from '../../src/lib/types';

let key = 0;
const k = () => `k${key++}`;
type TextBlock = Extract<BodyBlock, { _type: 'block' }>;
const block = (text: string, extra: Partial<TextBlock> = {}): BodyBlock => ({
  _type: 'block', _key: k(), style: 'normal', children: [{ _type: 'span', _key: k(), text }], markDefs: [], ...extra,
});
const para = (text: string) => block(text);
const linked = (text: string, href: string): BodyBlock => ({
  _type: 'block', _key: k(), style: 'normal',
  children: [{ _type: 'span', _key: k(), text, marks: ['l1'] }],
  markDefs: [{ _key: 'l1', _type: 'link', href }],
});
const smash: Img = { url: '/img/smash.jpg', width: 800, height: 1200, alt: 'Sportiv în săritură' };

describe('the article body', () => {
  test('the first paragraph is the lead', () => {
    expect(bodyToHtml([para('Prima'), para('A doua')])).toBe('<p class="lead">Prima</p><p>A doua</p>');
  });

  test('text is escaped', () => {
    const html = bodyToHtml([para('<script>x</script>'), block('"a" & <b>', { style: 'h2' })]);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('links: only http, https and mailto; the web ones with rel="noopener"', () => {
    expect(bodyToHtml([linked('aici', 'javascript:alert(1)')])).not.toContain('href');
    expect(bodyToHtml([linked('aici', 'data:text/html,x')])).not.toContain('href');
    expect(bodyToHtml([linked('aici', '/relativ')])).not.toContain('href');
    expect(bodyToHtml([linked('aici', 'https://www.badminton.ro/?a=1&b="2"')])).toBe(
      '<p class="lead"><a href="https://www.badminton.ro/?a=1&amp;b=&quot;2&quot;" rel="noopener">aici</a></p>',
    );
    expect(bodyToHtml([linked('scrie', 'mailto:club@example.ro')])).toBe('<p class="lead"><a href="mailto:club@example.ro">scrie</a></p>');
  });

  test('headings, quotes, lists and marks', () => {
    const strong: BodyBlock = {
      _type: 'block', _key: k(), style: 'normal', markDefs: [],
      children: [
        { _type: 'span', _key: k(), text: 'tare', marks: ['strong'] },
        { _type: 'span', _key: k(), text: ' și ' },
        { _type: 'span', _key: k(), text: 'aplecat', marks: ['em'] },
      ],
    };
    const html = bodyToHtml([
      strong,
      block('Subtitlu', { style: 'h2' }),
      block('Mic', { style: 'h3' }),
      block('Citat', { style: 'blockquote' }),
      block('unu', { listItem: 'bullet', level: 1 }),
      block('doi', { listItem: 'bullet', level: 1 }),
      block('primul', { listItem: 'number', level: 1 }),
    ]);
    expect(html).toBe(
      '<p class="lead"><strong>tare</strong> și <em>aplecat</em></p><h2>Subtitlu</h2><h3>Mic</h3>' +
        '<blockquote>Citat</blockquote><ul><li>unu</li><li>doi</li></ul><ol><li>primul</li></ol>',
    );
  });

  test('a list item is never the lead', () => {
    expect(bodyToHtml([block('unu', { listItem: 'bullet', level: 1 }), para('Text')])).toBe('<ul><li>unu</li></ul><p class="lead">Text</p>');
  });

  test('a photo in the text is its own segment, between the runs of text; the lead is given once', () => {
    expect(bodySegments([para('Prima'), { _type: 'photo', _key: 'p', photo: smash }, para('A doua')])).toEqual([
      { kind: 'html', html: '<p class="lead">Prima</p>' },
      { kind: 'photo', photo: smash },
      { kind: 'html', html: '<p>A doua</p>' },
    ]);
    expect(bodySegments([{ _type: 'photo', _key: 'p', photo: smash }])).toEqual([{ kind: 'photo', photo: smash }]);
    expect(bodyToHtml([{ _type: 'photo', _key: 'p', photo: smash }, para('Text')])).toBe('<p class="lead">Text</p>');
    expect(bodySegments([])).toEqual([]);
  });

  test('unknown blocks and marks are skipped, not rendered or crashed on', () => {
    const odd = [
      { _type: 'video', _key: 'v', url: 'x' },
      { _type: 'block', _key: 'b', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 's', text: 'ok', marks: ['glow'] }] },
    ] as unknown as BodyBlock[];
    expect(bodyToHtml(odd)).toBe('<p class="lead">ok</p>');
    expect(bodyToHtml([])).toBe('');
  });
});
