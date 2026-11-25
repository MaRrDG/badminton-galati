// The trial form's browser side (/contact/#formular). The rules and the copy of the errors live
// in lib/trial.ts; this file shows them, sends the request and shows what happened, honestly:
// - the endpoint answers 2xx: the request reached the club;
// - there is no endpoint yet (404, 405, 501, before plan 2b): the request opens as a pre-filled
//   e-mail to the club, and the page says so (it only reaches the club once sent);
// - 400 with errors: the endpoint's errors in the same summary; 429: too many requests;
// - anything else (network, server error): the summary says the site could not send it and
//   offers the same e-mail.
// Without JavaScript none of this runs: the browser checks the required fields and the form's
// action opens the e-mail itself.
import { errorIntro, formatPhoneRo, trialMailto, validateTrial, type TrialError, type TrialField, type TrialInput, type TrialRequest } from '../lib/trial';

type Options = { endpoint: '/api/proba'; email: string };

const FIELDS: readonly TrialField[] = ['nume', 'telefon', 'varsta', 'mesaj', 'acord'];
const NO_ENDPOINT = new Set([404, 405, 501]);
const TIMEOUT_MS = 15000;

/** Builds an element with text only (what a parent typed never becomes markup). */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function isTrialErrors(v: unknown): v is TrialError[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every(e => e && FIELDS.includes(e.field) && typeof e.summary === 'string' && typeof e.message === 'string')
  );
}

