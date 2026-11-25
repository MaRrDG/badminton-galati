// The trial form's browser side (/contact/#formular). The rules and the copy of the errors live
// in lib/trial.ts; this file shows them, hands the request on and says honestly what happened.
//
// Without an endpoint (the build's TRIAL_ENDPOINT unset; every build until plan 2b) a valid
// request opens a pre-filled e-mail to the club at once, inside the submit handler (nothing is
// awaited first, so the browser still counts it as the visitor's action), and the page says the
// request reaches the club only once that e-mail is sent. No request goes over the network.
//
// With an endpoint the request is POSTed first:
// - 2xx with `{ ok: true }`: the request reached the club;
// - 400 with errors: the endpoint's errors in the same summary; 429: too many requests;
// - anything else (network, server error, an unexpected answer): the summary says the site
//   could not send it and offers the same e-mail.
//
// Without JavaScript none of this runs: the browser checks the required fields and the form's
// action opens the e-mail itself.
import {
  errorIntro, formatPhoneRo, trialDelivered, trialMailto, validateTrial,
  type TrialError, type TrialField, type TrialInput, type TrialRequest,
} from '../lib/trial';

type Options = { endpoint?: string; email: string };

const FIELDS: readonly TrialField[] = ['cine', 'nume', 'telefon', 'varsta', 'mesaj', 'acord'];
const TIMEOUT_MS = 15000;

