// The trial-training request (/contact/#formular): checking what was typed, the Romanian
// messages for what is wrong, and the pre-filled e-mail to the club. Pure and import-free, in
// erasable TypeScript only: the browser form uses it, and plan 2b's endpoint runs this file
// directly on Node to check the same request again.
//
// Two paths: a parent asks for a child (`cine` = "copil": the child's age is required) or an
// adult asks for themself (`cine` = "eu": no age).

export type TrialWho = 'copil' | 'eu';
export type TrialField = 'cine' | 'nume' | 'telefon' | 'varsta' | 'mesaj' | 'acord';
/** The form's fields as they arrive (form data or JSON); `site_web` is the honeypot. */
export type TrialInput = {
  cine?: unknown; nume?: unknown; telefon?: unknown; varsta?: unknown; mesaj?: unknown; acord?: unknown; site_web?: unknown;
};
export type TrialRequest = {
  who: TrialWho;
  name: string;
  /** 10 digits, starting with 0 */
  phone: string;
  /** The child's age; only on the child path. */
  age?: number;
  message?: string;
};
export type TrialError = { field: TrialField; summary: string; message: string };
export type TrialResult = { ok: true; value: TrialRequest } | { ok: false; errors: TrialError[] };

/** The ages the form accepts for a child, in whole years (named in the field's hint). */
export const AGE_MIN = 3;
export const AGE_MAX = 18;
export const NAME_MAX = 100;
export const MESSAGE_MAX = 1000;
/** The longest mailto URL built: mail apps and browsers cut longer ones (about 2000 characters). */
export const MAILTO_MAX = 1900;
/** The message in the e-mail is cut to at most this many characters (the form keeps all of it). */
export const MAILTO_MESSAGE_MAX = 600;

const PHONE_EXAMPLE = 'Scrieți-l cu 10 cifre, de exemplu 0745 123 456.';
const AGE_HINT = `Scrieți vârsta copilului în ani, între ${AGE_MIN} și ${AGE_MAX}.`;

type Copy = readonly [summary: string, message: string];
const MESSAGES = {
  who: ['Lipsește cine vine la antrenament', 'Alegeți „Copilul meu” sau „Eu”.'],
  nameEmpty: {
    copil: ['Lipsește numele părintelui', 'Scrieți numele dumneavoastră.'],
    eu: ['Lipsește numele', 'Scrieți numele dumneavoastră.'],
  },
  nameShort: ['Numele pare incomplet', 'Scrieți numele și prenumele.'],
  nameLong: ['Numele e prea lung', `Scrieți cel mult ${NAME_MAX} de caractere.`],
  phoneEmpty: ['Lipsește telefonul', 'Scrieți un număr la care vă poate suna clubul.'],
  phoneShort: ['Telefonul are prea puține cifre', `Numărul are prea puține cifre. ${PHONE_EXAMPLE}`],
  phoneWrong: ['Telefonul nu pare corect', PHONE_EXAMPLE],
  ageEmpty: ['Lipsește vârsta copilului', AGE_HINT],
  ageWrong: ['Vârsta nu pare corectă', AGE_HINT],
  messageLong: ['Mesajul e prea lung', `Scrieți cel mult ${MESSAGE_MAX} de caractere.`],
  consent: ['Lipsește acordul pentru date', 'Bifați căsuța ca să putem folosi datele pentru a vă contacta.'],
} as const;

const error = (field: TrialField, [summary, message]: Copy): TrialError => ({ field, summary, message });
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * A Romanian phone number as 10 digits: a "(0)" after +40 or 0040 is dropped, then spaces,
 * dots, dashes, slashes and parentheses, and a leading +40 or 0040 becomes 0. Anything else is
 * kept, so it fails the check.
 */
export function normalizePhoneRo(raw: string): string {
  const compact = raw.trim().replace(/^(\+40|0040)\s*\(0\)/, '$1').replace(/[\s.\-/()]/g, '');
  if (compact.startsWith('+40')) return `0${compact.slice(3)}`;
  if (compact.startsWith('0040')) return `0${compact.slice(4)}`;
  return compact;
}

/** "0745123456" → "0745 123 456"; a number that is not 10 digits comes back as it was given. */
export function formatPhoneRo(phone: string): string {
  const digits = normalizePhoneRo(phone);
  return /^0\d{9}$/.test(digits) ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : phone;
}