export function initTrialForm(form: HTMLFormElement, opts: Options): void {
  const summary = form.querySelector<HTMLElement>('.errsum');
  const sent = form.parentElement?.querySelector<HTMLElement>('.sent');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const intro = form.parentElement?.querySelector<HTMLElement>('.intro');
  if (!summary || !sent || !button) return;
  const replyDays = Number(form.dataset.replyDays) || undefined;
  let sending = false;

  form.noValidate = true;

  const control = (field: TrialField) => form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement | null;
  const wrapper = (field: TrialField) => form.querySelector<HTMLElement>(`[data-field="${field}"]`);

  const read = (): TrialInput => {
    const data = new FormData(form);
    const input: Record<string, unknown> = {};
    for (const name of [...FIELDS, 'site_web']) input[name] = data.get(name) ?? undefined;
    return input as TrialInput;
  };

  function clearErrors(): void {
    summary!.hidden = true;
    summary!.replaceChildren();
    for (const field of FIELDS) {
      const box = wrapper(field);
      const input = control(field);
      const err = box?.querySelector<HTMLElement>('.err');
      box?.classList.remove('bad');
      if (err) err.hidden = true;
      if (input) {
        input.removeAttribute('aria-invalid');
        const hint = box?.querySelector<HTMLElement>('.hint');
        if (hint) input.setAttribute('aria-describedby', hint.id);
        else input.removeAttribute('aria-describedby');
      }
    }
  }

  /** The summary box: a heading, a line and, when given, a link per field or an e-mail link. */
  function showSummary(intro: string, errors: TrialError[], mailto?: string): void {
    summary!.replaceChildren(el('h3', 'Cererea nu a plecat'), el('p', intro));
    if (errors.length > 0) {
      const list = el('ul');
      for (const e of errors) {
        const input = control(e.field);
        const link = el('a', e.summary, { href: `#${input?.id ?? 'formular'}` });
        link.addEventListener('click', event => {
          if (!input) return;
          event.preventDefault();
          input.focus();
          (wrapper(e.field) ?? input).scrollIntoView({ block: 'center' });
        });
        const item = el('li');
        item.append(link);
        list.append(item);
      }
      summary!.append(list);
    }
    if (mailto) {
      const line = el('p');
      line.append(el('a', 'Trimiteți-o pe e-mail', { href: mailto }), ` la ${opts.email}.`);
      summary!.append(line);
    }
    summary!.hidden = false;
    summary!.focus();
  }

  function showErrors(errors: TrialError[]): void {
    clearErrors();
    for (const e of errors) {
      const box = wrapper(e.field);
      const input = control(e.field);
      const err = box?.querySelector<HTMLElement>('.err');
      box?.classList.add('bad');
      if (err) {
        err.querySelector('.msg')!.textContent = e.message;
        err.hidden = false;
      }
      if (input) {
        input.setAttribute('aria-invalid', 'true');
        const ids = [input.getAttribute('aria-describedby'), err?.id].filter(Boolean).join(' ');
        input.setAttribute('aria-describedby', ids);
      }
    }
    showSummary(errorIntro(errors.length), errors);
  }

  /** Swaps the form for the blue box, focused on its heading. */
  function showSent(heading: string, lines: Node[]): void {
    const h = el('h3', heading, { tabindex: '-1' });
    const again = el('button', 'Trimite altă cerere', { type: 'button', class: 'again' });
    again.addEventListener('click', () => {
      form.reset();
      clearErrors();
      sent!.hidden = true;
      sent!.replaceChildren();
      form.hidden = false;
      if (intro) intro.hidden = false;
      control('nume')?.focus();
    });
    const next = el('p', 'Până atunci, aflați ');
    next.append(el('a', 'ce e bine să știți înainte de primul antrenament', { href: '/pentru-parinti/' }), '.');
    sent!.replaceChildren(h, ...lines, next, again);
    form.hidden = true;
    if (intro) intro.hidden = true;
    sent!.hidden = false;
    h.focus();
  }

  function delivered(r: TrialRequest, typedName: string): void {
    const thanks = el('p', `Mulțumim, ${typedName}. Clubul vă contactează la `);
    thanks.append(el('b', formatPhoneRo(r.phone)), ' ca să stabiliți ziua probei.');
    const when = replyDays
      ? el('p', `Vă sunăm în cel mult ${replyDays} zile.`)
      : (() => {
          const tbc = el('p', ' în câte zile răspundeți, ca să putem scrie aici „vă sunăm în cel mult … zile”.', { class: 'tbc' });
          tbc.prepend(el('b', 'De confirmat de club:'));
          return tbc;
        })();
    showSent('Cererea a ajuns la club', [thanks, when]);
  }

  function openedEmail(mailto: string): void {
    const what = el(
      'p',
      'Cererea e scrisă în el. Ajunge la club după ce apăsați „Trimite” în aplicația de e-mail; până atunci, clubul nu o are.',
    );
    const retry = el('p', 'Nu s-a deschis nimic? ');
    const link = el('a', 'Trimiteți-o pe e-mail', { href: mailto });
    retry.append(link, ` sau scrieți-ne la ${opts.email}.`);
    showSent('Am deschis un e-mail către club', [what, retry]);
    link.click();
  }

  async function send(r: TrialRequest, input: TrialInput): Promise<void> {
    const mailto = trialMailto(r, opts.email);
    let res: Response;
    try {
      res = await fetch(opts.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      showSummary('Cererea nu a putut fi trimisă de pe site.', [], mailto);
      return;
    }
    if (res.ok) return delivered(r, String(input.nume ?? '').trim());
    if (NO_ENDPOINT.has(res.status)) return openedEmail(mailto);
    if (res.status === 429) return showSummary('Ați trimis deja câteva cereri. Încercați din nou peste câteva minute.', []);
    if (res.status === 400) {
      const body: unknown = await res.json().catch(() => undefined);
      const errors = (body as { errors?: unknown } | undefined)?.errors;
      if (isTrialErrors(errors)) return showErrors(errors);
    }
    showSummary('Cererea nu a putut fi trimisă de pe site.', [], mailto);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const input = read();
    const result = validateTrial(input);
    if (!result.ok) return showErrors(result.errors);
    clearErrors();
    sending = true;
    button.setAttribute('aria-disabled', 'true');
    try {
      await send(result.value, input);
    } finally {
      sending = false;
      button.removeAttribute('aria-disabled');
    }
  });
}
