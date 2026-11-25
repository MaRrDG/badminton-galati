// The pages are built once a day, so a build-time countdown ("peste 2 zile") can go stale:
// every `[data-countdown]` (with `data-start` and `data-end`) is recomputed from the visitor's
// clock with the same rules. Without JavaScript the build-time label stays.
import { todayInBucharest } from '../lib/dates';
import { countdownLabel } from '../lib/home';

export function initCountdowns(): void {
  const today = todayInBucharest();
  for (const el of document.querySelectorAll<HTMLElement>('[data-countdown]')) {
    const { start, end } = el.dataset;
    const label = start && end ? countdownLabel({ start, end }, today) : undefined;
    el.textContent = label ?? '';
    el.hidden = !label;
  }
}
