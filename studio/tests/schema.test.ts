import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { schemaTypes } from '../schemaTypes';
import { slugifyRo } from '../schemaTypes/shared';

type AnyField = {
  name?: string;
  type: string;
  title?: string;
  fields?: AnyField[];
  of?: AnyField[];
  options?: { list?: (string | { value: string })[] };
  initialValue?: unknown;
  readOnly?: unknown;
  validation?: (rule: unknown) => unknown;
};
type AnyDoc = { name: string; type: string; fields: AnyField[] };

const docs = schemaTypes as unknown as AnyDoc[];
const doc = (name: string) => {
  const found = docs.find((d) => d.name === name);
  if (!found) throw new Error(`missing type ${name}`);
  return found;
};
const field = (docName: string, fieldName: string) => {
  const found = doc(docName).fields.find((f) => f.name === fieldName);
  if (!found) throw new Error(`missing field ${docName}.${fieldName}`);
  return found;
};
const listValues = (f: AnyField) =>
  (f.options?.list ?? []).map((item) => (typeof item === 'string' ? item : item.value));

/** Runs a field's validation against a recording Rule and returns the method names it called. */
const ruleCalls = (f: AnyField): string[] => {
  const calls: string[] = [];
  const rule: unknown = new Proxy(
    {},
    {
      get: (_target, prop) => () => {
        calls.push(String(prop));
        return rule;
      },
    },
  );
  f.validation?.(rule);
  return calls;
};

/** Every image field anywhere in the schema, with a readable path. */
const imageFields = (): { path: string; field: AnyField }[] => {
  const out: { path: string; field: AnyField }[] = [];
  const walk = (f: AnyField, path: string) => {
    if (f.type === 'image') out.push({ path, field: f });
    f.fields?.forEach((child) => walk(child, `${path}.${child.name}`));
    f.of?.forEach((member, i) => walk(member, `${path}[${member.name ?? i}]`));
  };
  docs.forEach((d) => d.fields.forEach((f) => walk(f, `${d.name}.${f.name}`)));
  return out;
};

describe('content model', () => {
  it('declares the five document types', () => {
    const names = docs.map((d) => d.name);
    for (const name of ['athlete', 'group', 'competition', 'post', 'siteSettings']) {
      expect(names).toContain(name);
    }
  });

  it('starts athlete consent as false, titled for the parent agreement', () => {
    const consent = field('athlete', 'consent');
    expect(consent.type).toBe('boolean');
    expect(consent.initialValue).toBe(false);
    expect(consent.title).toBe('Acord părinte');
  });

  it('offers exactly the three post kinds', () => {
    expect(listValues(field('post', 'kind'))).toEqual(['competitie', 'viata-clubului', 'proiecte']);
  });

  it('gives every image field a required alt text', () => {
    const images = imageFields();
    // athlete.photo, post.cover, post.gallery[], heroPhoto, whyPhoto, hallPhotos[]
    expect(images.length).toBeGreaterThanOrEqual(6);
    for (const { path, field: img } of images) {
      const alt = img.fields?.find((f) => f.name === 'alt');
      expect(alt, `${path} has no alt`).toBeDefined();
      expect(ruleCalls(alt!), `${path}.alt is not required`).toContain('required');
    }
  });

  it('keeps athlete rankings read-only with the FRB disciplines', () => {
    const rankings = field('athlete', 'rankings');
    expect(rankings.readOnly).toBe(true);
    const item = rankings.of![0]!;
    expect(item.fields!.map((f) => f.name)).toEqual(['category', 'discipline', 'place', 'points']);
    const discipline = item.fields!.find((f) => f.name === 'discipline')!;
    expect(listValues(discipline)).toEqual(['SB', 'SF', 'DB', 'DF', 'DX']);
  });

  it('limits group tracks to performanta and amatori', () => {
    expect(listValues(field('group', 'track'))).toEqual(['performanta', 'amatori']);
  });
});

describe('seed', () => {
  const lines = readFileSync(new URL('../seed/seed.ndjson', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '');
  const seed = lines.map((line) => JSON.parse(line) as Record<string, unknown> & { _id: string; _type: string });
  const ofType = (type: string) => seed.filter((d) => d._type === type);

  it('only uses declared types and top-level fields', () => {
    for (const d of seed) {
      const declared = doc(d._type).fields.map((f) => f.name);
      for (const key of Object.keys(d).filter((k) => !k.startsWith('_'))) {
        expect(declared, `${d._id}.${key}`).toContain(key);
      }
    }
  });

  it('uses public document ids (no dots) and unique ids', () => {
    const ids = seed.map((d) => d._id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).not.toContain('.');
  });

  it('holds the real club facts', () => {
    expect(ofType('athlete')).toHaveLength(3);
    expect(ofType('group')).toHaveLength(5);
    expect(ofType('competition')).toHaveLength(12);
    expect(ofType('post')).toHaveLength(3);
    expect(ofType('siteSettings').map((d) => d._id)).toEqual(['siteSettings']);
  });

  it('derives slugs the way the Studio button does', () => {
    for (const d of [...ofType('athlete'), ...ofType('post')]) {
      const source = (d.name ?? d.title) as string;
      expect((d.slug as { current: string }).current).toBe(slugifyRo(source));
    }
  });

  it('marks only Galați competitions as home', () => {
    for (const c of ofType('competition')) {
      expect(c.home, c.title as string).toBe(c.city === 'Galați');
    }
  });
});
