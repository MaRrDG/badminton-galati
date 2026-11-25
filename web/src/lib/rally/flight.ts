// Shuttle ballistics. A shuttlecock is all drag: it leaves the racket fast, loses most of its
// speed within a few metres and comes down far steeper than it went up. Gravity plus drag
// proportional to the square of the speed gives exactly that shape.
// Scale: about 130 units per metre, so the numbers below are the real ones.

/** Gravity, units/s². */
export const G = 1274;
/**
 * Drag per unit of distance; terminal speed √(G/K) is about 6.8 m/s. Dividing K by a factor
 * enlarges every trajectory by that factor without changing its shape, which is how a layout
 * fits flights to the size of its court.
 */
export const K = 0.00163;

const DT = 1 / 200;
const RAD = Math.PI / 180;

/** A flight sampled at a fixed step until it meets the floor. */
export interface Path {
  dt: number;
  n: number;
  x: Float64Array;
  y: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
}

function accel(vx: number, vy: number, drag: number): [number, number] {
  const k = drag * Math.hypot(vx, vy);
  return [-k * vx, G - k * vy];
}

/** One midpoint step; returns the new state in `s`. */
function step(s: [number, number, number, number], drag: number): void {
  const [ax, ay] = accel(s[2], s[3], drag);
  const mx = s[2] + ax * DT * 0.5, my = s[3] + ay * DT * 0.5;
  const [bx, by] = accel(mx, my, drag);
  s[0] += mx * DT;
  s[1] += my * DT;
  s[2] += bx * DT;
  s[3] += by * DT;
}

/** Launch velocity for a speed and an angle above the horizontal, toward `dir` (±1). */
export function launch(speed: number, angle: number, dir: number): [number, number] {
  return [dir * speed * Math.cos(angle * RAD), -speed * Math.sin(angle * RAD)];
}

/** Flies from (x, y) until the floor (at most `seconds`). */
export function fly(x: number, y: number, vx: number, vy: number, floor: number, drag = K, seconds = 5): Path {
  const max = Math.ceil(seconds / DT) + 1;
  const p: Path = { dt: DT, n: 0, x: new Float64Array(max), y: new Float64Array(max), vx: new Float64Array(max), vy: new Float64Array(max) };
  const s: [number, number, number, number] = [x, y, vx, vy];
  for (let i = 0; i < max; i++) {
    p.x[i] = s[0]; p.y[i] = Math.min(s[1], floor); p.vx[i] = s[2]; p.vy[i] = s[3];
    p.n = i + 1;
    if (s[1] >= floor && i > 0) break;
    step(s, drag);
  }
  return p;
}

/** Position and velocity `t` seconds into the path, written to `out` as [x, y, vx, vy]. */
export function sampleAt(p: Path, t: number, out: number[]): number[] {
  const f = Math.max(0, Math.min(p.n - 1, t / p.dt));
  const i = Math.min(p.n - 2, Math.floor(f)), u = f - i;
  if (p.n < 2) { out[0] = p.x[0]; out[1] = p.y[0]; out[2] = p.vx[0]; out[3] = p.vy[0]; return out; }
  out[0] = p.x[i] + (p.x[i + 1] - p.x[i]) * u;
  out[1] = p.y[i] + (p.y[i + 1] - p.y[i]) * u;
  out[2] = p.vx[i] + (p.vx[i + 1] - p.vx[i]) * u;
  out[3] = p.vy[i] + (p.vy[i + 1] - p.vy[i]) * u;
  return out;
}

/** Height (y) at which a launch crosses the vertical line x = `tx`; Infinity if it lands first. */
function yAtX(x: number, y: number, vx: number, vy: number, tx: number, floor: number, drag: number): number {
  const s: [number, number, number, number] = [x, y, vx, vy];
  const dir = Math.sign(tx - x) || 1;
  for (let i = 0; i < 1400; i++) {
    const px = s[0], py = s[1];
    step(s, drag);
    if ((s[0] - tx) * dir >= 0) return py + ((s[1] - py) * (tx - px)) / (s[0] - px);
    if (s[1] >= floor || s[2] * dir <= 1) return Infinity;
  }
  return Infinity;
}

/** The speed that carries a launch at `angle` through (tx, ty), or null when no speed can. */
export function speedFor(x: number, y: number, angle: number, tx: number, ty: number, floor: number, drag = K): number | null {
  const dir = Math.sign(tx - x) || 1;
  let lo = 60, hi = 40000;
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2;
    const [vx, vy] = launch(mid, angle, dir);
    if (yAtX(x, y, vx, vy, tx, floor, drag) > ty) lo = mid; else hi = mid;
  }
  const [vx, vy] = launch(hi, angle, dir);
  return Math.abs(yAtX(x, y, vx, vy, tx, floor, drag) - ty) < 3 ? hi : null;
}

/** The flattest angle that carries a launch at `speed` through (tx, ty), or null. */
export function angleFor(x: number, y: number, speed: number, tx: number, ty: number, floor: number, drag = K): number | null {
  const dir = Math.sign(tx - x) || 1;
  let lo = -45, hi = 40;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const [vx, vy] = launch(speed, mid, dir);
    if (yAtX(x, y, vx, vy, tx, floor, drag) > ty) lo = mid; else hi = mid;
  }
  const [vx, vy] = launch(speed, hi, dir);
  return Math.abs(yAtX(x, y, vx, vy, tx, floor, drag) - ty) < 3 ? hi : null;
}
