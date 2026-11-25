// Announces the count of the chosen filter option (FilterBar with `status`). The filter itself
// works without JavaScript; this only tells screen readers what changed.

export function initFilterStatus(): void {
  document.querySelectorAll<HTMLElement>('.filterbar').forEach(bar => {
    const live = bar.querySelector<HTMLElement>('[data-filter-status] [aria-live]');
    if (!live) return;
    bar.addEventListener('change', event => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.checked) live.textContent = input.dataset.countLabel ?? '';
    });
  });
}
