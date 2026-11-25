// A player as a flat, jointed silhouette. A pose is a handful of numbers (where the hips are,
// how the torso leans, where the feet stand, the angles of the arms); this module turns it into
// one transform per body part. Every part is drawn along its own +x axis from its joint.
//
// Angles are in degrees in the player's own frame: 0 points forward (toward the net), 90 up.

const RAD = Math.PI / 180;

export const BODY = { thigh: 54, shin: 52, ankle: 9, torso: 68, upper: 36, fore: 34, racket: 74 } as const;

export interface Foot {
  x: number;
  /** Height of the sole above the floor. */
  lift: number;
  /** Toe-down tilt in degrees. */
  tilt: number;
}

export interface Pose {
  x: number;
  floor: number;
  /** +1 faces right, -1 faces left. */
  f: number;
  /** Height of the hips above the floor, before any jump. */
  hip: number;
  jump: number;
  /** Forward lean of the torso from vertical. */
  lean: number;
  /** Racket arm: upper arm, forearm, racket. */
  arm: [number, number, number];
  /** Free arm: upper arm, forearm. */
  off: [number, number];
  /** Racket-side foot, then the other. */
  feet: [Foot, Foot];
}

/** A tapered limb with round joints, from (0,0) to (len,0). */
function limb(len: number, w0: number, w1: number): string {
  const a = w0 / 2, b = w1 / 2;
  return `<path d="M0,${-a}L${len},${-b}A${b},${b} 0 0 1 ${len},${b}L0,${a}A${a},${a} 0 0 1 0,${-a}Z"/>`;
}

/** Body parts in paint order: the far arm and leg first, the racket arm last. */
export const PARTS: { name: string; tone: string; html: string }[] = [
  { name: 'shadow', tone: 'shade', html: '<ellipse rx="62" ry="5"/>' },
  { name: 'off-upper', tone: 'far', html: limb(BODY.upper, 16, 13) },
  { name: 'off-sleeve', tone: 'kit-far', html: limb(17, 20, 18) },
  { name: 'off-fore', tone: 'far', html: limb(BODY.fore, 13, 11) },
  { name: 'far-thigh', tone: 'far', html: limb(BODY.thigh, 29, 21) },
  { name: 'far-shin', tone: 'far', html: limb(BODY.shin, 20, 13) },
  { name: 'far-foot', tone: 'shoe', html: '<path d="M-9,-7H7L27,4V9H-9Z"/>' },
  { name: 'far-short', tone: 'shorts-far', html: limb(27, 33, 28) },
  { name: 'head', tone: 'skin', html: '<path d="M-8,-7H2V7H-8Z"/><circle cx="12" cy="1.5" r="15.5"/>' },
  { name: 'torso', tone: 'kit', html: '<path d="M-4,-16L44,-20L64,-18L72,-9V11L62,19L30,18L-4,15Z"/>' },
  { name: 'hip', tone: 'shorts', html: '<path d="M-17,-13L-9,-18H13V17H-9L-17,12Z"/>' },
  { name: 'near-thigh', tone: 'skin', html: limb(BODY.thigh, 30, 22) },
  { name: 'near-shin', tone: 'skin', html: limb(BODY.shin, 21, 13) },
  { name: 'near-foot', tone: 'shoe', html: '<path d="M-9,-7H7L27,4V9H-9Z"/>' },
  { name: 'near-short', tone: 'shorts', html: limb(28, 34, 29) },
  {
    name: 'racket',
    tone: 'racket',
    html:
      '<path class="grip" d="M-9,-3.6H15V3.6H-9Z"/><path class="shaft" d="M15,0H55"/>' +
      '<path class="strings" d="M62,-11V11M70,-14V14M78,-14V14M86,-11V11M56,-5H92M55,0H93M56,5H92"/>' +
      '<ellipse class="frame" cx="74" cy="0" rx="19.5" ry="14.5"/>',
  },
  { name: 'upper', tone: 'skin', html: limb(BODY.upper, 17, 14) },
  { name: 'sleeve', tone: 'kit', html: limb(18, 21, 19) },
  { name: 'fore', tone: 'skin', html: limb(BODY.fore, 14, 11) + '<circle cx="34" cy="0" r="7"/>' },
];

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Points a solved pose exposes to the rally: racket head centre, free hand, racket shoulder. */
export interface Joints {
  head: [number, number];
  hand: [number, number];
  shoulder: [number, number];
}

/** Knee of a leg from hip to ankle; pulls the ankle in when the leg cannot reach it. */
function knee(hx: number, hy: number, a: [number, number], f: number): [number, number] {
  const { thigh: L1, shin: L2 } = BODY;
  let dx = a[0] - hx, dy = a[1] - hy, d = Math.hypot(dx, dy);
  const max = L1 + L2 - 0.6;
  if (d > max) {
    a[0] = hx + (dx * max) / d; a[1] = hy + (dy * max) / d;
    dx = a[0] - hx; dy = a[1] - hy; d = max;
  }
  d = Math.max(d, 12);
  const along = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, L1 * L1 - along * along));
  const ux = dx / d, uy = dy / d;
  // The knee bends forward: of the two solutions take the one further toward the net.
  const kx = hx + ux * along - uy * off, ky = hy + uy * along + ux * off;
  const kx2 = hx + ux * along + uy * off, ky2 = hy + uy * along - ux * off;
  return kx * f >= kx2 * f ? [kx, ky] : [kx2, ky2];
}

