// The coloured field that stands in for a missing photo (athletes, coaches).

export type Tone = 'blue' | 'deep' | 'red';

const TONES: Tone[] = ['blue', 'deep', 'red'];

/** The first letter of the first two words, uppercase: "Pazargic Ligia-Beatrice" → "PL". */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toLocaleUpperCase('ro'))
    .join('');
}

/** Neighbouring tiles never share a colour: blue, deep, red, blue, … */
export function toneAt(index: number): Tone {
  return TONES[index % TONES.length];
}
