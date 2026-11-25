import type { Page } from '@playwright/test';
import { BUILD_TODAY } from './servers';

/** 09:00 in Bucharest on `day`. */
export const at = (day: string) => new Date(`${day}T09:00:00+02:00`);

/**
 * Starts the browser clock at 09:00 on `day` and lets it run. The countdown reads the date, so
 * it stays pinned; GSAP's ticker reads Date.now, so a frozen clock (setFixedTime) would stop
 * every animation at its first frame.
 */
export async function pinClock(page: Page, day: string = BUILD_TODAY) {
  await page.clock.install({ time: at(day) });
}
