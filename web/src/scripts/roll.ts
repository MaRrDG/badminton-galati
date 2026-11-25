// The digit bands of a rolling numeral (homepage roster, athletes wall, athlete profile).
// The element holds its final digits as text until here, for no-JS and reduced motion.

/**
 * Replaces the digits of `el` (from `data-roll`) with one cell per digit, each holding a band
 * of digits: one full turn of 0–9, then on to the digit. Returns each band with the yPercent
 * that shows its final digit; the caller animates from 0 to `end`.
 */
export function digitBands(el: HTMLElement): { band: HTMLElement; end: number }[] {
  const digits = el.dataset.roll ?? '';
  el.textContent = '';
  return [...digits].map(digit => {
    const n = 10 + Number(digit) + 1;
    const cell = document.createElement('i');
    const band = document.createElement('span');
    band.style.display = 'block';
    for (let k = 0; k < n; k++) {
      const u = document.createElement('u');
      u.textContent = String(k % 10);
      band.append(u);
    }
    cell.append(band);
    el.append(cell);
    return { band, end: (-100 * (n - 1)) / n };
  });
}
