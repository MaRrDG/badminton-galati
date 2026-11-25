// The article's share row (Share.astro), built from the page's own address: the public address
// of the site is not known before launch, so the row is hidden until this runs. Plain links, no
// third-party script. "Copiază linkul" copies the address and "Link copiat" shows for 2.4 s in a
// status beside it (the button's name never changes, so it is announced once); where the
// clipboard is not available it shows the address in a field, selected, to copy by hand.

/** How long "Link copiat" stays beside the button, in ms. */
const COPIED_FOR = 2400;

export function initShare(): void {
  const row = document.querySelector<HTMLElement>('.share[data-share-title]');
  if (!row) return;
  const url = location.origin + location.pathname;
  const title = row.dataset.shareTitle ?? document.title;
  const part = <T extends HTMLElement>(name: string) => row.querySelector<T>(`[data-share="${name}"]`);

  const fb = part<HTMLAnchorElement>('fb');
  const wa = part<HTMLAnchorElement>('wa');
  if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  if (wa) wa.href = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;

  const copy = part<HTMLButtonElement>('copy');
  const field = part<HTMLInputElement>('url');
  const status = part<HTMLElement>('status');
  let timer: number | undefined;

  const showField = () => {
    if (!field) return;
    field.value = url;
    field.hidden = false;
    field.focus();
    field.select();
  };

  copy?.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(url);
    } catch {
      showField();
      return;
    }
    // The button keeps its name; the status next to it shows and announces the copy, once.
    if (!status) return;
    status.textContent = 'Link copiat';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      status.textContent = '';
    }, COPIED_FOR);
  });

  row.hidden = false;
}