/** Builds an element with text only (what a visitor typed never becomes markup). */
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
  const col = form.parentElement;
  const summary = form.querySelector<HTMLElement>('.errsum');
  const sent = col?.querySelector<HTMLElement>('.sent');
  const intro = col?.querySelector<HTMLElement>('.intro');
  if (!summary || !sent) return;
  const replyDays = Number(form.dataset.replyDays) || undefined;
  let sending = false;

  form.noValidate = true;

  /** The inputs of a field (two radios for `cine`); the first is the one to focus. */
  const controls = (field: TrialField) => [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`)];
  const wrapper = (field: TrialField) => form.querySelector<HTMLElement>(`[data-field="${field}"]`);
  const focusable = (field: TrialField) => {
    const list = controls(field);
    return list.find(c => (c as HTMLInputElement).checked) ?? list[0];
  };

  // Mirrors the chosen path for browsers without :has() (the CSS reads either).
  const syncWho = () => {
    form.dataset.who = (form.elements.namedItem('cine') as RadioNodeList | null)?.value || 'copil';
  };
  form.addEventListener('change', event => {
    if ((event.target as HTMLInputElement).name === 'cine') syncWho();
  });
  syncWho();

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
      const err = box?.querySelector<HTMLElement>('.err');
      const hint = box?.querySelector<HTMLElement>('.hint');
      box?.classList.remove('bad');
      if (err) err.hidden = true;
      for (const input of controls(field)) {
        input.removeAttribute('aria-invalid');
        if (hint) input.setAttribute('aria-describedby', hint.id);
        else input.removeAttribute('aria-describedby');
      }
    }
  }

  /** The summary box: a heading, a line and, when given, a link per field or an e-mail link. Takes the focus. */
  function showSummary(line: string, errors: TrialError[], mailto?: string): void {
    summary!.replaceChildren(el('h3', 'Cererea nu a plecat'), el('p', line));
    if (errors.length > 0) {
      const list = el('ul');
      for (const e of errors) {
        const target = focusable(e.field);
        const link = el('a', e.summary, { href: `#${target?.id ?? 'formular'}` });
        link.addEventListener('click', event => {
          if (!target) return;
          event.preventDefault();
          target.focus();
          (wrapper(e.field) ?? target).scrollIntoView({ block: 'center' });
        });
        const item = el('li');
        item.append(link);
        list.append(item);
      }
      summary!.append(list);
    }
    if (mailto) {
      const p = el('p');
      p.append(el('a', 'Trimiteți-o pe e-mail', { href: mailto }), ` la ${opts.email}.`);
      summary!.append(p);
    }
    summary!.hidden = false;
    summary!.focus();
  }

  function showErrors(errors: TrialError[]): void {
    clearErrors();
    for (const e of errors) {
      const box = wrapper(e.field);
      const err = box?.querySelector<HTMLElement>('.err');
      box?.classList.add('bad');
      if (err) {
        err.querySelector('.msg')!.textContent = e.message;
        err.hidden = false;
      }
      for (const input of controls(e.field)) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), err?.id].filter(Boolean).join(' '));
      }
    }
    showSummary(errorIntro(errors.length), errors);
  }

  /** Swaps the form for the blue box and focuses its heading. */
  function showSent(heading: string, lines: Node[]): void {
    const h = el('h3', heading, { tabindex: '-1' });
    const again = el('button', 'Trimite altă cerere', { type: 'button', class: 'again' });
    again.addEventListener('click', () => {
      form.reset();
      syncWho();
      clearErrors();
      sent!.hidden = true;
      sent!.replaceChildren();
      form.hidden = false;
      if (intro) intro.hidden = false;
      focusable('cine')?.focus();
    });
    const next = el('p', 'Până atunci, aflați ');
    next.append(el('a', 'ce e bine să știți înainte de primul antrenament', { href: '/pentru-parinti/' }), '.');
    sent!.replaceChildren(h, ...lines, next, again);
    form.hidden = true;
    if (intro) intro.hidden = true;
    sent!.hidden = false;
    h.focus();
  }

  function delivered(r: TrialRequest): void {
    const thanks = el('p', `Mulțumim, ${r.name}. Clubul vă contactează la `);
    thanks.append(el('b', formatPhoneRo(r.phone)), ' ca să stabiliți ziua probei.');
    let when: HTMLElement;
    if (replyDays) when = el('p', `Vă sunăm în cel mult ${replyDays} zile.`);
    else {
      when = el('p', ' în câte zile răspundeți, ca să putem scrie aici „vă sunăm în cel mult … zile”.', { class: 'tbc' });
      when.prepend(el('b', 'De confirmat de club:'));
    }
    showSent('Cererea a ajuns la club', [thanks, when]);
  }

  /** Opens the e-mail now (still inside the visitor's click) and says what that means. */
  function openEmail(r: TrialRequest): void {
    const mailto = trialMailto(r, opts.email);
    const what = el('p', 'Cererea e scrisă în el. Ajunge la club după ce apăsați „Trimite” în aplicația de e-mail; până atunci, clubul nu o are.');
    const retry = el('p', 'Nu s-a deschis nimic? ');
    const link = el('a', 'Trimiteți-o pe e-mail', { href: mailto });
    retry.append(link, ` sau scrieți-ne la ${opts.email}.`);
    showSent('Am deschis un e-mail către club', [what, retry]);
    link.click();
  }

  async function post(endpoint: string, r: TrialRequest, input: TrialInput): Promise<void> {
    const failed = () => showSummary('Cererea nu a putut fi trimisă de pe site.', [], trialMailto(r, opts.email));
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return failed();
    }
    const body: unknown = await res.json().catch(() => undefined);
    if (trialDelivered(res.status, body)) return delivered(r);
    if (res.status === 429) return showSummary('Ați trimis deja câteva cereri. Încercați din nou peste câteva minute.', []);
    const errors = res.status === 400 ? (body as { errors?: unknown } | undefined)?.errors : undefined;
    if (isTrialErrors(errors)) return showErrors(errors);
    failed();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (sending) return;
    const input = read();
    const result = validateTrial(input);
    if (!result.ok) return showErrors(result.errors);
    clearErrors();
    if (!opts.endpoint) return openEmail(result.value);
    sending = true;
    void post(opts.endpoint, result.value, input).finally(() => {
      sending = false;
    });
  });
}
