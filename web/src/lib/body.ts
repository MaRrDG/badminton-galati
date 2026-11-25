// The article body: Portable Text from the CMS turned into safe HTML for the page's text column.
// Every string from the content is escaped by the renderer; only the tags written here are output.
import { escapeHTML, toHTML, type PortableTextHtmlComponents } from '@portabletext/to-html';
import type { BodyBlock, Img } from './types';

/** Link targets a reader may follow from the text; anything else (javascript:, data:, relative) is plain text. */
const SAFE_LINK = /^(https?:|mailto:)/i;
const WEB_LINK = /^https?:/i;

const photoHtml = (photo: Img) =>
  `<figure class="pull"><img src="${escapeHTML(photo.url)}" width="${photo.width}" height="${photo.height}" ` +
  `alt="${escapeHTML(photo.alt)}" loading="lazy" decoding="async"></figure>`;

/**
 * The body as HTML: paragraphs (the first plain paragraph is the lead, `class="lead"`), `h2`,
 * `h3`, quotes, bullet and numbered lists, bold and italic. Links only to http(s) and mailto
 * addresses; web links get `rel="noopener"` and open in the same tab. A `photo` block is a
 * floated figure with its own size. Unknown block types and marks are left out (a mark's text
 * stays), so new CMS fields never break a build.
 */
export function bodyToHtml(blocks: BodyBlock[]): string {
  let leadGiven = false;
  const components: Partial<PortableTextHtmlComponents> = {
    block: {
      normal: ({ children }) => {
        if (leadGiven) return `<p>${children}</p>`;
        leadGiven = true;
        return `<p class="lead">${children}</p>`;
      },
      h2: ({ children }) => `<h2>${children}</h2>`,
      h3: ({ children }) => `<h3>${children}</h3>`,
      blockquote: ({ children }) => `<blockquote>${children}</blockquote>`,
    },
    marks: {
      strong: ({ children }) => `<strong>${children}</strong>`,
      em: ({ children }) => `<em>${children}</em>`,
      link: ({ children, value }) => {
        const href = typeof value?.href === 'string' ? value.href.trim() : '';
        if (!SAFE_LINK.test(href)) return children;
        const rel = WEB_LINK.test(href) ? ' rel="noopener"' : '';
        return `<a href="${escapeHTML(href)}"${rel}>${children}</a>`;
      },
    },
    types: {
      photo: ({ value }) => photoHtml((value as Extract<BodyBlock, { _type: 'photo' }>).photo),
    },
    unknownType: () => '',
    unknownMark: ({ children }) => children,
    unknownBlockStyle: ({ children }) => `<p>${children}</p>`,
  };
  return toHTML(blocks, { components, onMissingComponent: false });
}
