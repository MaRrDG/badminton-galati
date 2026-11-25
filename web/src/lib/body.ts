// The article body: Portable Text from the CMS turned into safe HTML for the page's text column.
// Every string from the content is escaped by the renderer; only the tags written here are output.
// Photos inside the text are not HTML: they come out as their own segments, so the page renders
// them with PlatePhoto, the site's one red-plate implementation.
import { escapeHTML, toHTML, type PortableTextHtmlComponents } from '@portabletext/to-html';
import type { BodyBlock, Img } from './types';

/** A run of text as HTML, or a photo placed between the runs. */
export type BodySegment = { kind: 'html'; html: string } | { kind: 'photo'; photo: Img };

/** Link targets a reader may follow from the text; anything else (javascript:, data:, relative) is plain text. */
const SAFE_LINK = /^(https?:|mailto:)/i;
const WEB_LINK = /^https?:/i;

/** The components for text, sharing one "lead given" flag across all the runs of one body. */
function textComponents(): Partial<PortableTextHtmlComponents> {
  let leadGiven = false;
  return {
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
    unknownType: () => '',
    unknownMark: ({ children }) => children,
    unknownBlockStyle: ({ children }) => `<p>${children}</p>`,
  };
}

/**
 * The body in reading order: runs of text as HTML and the photos between them. The text has
 * paragraphs (the first plain paragraph of the whole body is the lead, `class="lead"`), `h2`,
 * `h3`, quotes, bullet and numbered lists, bold and italic. Links only to http(s) and mailto
 * addresses; web links get `rel="noopener"` and open in the same tab. Unknown block types and
 * marks are left out (a mark's text stays), so a new CMS field never breaks a build. Empty
 * runs are left out.
 */
export function bodySegments(blocks: BodyBlock[]): BodySegment[] {
  const components = textComponents();
  const segments: BodySegment[] = [];
  let run: BodyBlock[] = [];
  const flush = () => {
    const html = run.length > 0 ? toHTML(run, { components, onMissingComponent: false }) : '';
    if (html) segments.push({ kind: 'html', html });
    run = [];
  };
  for (const block of blocks) {
    if (block._type === 'photo') {
      flush();
      segments.push({ kind: 'photo', photo: block.photo });
    } else {
      run.push(block);
    }
  }
  flush();
  return segments;
}

/** The text of the body as one HTML string, photos left out (see `bodySegments`). */
export function bodyToHtml(blocks: BodyBlock[]): string {
  return bodySegments(blocks)
    .map(s => (s.kind === 'html' ? s.html : ''))
    .join('');
}
