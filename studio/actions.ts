import { useToast } from '@sanity/ui/toast';
import { useState } from 'react';
import { type DocumentActionComponent, type DocumentActionsResolver, useClient, useDocumentOperation } from 'sanity';
import { isGalati, slugifyRo } from './schemaTypes/shared';

/**
 * Fields a coach never fills by hand, written by the publish button just before publishing:
 * - `slug` of posts and athletes, from the title or name with the project's slug rule
 *   (`slugifyRo`), only when the document has none. An existing slug is never changed, so
 *   published URLs stay stable.
 * - `home` of competitions, true exactly when the city is Galați.
 */
const SLUG_SOURCE: Record<string, string> = { post: 'title', athlete: 'name' };
export const AUTO_FIELD_TYPES = ['post', 'athlete', 'competition'];
const SLUG_MAX = 96;
const API_VERSION = '2025-02-19';

type Doc = Record<string, unknown> & { _type: string; slug?: { current?: string } | null };

/** The slug to store for a document without one, or undefined when it has one or no title yet. */
export function slugBase(doc: Doc): string | undefined {
  const source = SLUG_SOURCE[doc._type];
  if (!source || doc.slug?.current) return undefined;
  const value = doc[source];
  return (typeof value === 'string' && slugifyRo(value)) || undefined;
}

/** `base`, or `base-2`, `base-3`… when another document of the type already uses it. */
export function freeSlug(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, '')}${suffix}`;
    if (!taken.includes(candidate)) return candidate;
  }
}

/** The fields to set before publishing; empty when nothing needs to change. */
export function autoFields(doc: Doc, taken: readonly string[] = []): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  const base = slugBase(doc);
  if (base) set.slug = { _type: 'slug', current: freeSlug(base, taken) };
  if (doc._type === 'competition') {
    const home = isGalati(doc.city as string | undefined);
    if (doc.home !== home) set.home = home;
  }
  return set;
}

/**
 * Writes the automatic fields into the draft. Runs before the built-in publish: the patch is
 * applied locally at once, and Sanity's publish operation commits pending patches and waits
 * until the server has them before publishing, so the published document includes them.
 */
export async function prepareForPublish(
  doc: Doc,
  io: { takenSlugs: (base: string) => Promise<string[]>; patch: (set: Record<string, unknown>) => void },
): Promise<Record<string, unknown>> {
  const base = slugBase(doc);
  const set = autoFields(doc, base ? await io.takenSlugs(base) : []);
  if (Object.keys(set).length > 0) io.patch(set);
  return set;
}

/** Slugs of other documents of the type that start with `base` (drafts included). */
const TAKEN_SLUGS = `*[_type == $type && !(_id in [$id, "drafts." + $id]) && string::startsWith(slug.current, $base)].slug.current`;

const wrapped = new WeakMap<DocumentActionComponent, DocumentActionComponent>();

/** The built-in publish action, with the automatic fields written first. */
export function withAutoFields(publish: DocumentActionComponent): DocumentActionComponent {
  const cached = wrapped.get(publish);
  if (cached) return cached;
  const AutoFieldsPublishAction: DocumentActionComponent = (props) => {
    const original = publish(props);
    const { patch } = useDocumentOperation(props.id, props.type);
    const client = useClient({ apiVersion: API_VERSION });
    const toast = useToast();
    const [preparing, setPreparing] = useState(false);
    if (!original) return original;
    return {
      ...original,
      disabled: original.disabled || preparing,
      onHandle: async () => {
        const doc = (props.draft ?? props.published) as Doc | null;
        if (doc) {
          setPreparing(true);
          try {
            await prepareForPublish(doc, {
              takenSlugs: (base) =>
                client.fetch<string[]>(TAKEN_SLUGS, { type: props.type, id: props.id, base }, { perspective: 'raw' }),
              patch: (set) => patch.execute([{ set }]),
            });
          } catch {
            toast.push({
              status: 'error',
              title: 'Nu am putut publica',
              description: 'Verifică legătura la internet și apasă din nou „Publică”.',
            });
            return;
          } finally {
            setPreparing(false);
          }
        }
        original.onHandle?.();
      },
    };
  };
  AutoFieldsPublishAction.action = publish.action;
  AutoFieldsPublishAction.displayName = 'AutoFieldsPublishAction';
  wrapped.set(publish, AutoFieldsPublishAction);
  return AutoFieldsPublishAction;
}

/**
 * Posts, athletes and competitions publish through `withAutoFields`. They also lose
 * "Duplicate": a copy would carry the original's slug, which the coach cannot see or change.
 */
export const documentActions: DocumentActionsResolver = (prev, { schemaType }) =>
  AUTO_FIELD_TYPES.includes(schemaType)
    ? prev
        .filter((action) => action.action !== 'duplicate')
        .map((action) => (action.action === 'publish' ? withAutoFields(action) : action))
    : prev;
