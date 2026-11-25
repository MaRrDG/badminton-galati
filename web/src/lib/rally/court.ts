// Geometry of the 404 scene: a court seen from the side whose net is the number 404.
// Units are SVG user units (y grows downward); a standing player is about 220 tall.

export type LayoutName = 'wide' | 'tall';

/** Digit cell, gaps and tape of the net, in user units. */
export const NET = { digitW: 120, digitH: 170, gap: 24, pad: 16, tape: 12, pitch: 12, width: 440 } as const;

export interface Layout {
  name: LayoutName;
  w: number;
  h: number;
  /** y of the floor line. */
  floor: number;
  /** Left edge and top (upper edge of the tape) of the net. */
  netX: number;
  netTop: number;
  /** Where each player waits, left then right. */
  base: [number, number];
  /** Drag of the shuttle on this court (see flight.ts). */
  drag: number;
}

/**
 * `wide` is the desktop framing; `tall` re-frames the same net and players on a narrower,
 * higher court so a phone shows them at a legible size instead of a thin strip.
 */
export function makeLayout(name: LayoutName): Layout {
  const [w, h, floor] = name === 'wide' ? [1360, 560, 498] : [900, 780, 712];
  const netX = (w - NET.width) / 2;
  const reach = name === 'wide' ? 245 : 108;
  return { name, w, h, floor, netX, netTop: floor - 232, base: [reach, w - reach], drag: name === 'wide' ? 0.00105 : 0.00163 };
}

/** Outlines in a 120×170 cell, drawn with fill-rule evenodd. */
export const FOUR = 'M62,0H96V108H120V140H96V170H62V140H0V108ZM62,50V108H29Z';
export const ZERO = 'M22,0H98L120,22V148L98,170H22L0,148V22ZM44,34H76L86,44V126L76,136H44L34,126V44Z';

/** Top-left corner of digit `i` (0, 1, 2). */
export function digitOrigin(L: Layout, i: number): [number, number] {
  return [L.netX + NET.pad + i * (NET.digitW + NET.gap), L.netTop + NET.tape];
}

/** Where a shuttle that drops into the net ends up: inside the counter of the 0. */
export function catchPoint(L: Layout): [number, number] {
  const [x, y] = digitOrigin(L, 1);
  return [x + 60, y + 70];
}

/** The fine cords of the whole net, as one path. */
export function netCords(L: Layout): string {
  const x0 = L.netX, y0 = L.netTop + NET.tape, y1 = y0 + NET.digitH;
  let d = '';
  for (let x = x0 + 10; x < x0 + NET.width; x += NET.pitch) d += `M${x},${y0}V${y1}`;
  for (let y = y0 + 5; y < y1; y += NET.pitch) d += `M${x0},${y}H${x0 + NET.width}`;
  return d;
}

/** A dent in the cords of a digit: centre in the digit's own coordinates and displacement. */
export interface Bulge {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The heavy cords of one digit cell (clipped to the digit's outline by the markup). With a
 * bulge, every cord is pulled toward the displacement, falling off with distance from its centre.
 */
export function digitCords(bulge?: Bulge | null): string {
  const { digitW: W, digitH: H, pitch: P } = NET;
  let d = '';
  if (!bulge || (Math.abs(bulge.dx) < 0.05 && Math.abs(bulge.dy) < 0.05)) {
    for (let x = 6; x < W; x += P) d += `M${x},0V${H}`;
    for (let y = 5; y < H; y += P) d += `M0,${y}H${W}`;
    return d;
  }
  const S = 2 * 36 * 36;
  const point = (x: number, y: number) => {
    const k = Math.exp(-((x - bulge.x) ** 2 + (y - bulge.y) ** 2) / S);
    return `${r1(x + bulge.dx * k)},${r1(y + bulge.dy * k)}`;
  };
  for (let x = 6; x < W; x += P) {
    d += `M${x},0`;
    for (let y = 5; y < H; y += P) d += `L${point(x, y)}`;
    d += `L${x},${H}`;
  }
  for (let y = 5; y < H; y += P) {
    d += `M0,${y}`;
    for (let x = 6; x < W; x += P) d += `L${point(x, y)}`;
    d += `L${W},${y}`;
  }
  return d;
}
