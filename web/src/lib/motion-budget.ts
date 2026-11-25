// Whether a load-time intro may still play once the motion code has arrived. GSAP comes in a
// chunk fetched on demand; on a slow connection the page has long painted its final state by
// then, and an intro starting from its start state would make it snap back and animate again.

/** How late (ms after the page script started) the motion code may arrive for a load intro to play. */
export const LOAD_INTRO_BUDGET_MS = 1000;

/** True when the motion code that resolved at `resolvedAt` came within `budget` of `startedAt` (both `performance.now()`). */
export function introOnTime(startedAt: number, resolvedAt: number, budget: number = LOAD_INTRO_BUDGET_MS): boolean {
  return resolvedAt - startedAt <= budget;
}