/**
 * Arm angles that put the racket head on (tx, ty) with the racket at angle `phi`, from the
 * shoulder (sx, sy). When that is out of reach the arm and racket stretch straight at the target.
 */
export function reach(sx: number, sy: number, tx: number, ty: number, phi: number, f: number): [number, number, number] {
  const { upper: L1, fore: L2, racket: R } = BODY;
  const lx = f * (tx - sx), ly = sy - ty;
  let hx = lx - R * Math.cos(phi * RAD), hy = ly - R * Math.sin(phi * RAD);
  let d = Math.hypot(hx, hy);
  if (d > L1 + L2 - 1) {
    const total = Math.hypot(lx, ly), a = Math.atan2(ly, lx);
    phi = a / RAD;
    d = Math.min(L1 + L2 - 1, Math.max(10, total - R));
    hx = d * Math.cos(a); hy = d * Math.sin(a);
  }
  d = Math.max(d, 10);
  const along = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, L1 * L1 - along * along));
  const ux = hx / d, uy = hy / d;
  // Elbow below the line from shoulder to hand.
  const s = ux >= 0 ? -1 : 1;
  const ex = ux * along - uy * off * s, ey = uy * along + ux * off * s;
  return [Math.atan2(ey, ex) / RAD, Math.atan2(hy - ey, hx - ex) / RAD, phi];
}

/** Writes one transform per part of PARTS into `out` and returns the joints the rally needs. */
export function solve(p: Pose, out: string[], joints: Joints): Joints {
  const f = p.f;
  const flip = f < 0 ? ' scale(1 -1)' : '';
  let i = 0;
  const put = (x: number, y: number, deg: number) => {
    out[i++] = `translate(${r1(x)} ${r1(y)}) rotate(${r1(deg)})${flip}`;
  };
  /** Places a part at (x, y) pointing along local angle `a`; returns its end at `len`. */
  const part = (x: number, y: number, a: number, len: number): [number, number] => {
    const dx = f * Math.cos(a * RAD), dy = -Math.sin(a * RAD);
    put(x, y, Math.atan2(dy, dx) / RAD);
    return [x + dx * len, y + dy * len];
  };

  const hx = p.x, hy = p.floor - p.hip - p.jump;
  const ta = 90 - p.lean;
  const tx = f * Math.cos(ta * RAD), ty = -Math.sin(ta * RAD);
  const sx = hx + tx * (BODY.torso - 5), sy = hy + ty * (BODY.torso - 5);

  out[i++] = `translate(${r1(p.x)} ${p.floor + 12}) scale(${r1(1 - Math.min(0.5, p.jump / 120))})`;

  const elbow2 = part(sx - f * 2, sy, p.off[0], BODY.upper);
  put(sx - f * 2, sy, Math.atan2(-Math.sin(p.off[0] * RAD), f * Math.cos(p.off[0] * RAD)) / RAD);
  const hand2 = part(elbow2[0], elbow2[1], p.off[1], BODY.fore);

  for (const k of [1, 0]) {
    const foot = p.feet[k];
    const ankle: [number, number] = [foot.x, p.floor - BODY.ankle - foot.lift - p.jump];
    const kn = knee(hx, hy, ankle, f);
    if (k === 1) {
      put(hx, hy, Math.atan2(kn[1] - hy, kn[0] - hx) / RAD);
      put(kn[0], kn[1], Math.atan2(ankle[1] - kn[1], ankle[0] - kn[0]) / RAD);
      out[i++] = `translate(${r1(ankle[0])} ${r1(ankle[1])}) scale(${f} 1) rotate(${r1(foot.tilt)})`;
      put(hx, hy, Math.atan2(kn[1] - hy, kn[0] - hx) / RAD);
      // Head, torso and hips sit between the two legs in paint order.
      part(hx + tx * BODY.torso, hy + ty * BODY.torso, ta - 4, 0);
      part(hx, hy, ta, 0);
      part(hx, hy, ta, 0);
    } else {
      put(hx, hy, Math.atan2(kn[1] - hy, kn[0] - hx) / RAD);
      put(kn[0], kn[1], Math.atan2(ankle[1] - kn[1], ankle[0] - kn[0]) / RAD);
      out[i++] = `translate(${r1(ankle[0])} ${r1(ankle[1])}) scale(${f} 1) rotate(${r1(foot.tilt)})`;
      put(hx, hy, Math.atan2(kn[1] - hy, kn[0] - hx) / RAD);
    }
  }

  const ex = sx + f * Math.cos(p.arm[0] * RAD) * BODY.upper, ey = sy - Math.sin(p.arm[0] * RAD) * BODY.upper;
  const hdx = ex + f * Math.cos(p.arm[1] * RAD) * BODY.fore, hdy = ey - Math.sin(p.arm[1] * RAD) * BODY.fore;
  const head = part(hdx, hdy, p.arm[2], BODY.racket);
  part(sx, sy, p.arm[0], 0);
  part(sx, sy, p.arm[0], 0);
  part(ex, ey, p.arm[1], 0);

  joints.head = head;
  joints.hand = hand2;
  joints.shoulder = [sx, sy];
  return joints;
}
