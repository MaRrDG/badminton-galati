// The calendar's details panel (Panel.astro). On wide screens hovering or focusing an event block
// shows that event in the panel; Enter or a click pins it (the block gets `.on`) and offers
// "Arată următoarea competiție", which brings the next event back. A block shared by several
// competitions shows the first and lists the others as buttons that switch to them. Pinning is
// announced through a polite live region; hover and focus are not, since a focused block reads
// its own label. On narrow screens, and without JavaScript, a block is a plain link to its row.
import { eventStatus, eventView, type EventView } from '../lib/calendar';
import type { Competition } from '../lib/types';
import { initCountdowns } from './countdown';

const WIDE = '(min-width: 861px)';

/** Every competition of the calendar, as the page embeds them (#calendar-events). */
export function readEvents(): Competition[] {
  const json = document.getElementById('calendar-events')?.textContent;
  return json ? (JSON.parse(json) as Competition[]) : [];
}

const template = (name: string) => document.querySelector<HTMLTemplateElement>(`template[data-panel-${name}]`);

/**
 * Shows one competition in the panel: `heading` above it, its countdown when `countdown` (the
 * next event), and `others` (the competitions sharing its days) as buttons to switch to.
 */
export function renderPanelEvent(
  panel: HTMLElement,
  view: EventView,
  opts: { heading: string; countdown?: boolean; others?: EventView[] },
): void {
  const body = panel.querySelector('.pbody');
  const content = template('event')?.content.cloneNode(true) as DocumentFragment | undefined;
  if (!body || !content) return;
  const part = <T extends HTMLElement = HTMLElement>(selector: string) => content.querySelector<T>(selector)!;
  part('.ps').textContent = opts.heading;
  part('.pdn').textContent = view.days;
  part('.pdm').textContent = view.rest;
  part('.pt').textContent = view.title;
  part('.pcity').textContent = view.city;
  if (!view.home) part('.home-tag').remove();
  const post = part<HTMLAnchorElement>('.post');
  if (view.postSlug) post.href = `/noutati/${view.postSlug}/`;
  else post.remove();
  const results = part<HTMLAnchorElement>('.results');
  if (view.resultsUrl) results.href = view.resultsUrl;
  else results.remove();
  if (!view.postSlug && !view.resultsUrl) part('.pa').remove();
  const others = opts.others ?? [];
  const other = part('.other');
  for (const o of others) {
    const button = other.cloneNode(true) as HTMLElement;
    button.textContent = o.title;
    button.dataset.id = o.id;
    other.before(button);
  }
  if (others.length > 0) other.remove();
  else part('.also').remove();
  const days = part('.days');
  if (opts.countdown) {
    days.dataset.start = view.start;
    days.dataset.end = view.end;
  } else days.remove();
  panel.classList.remove('none');
  panel.classList.toggle('played', view.status === 'played');
  panel.classList.toggle('home', view.home);
  body.replaceChildren(content);
}

/** The panel's quiet state: nothing scheduled. */
export function renderPanelNone(panel: HTMLElement): void {
  const body = panel.querySelector('.pbody');
  const content = template('none')?.content.cloneNode(true);
  if (!body || !content) return;
  panel.classList.remove('played', 'home');
  panel.classList.add('none');
  body.replaceChildren(content);
}

export function initCalendarPanel(): void {
  const panel = document.querySelector<HTMLElement>('[data-panel]');
  const body = panel?.querySelector<HTMLElement>('.pbody');
  const live = document.querySelector<HTMLElement>('[data-panel-live]');
  const blocks = [...document.querySelectorAll<HTMLAnchorElement>('.evb[data-ids]')];
  if (!panel || !body || !live || blocks.length === 0) return;
  const back = panel.querySelector<HTMLButtonElement>('.back');
  const wide = window.matchMedia(WIDE);
  // calendar-today.ts has already moved the date and the next event to the visitor's today.
  const today = document.querySelector<HTMLElement>('[data-today]')?.dataset.today ?? '';
  const nextId = panel.dataset.next || undefined;
  const byId = new Map(readEvents().map(c => [c.id, c]));
  const view = (id: string) => {
    const c = byId.get(id);
    return c && eventView(c, eventStatus(c, today, nextId));
  };
  const idsOf = (block: HTMLElement) => (block.dataset.ids ?? '').split(' ').filter(id => byId.has(id));
  // The panel as it stands now (the next event, or "nothing scheduled"), with its countdown.
  const first = { className: panel.className, nodes: [...body.childNodes].map(n => n.cloneNode(true)) };
  let pinned: { block: HTMLElement; id: string } | undefined;

  const showFirst = () => {
    panel.className = first.className;
    body.replaceChildren(...first.nodes.map(n => n.cloneNode(true)));
  };

  const show = (block: HTMLElement, id: string) => {
    const ids = idsOf(block);
    if (id === nextId && ids.length === 1) return showFirst();
    const shown = view(id);
    if (!shown) return;
    const heading = id === nextId ? 'Următoarea competiție' : shown.status === 'played' ? 'S-a jucat' : 'Urmează';
    const others = ids.filter(x => x !== id).map(view).filter((v): v is EventView => v !== undefined);
    renderPanelEvent(panel, shown, { heading, countdown: id === nextId, others });
    if (id === nextId) initCountdowns();
  };

  const showCurrent = () => (pinned ? show(pinned.block, pinned.id) : showFirst());
  const mark = (block?: HTMLElement) => blocks.forEach(b => b.classList.toggle('on', b === block));
  const announce = (text: string) => {
    // Cleared first, so pinning the same event again is announced again.
    live.textContent = '';
    window.setTimeout(() => (live.textContent = text), 60);
  };

  const pin = (block: HTMLElement, id: string) => {
    const isFirst = id === nextId && idsOf(block).length === 1;
    pinned = isFirst ? undefined : { block, id };
    mark(isFirst ? undefined : block);
    if (back) back.hidden = isFirst || !nextId;
    showCurrent();
    const v = view(id);
    if (v) announce(v.label);
  };

  for (const block of blocks) {
    const [firstId] = idsOf(block);
    if (!firstId) continue;
    block.addEventListener('mouseenter', () => wide.matches && show(block, firstId));
    block.addEventListener('focus', () => wide.matches && show(block, firstId));
    block.addEventListener('mouseleave', () => wide.matches && showCurrent());
    block.addEventListener('blur', event => {
      if (wide.matches && !panel.contains(event.relatedTarget as Node | null)) showCurrent();
    });
    block.addEventListener('click', event => {
      // Narrow screens follow the link to the row; a modified click opens it as the visitor asks.
      if (!wide.matches || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      pin(block, firstId);
    });
  }

  // A competition sharing the pinned block's days.
  panel.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLElement>('.other');
    if (!button?.dataset.id || !pinned) return;
    pin(pinned.block, button.dataset.id);
    panel.querySelector<HTMLElement>('.other')?.focus();
  });

  back?.addEventListener('click', () => {
    pinned = undefined;
    mark();
    back.hidden = true;
    showFirst();
    // The button goes away: keep the keyboard in the calendar, on the next event's block.
    const nextBlock = nextId && blocks.find(b => idsOf(b).includes(nextId));
    if (nextBlock) nextBlock.focus();
    else {
      panel.tabIndex = -1;
      panel.focus();
    }
  });
}
