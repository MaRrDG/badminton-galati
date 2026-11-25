// The trial-training request (/contact/#formular): checking what a parent typed, the Romanian
// messages for what is wrong, and the pre-filled e-mail to the club. Pure and import-free, in
// erasable TypeScript only: the browser form uses it, and plan 2b's endpoint runs this file
// directly on Node to check the same request again.

export type TrialField = 'nume' | 'telefon' | 'varsta' | 'mesaj' | 'acord';
/** The form's fields as they arrive (form data or JSON); `site_web` is the honeypot. */
export type TrialInput = { nume?: unknown; telefon?: unknown; varsta?: unknown; mesaj?: unknown; acord?: unknown; site_web?: unknown };
export type TrialRequest = { name: string; /** 10 digits, starting with 0 */ phone: string; age: number; message?: string };
export type TrialError = { field: TrialField; summary: string; message: string };
export type TrialResult = { ok: true; value: TrialRequest } | { ok: false; errors: TrialError[] };

/** The ages the form accepts for the child, in whole years (named in the field's hint). */
export const AGE_MIN = 3;
export const AGE_MAX = 18;
export const NAME_MAX = 100;
export const MESSAGE_MAX = 1000;

const PHONE_EXAMPLE = 'Scrieți-l cu 10 cifre, de exemplu 0745 123 456.';
const AGE_HINT = `Scrieți vârsta copilului în ani, între ${AGE_MIN} și ${AGE_MAX}.`;

const MESSAGES = {
  nameEmpty: ['Lipsește numele părintelui', 'Scrieți numele dumneavoastră.'],
  nameShort: ['Numele pare incomplet', 'Scrieți numele și prenumele.'],
  nameLong: ['Numele e prea lung', `Scrieți cel mult ${NAME_MAX} de caractere.`],
  phoneEmpty: ['Lipsește telefonul', 'Scrieți un număr la care vă poate suna clubul.'],
  phoneShort: ['Telefonul are prea puține cifre', `Numărul are prea puține cifre. ${PHONE_EXAMPLE}`],
  phoneWrong: ['Telefonul nu pare corect', PHONE_EXAMPLE],
  ageEmpty: ['Lipsește vârsta copilului', AGE_HINT],
  ageWrong: ['Vârsta nu pare corectă', AGE_HINT],
  messageLong: ['Mesajul e prea lung', `Scrieți cel mult ${MESSAGE_MAX} de caractere.`],
  consent: ['Lipsește acordul pentru date', 'Bifați căsuța ca să putem folosi datele pentru a vă contacta.'],
} as const satisfies Record<string, readonly [string, string]>;

const error = (field: TrialField, [summary, message]: readonly [string, string]): TrialError => ({ field, summary, message });
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * A Romanian phone number as 10 digits: spaces, dots, dashes, slashes and parentheses are
 * dropped and a leading +40 or 0040 becomes 0. Anything else is kept, so it fails the check.
 */
export function normalizePhoneRo(raw: string): string {
  const compact = raw.replace(/[\s.\-/()]/g, '');
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

/** Checks a request; the errors come in the form's field order. */
export function validateTrial(input: TrialInput): TrialResult {
  const errors: TrialError[] = [];

  const name = text(input.nume);
  if (name === '') errors.push(error('nume', MESSAGES.nameEmpty));
  else if (name.length < 2) errors.push(error('nume', MESSAGES.nameShort));
  else if (name.length > NAME_MAX) errors.push(error('nume', MESSAGES.nameLong));

  const phone = checkPhone(text(input.telefon));
  if (typeof phone !== 'string') errors.push(phone);

  const age = checkAge(input.varsta);
  if (typeof age !== 'number') errors.push(age);

  const message = text(input.mesaj);
  if (message.length > MESSAGE_MAX) errors.push(error('mesaj', MESSAGES.messageLong));

  const consent = input.acord === true || input.acord === 'on' || input.acord === 'true';
  if (!consent) errors.push(error('acord', MESSAGES.consent));

  if (errors.length > 0 || typeof phone !== 'string' || typeof age !== 'number') return { ok: false, errors };
  return { ok: true, value: { name, phone, age, ...(message ? { message } : {}) } };
}

/** The honeypot `site_web` is hidden from people and assistive tech; only robots fill it. */
export function isSpam(input: TrialInput): boolean {
  return text(input.site_web) !== '';
}

const COUNT_WORDS = ['', 'un lucru', 'două lucruri', 'trei lucruri', 'patru lucruri', 'cinci lucruri'];

/** The line above the list of errors: "Verificați două lucruri:". */
export function errorIntro(n: number): string {
  return `Verificați ${COUNT_WORDS[n] ?? `${n} lucruri`}:`;
}

/** A pre-filled e-mail to the club with the request, for when the site cannot send it. */
export function trialMailto(r: TrialRequest, to: string): string {
  const lines = [`Numele părintelui: ${r.name}`, `Telefon: ${formatPhoneRo(r.phone)}`, `Vârsta copilului: ${r.age} ani`];
  if (r.message) lines.push(`Mesaj: ${r.message}`);
  return `mailto:${to}?subject=${encodeURIComponent('Cerere antrenament de probă')}&body=${encodeURIComponent(lines.join('\n'))}`;
}
