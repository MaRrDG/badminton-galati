import { describe, expect, test } from 'vitest';
import { catchPoint, makeLayout, NET } from '../../src/lib/rally/court';
import { fly, launch, speedFor } from '../../src/lib/rally/flight';
import { Rally } from '../../src/lib/rally/rally';

describe('shuttle flight', () => {
  test('a clear comes down much steeper and slower than it went up', () => {
    const [vx, vy] = launch(4200, 50, 1);
    const p = fly(0, 300, vx, vy, 600);
    const last = p.n - 1;
    const down = Math.atan2(p.vy[last], p.vx[last]) * (180 / Math.PI);
    expect(down).toBeGreaterThan(70);
    expect(Math.hypot(p.vx[last], p.vy[last])).toBeLessThan(4200 / 4);
  });

  test('the speed solver lands a shot on its target', () => {
    const v = speedFor(100, 300, 40, 900, 599, 600)!;
    const [vx, vy] = launch(v, 40, 1);
    const p = fly(100, 300, vx, vy, 600);
    expect(Math.abs(p.x[p.n - 1] - 900)).toBeLessThan(12);
  });
});

describe('rally', () => {
  for (const name of ['wide', 'tall'] as const)
    for (const seed of [7, 2026]) test(`${name}, seed ${seed}: two minutes of play stay sound`, () => {
      const L = makeLayout(name);
      const rally = new Rally(L, seed);
      const mid = L.netX + NET.width / 2;
      let crossings = 0, side = 0, caught = 0;
      for (let i = 0; i < 60 * 120; i++) {
        rally.advance(1 / 60);
        const f = rally.frame();
        expect([...f.players[0], ...f.players[1], f.shuttle, f.shade].join(' ')).not.toMatch(/NaN|Infinity/);
        const now = Math.sign(f.at[0] - mid);
        if (!f.shuttle.includes('-999') && now && now !== side) { if (side) crossings++; side = now; }
        if (f.bulge) caught++;
      }
      expect(rally.hits).toBeGreaterThan(40);
      expect(crossings).toBeGreaterThan(30);
      // The racket head is on the shuttle at every hit.
      expect(rally.worstContact).toBeLessThan(6);
      // Every shot clears the tape, stays in the picture and comes down in court.
      expect(rally.strays).toBe(0);
      // The joke of the page happens, but only now and then.
      expect(rally.faults).toBeGreaterThanOrEqual(3);
      expect(rally.faults).toBeLessThan(rally.hits / 5);
      expect(caught).toBeGreaterThan(0);
    });

  test('the still frame holds the shuttle inside the 0', () => {
    const L = makeLayout('wide');
    const f = new Rally(L).frame();
    const [cx, cy] = catchPoint(L);
    expect(Math.hypot(f.at[0] - cx, f.at[1] - cy)).toBeLessThan(12);
    expect(f.bulge).not.toBeNull();
  });
});
