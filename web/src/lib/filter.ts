// The filters of the inner pages work without JavaScript: a radio per value, and CSS that
// reacts to the checked one through :has(). Items carry their values in `data-f` (space
// separated), counts in `data-count-for`.

export type FilterOption = { value: string; label: string; count?: number; countLabel?: string; swatch?: string };

/**
 * How far `dim` fades the other items. Faded text must keep at least 3:1 on every surface it sits
 * on (owner's ruling: dimmed items stay readable; tokens.test.ts computes it from the tokens), so
 * the fade is mild and grayscale is the cue that does not rely on contrast.
 */
export const DIM_OPACITY = 0.8;

/** Values go into CSS selectors, so only plain slugs are allowed. */
const SAFE = /^[a-z0-9-]+$/;

function assertSlugs(values: string[]): void {
  for (const v of values) {
    if (!SAFE.test(v)) throw new Error(`filter: "${v}" is not a plain slug`);
  }
}

/**
 * The rules for one filter. `scope` contains the radios (named `name`), the items and the
 * counts; `values` are the filtering values, without the "all" option. `hide` takes other
 * items out of the layout; `dim` fades them and takes their colour (`DIM_OPACITY`, grayscale) where
 * the layout must not reflow. `container`
 * names a wrapper that is hidden when none of its items match; with `containerMedia` (a media
 * query such as '(max-width: 860px)') only there. Browsers without :has() get
 * no filter at all, and every item stays visible.
 * `name` and every value must be lowercase slugs (`/^[a-z0-9-]+$/`): pages that take values from
 * content (e.g. "U17") slugify them first; a non-slug value fails the build on purpose.
 */
export function filterCss(
  scope: string,
  name: string,
  values: string[],
  opts: { effect: 'hide' | 'dim'; container?: string; containerMedia?: string },
): string {
  assertSlugs([name, ...values]);
  const inMedia = (rule: string) => (opts.containerMedia ? `@media ${opts.containerMedia}{${rule}}` : rule);
  const effect = opts.effect === 'hide' ? 'display:none' : `opacity:${DIM_OPACITY};filter:grayscale(1)`;
  const rules = values.flatMap(v => {
    const on = `${scope}:has(input[name="${name}"][value="${v}"]:checked)`;
    return [
      `${on} [data-f]:not([data-f~="${v}"]){${effect}}`,
      `${on} [data-count-for]:not([data-count-for="${v}"]){display:none}`,
      `${on} [data-count-for="${v}"]{display:inline}`,
      ...(opts.container ? [inMedia(`${on} ${opts.container}:not(:has([data-f~="${v}"])){display:none}`)] : []),
    ];
  });
  return [...rules, `@supports not selector(:has(*)){${scope} .filter{display:none}}`].join('\n');
}

/**
 * The inline CSS of a FilterBar: the first option is "all" (it filters nothing, and its count
 * shows before any choice and without :has()); the others go through filterCss. Every option
 * value is checked, the first one too, since all of them end up in the page's CSS.
 */
export function filterBarCss(
  scope: string,
  name: string,
  options: FilterOption[],
  opts: { effect: 'hide' | 'dim'; container?: string; containerMedia?: string; status?: boolean },
): string {
  assertSlugs([name, ...options.map(o => o.value)]);
  const [all, ...rest] = options;
  const base = opts.status && all ? [`${scope} [data-count-for]:not([data-count-for="${all.value}"]){display:none}`] : [];
  return [...base, filterCss(scope, name, rest.map(o => o.value), opts)].join('\n');
}
