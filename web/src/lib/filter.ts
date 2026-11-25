// The filters of the inner pages work without JavaScript: a radio per value, and CSS that
// reacts to the checked one through :has(). Items carry their values in `data-f` (space
// separated), counts in `data-count-for`.

export type FilterOption = { value: string; label: string; count?: number; countLabel?: string; swatch?: string };

/** Values go into CSS selectors, so only plain slugs are allowed. */
const SAFE = /^[a-z0-9-]+$/;

/**
 * The rules for one filter. `scope` contains the radios (named `name`), the items and the
 * counts; `values` are the filtering values, without the "all" option. `hide` takes other
 * items out of the layout; `dim` fades them where the layout must not reflow. `container`
 * names a wrapper that is hidden when none of its items match. Browsers without :has() get
 * no filter at all, and every item stays visible.
 */
export function filterCss(
  scope: string,
  name: string,
  values: string[],
  opts: { effect: 'hide' | 'dim'; container?: string },
): string {
  for (const v of [name, ...values]) {
    if (!SAFE.test(v)) throw new Error(`filterCss: "${v}" is not a plain slug`);
  }
  const effect = opts.effect === 'hide' ? 'display:none' : 'opacity:.25';
  const rules = values.flatMap(v => {
    const on = `${scope}:has(input[name="${name}"][value="${v}"]:checked)`;
    return [
      `${on} [data-f]:not([data-f~="${v}"]){${effect}}`,
      `${on} [data-count-for]:not([data-count-for="${v}"]){display:none}`,
      `${on} [data-count-for="${v}"]{display:inline}`,
      ...(opts.container ? [`${on} ${opts.container}:not(:has([data-f~="${v}"])){display:none}`] : []),
    ];
  });
  return [...rules, `@supports not selector(:has(*)){${scope} .filter{display:none}}`].join('\n');
}
