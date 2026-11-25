// Romanian counts: plurals, the "de" after large numbers, and feminine number words.

/** Romanian takes "de" when the last two digits are 00 or 20–99: "19 zile", "20 de zile". */
function takesDe(n: number): boolean {
  const lastTwo = n % 100;
  return lastTwo === 0 || lastTwo >= 20;
}

/** The words after a count: "sportiv" for 1, "sportivi" for 19, "de sportivi" for 20. */
export function unitRo(n: number, one: string, many: string): string {
  if (n === 1) return one;
  return takesDe(n) ? `de ${many}` : many;
}

/** "1 sportiv", "3 sportivi", "20 de sportivi", "101 sportivi". */
export function countRo(n: number, one: string, many: string): string {
  return `${n} ${unitRo(n, one, many)}`;
}

/** Feminine number words from one to ten; above ten the count is in digits. */
const FEMININE_WORDS = ['o', 'două', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă', 'zece'];

/** "o competiție", "două competiții", "zece competiții", "11 competiții", "20 de competiții". */
export function feminineCountRo(n: number, one: string, many: string): string {
  const word = FEMININE_WORDS[n - 1];
  if (!word) return countRo(n, one, many);
  return `${word} ${n === 1 ? one : many}`;
}
