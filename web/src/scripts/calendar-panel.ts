// The calendar's details panel (Panel.astro). On wide screens hovering or focusing an event block
// shows that event in the panel; Enter or a click pins it (the block gets `.on`) and offers
// "Arată următoarea competiție", which brings the next event back. Pinning is announced through
// a polite live region; hover and focus are not, since a focused block reads its own label.
// On narrow screens, and without JavaScript, a block is a plain link to its row in the list.

const WIDE = '(min-width: 861px)';

export function initCalendarPanel(): void {
  const panel = document.querySelector<HTMLElement>('[data-panel]');
  const body = panel?.querySelector<HTMLElement>('.pbody');
  const pick = document.querySelector<HTMLTemplateElement>('template[data-panel-pick]');
  const live = document.querySelector<HTMLElement>('[data-panel-live]');
  const blocks = [...document.querySelectorAll<HTMLAnchorElement>('.evb[data-ev]')];
  if (!panel || !body || !pick || !live || blocks.length === 0) return;
  const back = panel.querySelector<HTMLButtonElement>('.back');
  const wide = window.matchMedia(WIDE);
  const nextRow = panel.dataset.next; // the id of the next event's row, if there is one
  // The panel as built (the next event, or "nothing scheduled"), with its countdown.
  const first = { className: panel.className, nodes: [...body.childNodes].map(n => n.cloneNode(true)) };
  let pinned: HTMLElement | undefined; // a row of the list; none while the panel shows the first state

  const showFirst = () => {
    panel.className = first.className;
    body.replaceChildren(...first.nodes.map(n => n.cloneNode(true)));
  };

  const showRow = (row: HTMLElement) => {
    if (row.id === nextRow) return showFirst();
    const { status, days, rest, title, city } = row.dataset;
    const home = row.hasAttribute('data-home');
    const view = pick.content.cloneNode(true) as DocumentFragment;
    const part = (selector: string) => view.querySelector<HTMLElement>(selector)!;
    part('.ps').textContent = status === 'played' ? 'S-a jucat' : 'Urmează';
    part('.pdn').textContent = days ?? '';
    part('.pdm').textContent = rest ?? '';
    part('.pt').textContent = title ?? '';
    part('.pcity').textContent = city ?? '';
    if (!home) part('.home-tag').remove();
    const links = row.querySelectorAll('.la a');
    if (links.length > 0) part('.pa').append(...[...links].map(a => a.cloneNode(true)));
    else part('.pa').remove();
    panel.className = first.className;
    panel.classList.remove('none', 'home');
    panel.classList.toggle('played', status === 'played');
    panel.classList.toggle('home', home);
    body.replaceChildren(view);
  };

  const showCurrent = () => (pinned ? showRow(pinned) : showFirst());
  const rowOf = (block: HTMLElement) => document.getElementById(block.dataset.ev ?? '');
  const mark = (block?: HTMLElement) => blocks.forEach(b => b.classList.toggle('on', b === block));

  for (const block of blocks) {
    const row = rowOf(block);
    if (!row) continue;
    block.addEventListener('mouseenter', () => wide.matches && showRow(row));
    block.addEventListener('focus', () => wide.matches && showRow(row));
    block.addEventListener('mouseleave', () => wide.matches && showCurrent());
    block.addEventListener('blur', event => {
      if (wide.matches && !panel.contains(event.relatedTarget as Node | null)) showCurrent();
    });
    block.addEventListener('click', event => {
      if (!wide.matches) return; // narrow: follow the link to the row
      event.preventDefault();
      const isNext = row.id === nextRow;
      pinned = isNext ? undefined : row;
      mark(isNext ? undefined : block);
      if (back) back.hidden = isNext;
      showCurrent();
      live.textContent = block.getAttribute('aria-label') ?? '';
    });
  }

  back?.addEventListener('click', () => {
    pinned = undefined;
    mark();
    back.hidden = true;
    showFirst();
    // The button goes away: keep the keyboard in the calendar, on the next event's block.
    const nextBlock = blocks.find(b => b.dataset.ev === nextRow);
    if (nextBlock) nextBlock.focus();
    else {
      panel.tabIndex = -1;
      panel.focus();
    }
  });
}