function checkPhone(raw: string): TrialError | string {
  const phone = normalizePhoneRo(raw);
  if (phone === '') return error('telefon', MESSAGES.phoneEmpty);
  if (/^\d+$/.test(phone) && phone.length < 10) return error('telefon', MESSAGES.phoneShort);
  if (!/^0\d{9}$/.test(phone)) return error('telefon', MESSAGES.phoneWrong);
  return phone;
}

function checkAge(raw: unknown): TrialError | number {
  const value = typeof raw === 'number' ? String(raw) : text(raw);
  if (value === '') return error('varsta', MESSAGES.ageEmpty);
  const age = /^\d{1,2}$/.test(value) ? Number(value) : NaN;
  if (!(age >= AGE_MIN && age <= AGE_MAX)) return error('varsta', MESSAGES.ageWrong);
  return age;
}

/** Checks a request; the errors come in the form's field order. The age counts only for a child. */
export function validateTrial(input: TrialInput): TrialResult {
  const errors: TrialError[] = [];

  const who = input.cine === 'copil' || input.cine === 'eu' ? input.cine : undefined;
  if (!who) errors.push(error('cine', MESSAGES.who));

  const name = text(input.nume);
  if (name === '') errors.push(error('nume', MESSAGES.nameEmpty[who ?? 'copil']));
  else if (name.length < 2) errors.push(error('nume', MESSAGES.nameShort));
  else if (name.length > NAME_MAX) errors.push(error('nume', MESSAGES.nameLong));

  const phone = checkPhone(text(input.telefon));
  if (typeof phone !== 'string') errors.push(phone);

  const age = who === 'eu' ? undefined : checkAge(input.varsta);
  if (typeof age === 'object') errors.push(age);

  const message = text(input.mesaj);
  if (message.length > MESSAGE_MAX) errors.push(error('mesaj', MESSAGES.messageLong));

  const consent = input.acord === true || input.acord === 'on' || input.acord === 'true';
  if (!consent) errors.push(error('acord', MESSAGES.consent));

  if (errors.length > 0 || !who || typeof phone !== 'string' || typeof age === 'object') return { ok: false, errors };
  return { ok: true, value: { who, name, phone, ...(age !== undefined ? { age } : {}), ...(message ? { message } : {}) } };
}

/** The honeypot `site_web` is hidden from people and assistive tech; only robots fill it. */
export function isSpam(input: TrialInput): boolean {
  return text(input.site_web) !== '';
}

/** The endpoint took the request only when it answers 2xx with `{ "ok": true }`. */
export function trialDelivered(status: number, body: unknown): boolean {
  return status >= 200 && status < 300 && typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true;
}

const COUNT_WORDS = ['', 'un lucru', 'două lucruri', 'trei lucruri', 'patru lucruri', 'cinci lucruri', 'șase lucruri'];

/** The line above the list of errors: "Verificați două lucruri:". */
export function errorIntro(n: number): string {
  return `Verificați ${COUNT_WORDS[n] ?? `${n} lucruri`}:`;
}

/** Cuts `s` to at most `max` characters at a word boundary, ending with "…". */
function cutAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = s.slice(0, max - 1);
  const space = head.lastIndexOf(' ');
  return `${(space > max / 2 ? head.slice(0, space) : head).trimEnd()}…`;
}

/**
 * A pre-filled e-mail to the club with the request, for when the site cannot send it. Lines are
 * joined with CRLF (%0D%0A, RFC 6068). The message is cut at a word (at most
 * `MAILTO_MESSAGE_MAX` characters, less if its encoding would push the URL past `MAILTO_MAX`).
 */
export function trialMailto(r: TrialRequest, to: string): string {
  const head =
    r.who === 'eu'
      ? ['Vine la antrenament: chiar eu', `Nume: ${r.name}`, `Telefon: ${formatPhoneRo(r.phone)}`]
      : [`Numele părintelui: ${r.name}`, `Telefon: ${formatPhoneRo(r.phone)}`, `Vârsta copilului: ${r.age} ani`];
  const build = (message?: string) =>
    `mailto:${to}?subject=${encodeURIComponent('Cerere antrenament de probă')}&body=${encodeURIComponent(
      (message ? [...head, `Mesaj: ${message}`] : head).join('\r\n'),
    )}`;
  if (!r.message) return build();
  let max = MAILTO_MESSAGE_MAX;
  let url = build(cutAtWord(r.message, max));
  while (url.length > MAILTO_MAX && max > 20) {
    max -= 20;
    url = build(cutAtWord(r.message, max));
  }
  return url;
}
