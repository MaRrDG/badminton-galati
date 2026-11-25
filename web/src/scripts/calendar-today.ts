// The calendar is built once a day, so its "today" can be a day or more old when a visitor reads
// it. When the visitor's date in Bucharest differs from the build date (`data-today` on the
// calendar), everything that depends on it is recomputed with the same rules as the build: the
// today mark, the legend's date, each block's and each row's status (classes, words, labels),
// and the panel's next event, or its season-over line when none is left. Without JavaScript the
// build-time state stays.
import { blockLabel, blockStatus, eventStatus, eventView, statusWord, todayLabel, type EventStatus } from '../lib/calendar';
import { todayInBucharest } from '../lib/dates';
import { splitCalendar } from '../lib/home';
import { readEvents, renderPanelEvent, renderPanelNone } from './calendar-panel';

const STATUSES: EventStatus[] = ['played', 'next', 'upcoming'];

function setStatus(el: Element, status: EventStatus): void {
  el.classList.remove(...STATUSES);
  el.classList.add(status);
}

/** Moves the today mark (class and `aria-current`) to `today`, or removes it outside the grid. */
function markToday(root: HTMLElement, today: string): void {
  for (const el of root.querySelectorAll('.months [aria-current="date"]')) {
    el.removeAttribute('aria-current');
    el.classList.remove('today');
    if (el.classList.contains('d')) el.setAttribute('aria-hidden', 'true');
  }
  const month = root.querySelector(`.mo[data-ym="${today.slice(0, 7)}"]`);
  const day = String(Number(today.slice(8, 10)));
  const cell = month && [...month.querySelectorAll('.d, .evb > span')].find(el => el.textContent?.trim() === day);
  if (!cell) return;
  cell.classList.add('today');
  cell.setAttribute('aria-current', 'date');
  cell.removeAttribute('aria-hidden');
}

export function initCalendarToday(): void {
  const root = document.querySelector<HTMLElement>('.cal[data-today]');
  if (!root) return;
  const today = todayInBucharest();
  if (today === root.dataset.today) return;
  root.dataset.today = today;

  const events = readEvents();
  const byId = new Map(events.map(c => [c.id, c]));
  const next = splitCalendar(events, today).next;
  const nextId = next?.id;

  markToday(root, today);
  const label = root.querySelector('[data-today-label]');
  if (label) label.textContent = todayLabel(today);

  const shown = new Set<EventStatus>();
  for (const block of root.querySelectorAll<HTMLElement>('.evb[data-ids]')) {
    const comps = (block.dataset.ids ?? '').split(' ').flatMap(id => byId.get(id) ?? []);
    if (comps.length === 0) continue;
    const status = blockStatus(comps, today, nextId);
    shown.add(status);
    setStatus(block, status);
    block.setAttribute('aria-label', blockLabel(comps, today, nextId));
  }
  root.querySelector<HTMLElement>('[data-legend="upcoming"]')?.toggleAttribute('hidden', !shown.has('next') && !shown.has('upcoming'));
  root.querySelector<HTMLElement>('[data-legend="played"]')?.toggleAttribute('hidden', !shown.has('played'));

  for (const row of root.querySelectorAll<HTMLElement>('.li[data-id]')) {
    const c = byId.get(row.dataset.id ?? '');
    if (!c) continue;
    const status = eventStatus(c, today, nextId);
    setStatus(row, status);
    const word = row.querySelector('.st');
    if (word) word.textContent = statusWord(status);
  }

  const panel = root.querySelector<HTMLElement>('[data-panel]');
  if (!panel || (panel.dataset.next ?? '') === (nextId ?? '')) return;
  if (next) {
    renderPanelEvent(panel, eventView(next, 'next'), { heading: 'Următoarea competiție', countdown: true });
    panel.dataset.next = next.id;
  } else {
    renderPanelNone(panel);
    delete panel.dataset.next;
  }
}
