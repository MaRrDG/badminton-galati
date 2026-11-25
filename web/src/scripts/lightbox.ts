// The article gallery's lightbox. Without JavaScript, or in a browser without <dialog>
// showModal(), each `.mosaic a` stays a plain link to the photo file. With it, a link opens the
// photo in the modal `dialog.lb`: the page behind is inert and does not scroll, focus moves into
// the dialog and returns to the link on close; Escape closes, the arrow keys (and a swipe on a
// touch screen) page through the photos, and the counter reads "3 din 7".

/** A horizontal swipe at least this long, in CSS px, pages. */
const SWIPE = 50;

export function initLightbox(): void {
  const dialog = document.querySelector<HTMLDialogElement>('dialog.lb');
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.mosaic a')];
  if (!dialog || links.length === 0 || typeof dialog.showModal !== 'function') return;
  const frame = dialog.querySelector<HTMLElement>('.frame');
  const count = dialog.querySelector<HTMLElement>('.count');
  if (!frame || !count) return;

  const img = document.createElement('img');
  img.decoding = 'async';
  frame.append(img);
  dialog.classList.toggle('single', links.length < 2);

  let current = 0;
  let opener: HTMLAnchorElement | undefined;

  const show = (index: number) => {
    current = (index + links.length) % links.length;
    const link = links[current];
    const thumb = link.querySelector('img');
    img.src = link.getAttribute('href') ?? '';
    img.alt = thumb?.alt ?? '';
    img.setAttribute('width', thumb?.getAttribute('width') ?? '');
    img.setAttribute('height', thumb?.getAttribute('height') ?? '');
    count.textContent = `${current + 1} din ${links.length}`;
  };

  links.forEach((link, i) =>
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      show(i);
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
    }),
  );

  dialog.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const go = target.closest<HTMLElement>('[data-go]')?.dataset.go;
    if (go) show(current + Number(go));
    else if (target.closest('[data-close]') || target === dialog) dialog.close();
  });

  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') show(current + 1);
    else if (event.key === 'ArrowLeft') show(current - 1);
    else return;
    event.preventDefault();
  });

  let startX: number | undefined;
  img.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') startX = event.clientX;
  });
  img.addEventListener('pointerup', event => {
    if (startX === undefined) return;
    const dx = event.clientX - startX;
    startX = undefined;
    if (Math.abs(dx) >= SWIPE) show(current + (dx < 0 ? 1 : -1));
  });

  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    opener?.focus();
  });
}
