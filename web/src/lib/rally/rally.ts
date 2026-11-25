// The rally itself: who hits what, where the players run, and what happens when the shuttle
// ends up in the net. No DOM here; `advance()` moves time on and `frame()` reports transforms,
// so the same code draws the still frame at build time and drives the page in the browser.
import { catchPoint, NET, type Bulge, type Layout } from './court';
import { angleFor, fly, launch, sampleAt, speedFor, G, type Path } from './flight';
import { BODY, PARTS, reach, solve, type Joints, type Pose } from './figure';

export type Side = 0 | 1;
type Shot = 'clear' | 'lift' | 'drop' | 'net' | 'smash' | 'serve' | 'fault';
type Arm = [number, number, number];
type Ease = 'io' | 'in' | 'out';

interface Key {
  t: number;
  a: Arm;
  ease: Ease;
}

interface Stroke {
  /** Overhead (true) or underarm. */
  over: boolean;
  serve: boolean;
  shot: Shot;
  /** Contact time and point. */
  tc: number;
  cx: number;
  cy: number;
  jump: number;
  keys: Key[];
  /** The flight this stroke will send off, worked out when the stroke was planned. */
  next: Launch | null;
}

interface Launch {
  path: Path;
  catchT: number | null;
  shot: Shot;
  /** No clean flight was found from there; this one is a guess. */
  stray: boolean;
}

interface Step {
  x0: number;
  x1: number;
  t0: number;
  d: number;
  h: number;
}

interface Player {
  side: Side;
  f: number;
  x: number;
  vx: number;
  move: { x0: number; t0: number; x1: number; t1: number } | null;
  pose: Pose;
  steps: [Step | null, Step | null];
  stroke: Stroke | null;
  /** When the opponent strikes: the moment to land a split step. */
  hopAt: number;
  parts: string[];
  joints: Joints;
}

interface Flight {
  path: Path;
  t0: number;
  hitter: Side;
  /** Seconds into the path at which the net catches the shuttle, if it does. */
  catchT: number | null;
}

export interface Frame {
  /** One transform per entry of PARTS, per player. */
  players: [string[], string[]];
  /** Transform of the shuttle in play; off-stage when there is none. */
  shuttle: string;
  /** Transform of the shuttle's shadow on the floor. */
  shade: string;
  /** Shuttles lying on the floor. */
  fallen: string[];
  /** Dent in the cords of the 0, or null when the net hangs still. */
  bulge: Bulge | null;
  /** Centre of the shuttle in play (for tests and hit testing). */
  at: [number, number];
}

const READY: Arm = [-58, 20, 68];
const IDLE: Arm = [-96, -80, -52];
const OFFSTAGE = 'translate(-999 -999)';
const HANG = 8;
const FALLEN = 5;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (u: number) => u * u * (3 - 2 * u);
const toward = (cur: number, target: number, dt: number, tau: number) => cur + (target - cur) * (1 - Math.exp(-dt / tau));
/** `a` shifted by whole turns to lie nearest `ref`. */
const near = (a: number, ref: number) => a + 360 * Math.round((ref - a) / 360);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Small seeded generator, so a test can replay a rally. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where the racket shoulder of a pose is. */
function shoulder(p: Pose): [number, number] {
  const a = ((90 - p.lean) * Math.PI) / 180, len = BODY.torso - 5;
  return [p.x + p.f * Math.cos(a) * len, p.floor - p.hip - p.jump - Math.sin(a) * len];
}

export class Rally {
  readonly L: Layout;
  t = 0;
  /** Counters a test can read. */
  hits = 0;
  faults = 0;
  /** Largest gap seen between racket head and shuttle at the moment of a hit. */
  worstContact = 0;
  /** Shots for which no clean flight was found. */
  strays = 0;

  /** The wide court is long, so its clock runs a little fast to keep the exchange brisk. */
  private pace: number;
  private rnd: () => number;
  private players: [Player, Player];
  private mode: 'caught' | 'fall' | 'rest' | 'held' | 'fly' = 'caught';
  private flight: Flight | null = null;
  private hitsLeft: number;
  private server: Side = 0;
  // Shuttle in play: position, angle (degrees, cork first along +x), visibility.
  private sx = 0;
  private sy = 0;
  private sa = 74;
  private shown = true;
  private flipFrom = 0;
  private flipAt = -9;
  // Net catch.
  private caughtAt = -9;
  private slipAt = 0.9;
  private freedAt = -9;
  private dir: [number, number] = [0.26, 0.966];
  private fallV = 0;
  private fallSpin = 1;
  private restUntil = 0;
  private heldFrom = 0;
  private fallen: [number, number, number][] = [];
  private s4 = [0, 0, 0, 0];
  private struck: Player | null = null;

  constructor(layout: Layout, seed = 1) {
    this.L = layout;
    this.rnd = mulberry(seed);
    this.pace = layout.name === 'wide' ? 0.9 : 1.05;
    this.hitsLeft = this.rallyLength();
    this.players = [this.makePlayer(0), this.makePlayer(1)];
    // The opening picture, also the still frame: the right player has just put the shuttle
    // into the 0 and is still in the follow-through; the left player has stopped mid-step.
    const [a, b] = this.players;
    a.pose.lean = 9; a.pose.hip = 101; a.pose.arm = [-70, -8, 42]; a.pose.off = [-74, -22];
    a.pose.feet[0].x = a.x + 30; a.pose.feet[1].x = a.x - 26;
    b.x = b.pose.x = layout.base[1] - (layout.name === 'wide' ? 34 : 0);
    b.pose.lean = 24; b.pose.hip = 88; b.pose.arm = [22, 66, 104]; b.pose.off = [196, 184];
    b.pose.feet[0].x = b.x - 62; b.pose.feet[1].x = b.x + 66; b.pose.feet[1].tilt = 34; b.pose.feet[1].lift = 8;
    b.move = { x0: b.x, t0: 0.5, x1: layout.base[1], t1: 1.2 };
    const [cx, cy] = catchPoint(layout);
    this.sx = cx + this.dir[0] * HANG; this.sy = cy + this.dir[1] * HANG;
    this.pose();
  }

  advance(step: number): void {
    const dt = clamp(step, 0, 0.05) * this.pace;
    this.t += dt;
    const t = this.t;
    const fl = this.flight;
    if (this.mode === 'fly' && fl) {
      const r = this.players[(1 - fl.hitter) as Side];
      const end = (fl.path.n - 1) * fl.path.dt;
      if (fl.catchT != null && t >= fl.t0 + fl.catchT) this.catch(fl);
      else if (fl.catchT == null && r.stroke && !r.stroke.serve && t >= r.stroke.tc && r.stroke.tc >= fl.t0) this.hit(r);
      else if (t >= fl.t0 + end) {
        this.drop(fl.path.x[fl.path.n - 1], fl.hitter);
      }
    } else if (this.mode === 'caught') {
      if (t >= this.slipAt) { this.mode = 'fall'; this.freedAt = t; this.fallV = 0; this.fallSpin = this.rnd() < 0.5 ? -1 : 1; }
    } else if (this.mode === 'fall') {
      this.fallV = Math.min(this.fallV + G * dt, 760);
      this.sy += this.fallV * dt;
      this.sx += this.fallSpin * 14 * dt;
      this.sa = toward(this.sa, 90, dt, 0.12);
      if (this.sy >= this.L.floor - 10) this.drop(this.sx, this.server);
    } else if (this.mode === 'rest') {
      if (t >= this.restUntil) this.beginServe(this.server);
    } else if (this.mode === 'held') {
      const p = this.players[this.server];
      if (p.stroke && t >= p.stroke.tc) this.hit(p);
    }
    this.pose(dt);
    if (this.struck) {
      const p = this.struck, s = p.stroke!;
      this.worstContact = Math.max(this.worstContact, Math.hypot(p.joints.head[0] - s.cx, p.joints.head[1] - s.cy));
      this.struck = null;
    }
  }

  frame(): Frame {
    const [a, b] = this.players;
    const h = this.L.floor - this.sy;
    let bulge: Bulge | null = null;
    const amp = this.amp();
    if (amp !== 0) bulge = { x: 60, y: 70, dx: this.dir[0] * amp, dy: this.dir[1] * amp };
    return {
      players: [a.parts, b.parts],
      shuttle: this.shown ? `translate(${r1(this.sx)} ${r1(this.sy)}) rotate(${r1(this.sa)})` : OFFSTAGE,
      shade: this.shown ? `translate(${r1(this.sx)} ${this.L.floor + 12}) scale(${r1(clamp(1 - h / 620, 0.3, 1))})` : OFFSTAGE,
      fallen: Array.from({ length: FALLEN }, (_, i) => {
        const s = this.fallen[i];
        return s ? `translate(${r1(s[0])} ${r1(s[1])}) rotate(${r1(s[2])})` : OFFSTAGE;
      }),
      bulge,
      at: [this.sx, this.sy],
    };
  }

  // ————— shuttle —————

  /** How far the cords of the 0 are pushed in right now. */
  private amp(): number {
    const t = this.t;
    if (this.mode === 'caught') {
      const u = t - this.caughtAt;
      return HANG + (u < 1.6 ? 12 * Math.exp(-u / 0.2) * Math.cos(u * 27) : 0);
    }
    const u = t - this.freedAt;
    return u >= 0 && u < 0.7 ? HANG * Math.exp(-u / 0.13) * Math.cos(u * 31) : 0;
  }

  private catch(fl: Flight): void {
    const s = sampleAt(fl.path, fl.catchT!, this.s4);
    const v = Math.hypot(s[2], s[3]) || 1;
    this.dir = [s[2] / v, s[3] / v];
    this.mode = 'caught';
    this.caughtAt = this.t;
    this.slipAt = this.t + 1.15;
    this.server = (1 - fl.hitter) as Side;
    this.faults++;
    this.hitsLeft = this.rallyLength();
    this.flight = null;
    for (const p of this.players) p.move = { x0: p.x, t0: this.t + 0.5, x1: this.L.base[p.side], t1: this.t + 1.3 };
  }

  /** The shuttle in play comes to rest on the floor at x; `winner` serves next. */
  private drop(x: number, winner: Side): void {
    const lie = 90 + (this.rnd() < 0.5 ? -1 : 1) * (64 + this.rnd() * 14);
    this.fallen.push([x, this.L.floor - 9, lie]);
    if (this.fallen.length > FALLEN) this.fallen.shift();
    this.shown = false;
    this.flight = null;
    this.mode = 'rest';
    this.server = winner;
    this.restUntil = this.t + 0.95;
  }

  private beginServe(side: Side): void {
    const p = this.players[side], o = this.players[(1 - side) as Side], t = this.t, L = this.L;
    const spot = L.base[side] + p.f * (L.name === 'wide' ? 40 : -34);
    const tc = t + 1.1;
    p.move = { x0: p.x, t0: t, x1: spot, t1: t + 0.45 };
    o.move = { x0: o.x, t0: t, x1: L.base[o.side], t1: t + 0.55 };
    const cx = spot + p.f * 58, cy = L.floor - 118;
    const c = this.contactArm(p, spot, 104, 6, 0, cx, cy, false);
    const prep: Arm = [-112, -88, -142];
    p.stroke = {
      over: false, serve: true, shot: 'serve', tc, cx, cy, jump: 0, next: null,
      keys: [
        { t, a: [...p.pose.arm] as Arm, ease: 'io' },
        { t: t + 0.45, a: prep, ease: 'io' },
        { t: tc - 0.2, a: prep, ease: 'io' },
        { t: tc, a: c, ease: 'in' },
        { t: tc + 0.2, a: [10, 55, 85], ease: 'out' },
        { t: tc + 0.62, a: READY, ease: 'io' },
      ],
    };
    o.hopAt = tc;
    this.heldFrom = t + 0.3;
    this.mode = 'held';
  }

  private rallyLength(): number {
    return 6 + Math.floor(this.rnd() * 9);
  }

  // ————— strokes —————

  private hit(p: Player): void {
    const s = p.stroke!;
    this.struck = p;
    this.hits++;
    this.hitsLeft--;
    const dir = p.f;
    const shot = s.next ?? this.shotPath(s.shot, s.cx, s.cy, dir);
    if (!s.next && shot.stray) this.strays++;
    this.flipFrom = this.shown ? this.sa : dir > 0 ? 180 : 0;
    this.flipAt = s.tc;
    this.shown = true;
    this.flight = { path: shot.path, t0: s.tc, hitter: p.side, catchT: shot.catchT };
    this.mode = 'fly';
    const home = this.L.base[p.side], back = s.tc + 0.12;
    p.move = { x0: p.x, t0: back, x1: home, t1: back + 0.38 + Math.abs(home - p.x) / 420 };
    if (shot.catchT == null) this.planReceive(this.flight);
  }

  /** Arm angles that meet (cx, cy) from where the body will be at contact. */
  private contactArm(p: Player, x: number, hip: number, lean: number, jump: number, cx: number, cy: number, over: boolean): Arm {
    const [sx, sy] = shoulder({ ...p.pose, x, hip, lean, jump });
    const aim = (Math.atan2(sy - cy, p.f * (cx - sx)) * 180) / Math.PI;
    const a = reach(sx, sy, cx, cy, aim + (over ? -6 : 14), p.f);
    const hint: Arm = over ? [80, 84, 84] : [-55, -35, -25];
    return [near(a[0], hint[0]), near(a[1], hint[1]), near(a[2], hint[2])];
  }

  /** Decides where and how the receiver meets a flight, and sends the receiver there. */
  private planReceive(fl: Flight): void {
    const L = this.L, path = fl.path, floor = L.floor, rnd = this.rnd;
    const r = this.players[(1 - fl.hitter) as Side], f = r.f;
    const edge = f > 0 ? L.netX : L.netX + NET.width;
    const half = f > 0 ? edge : L.w - edge;
    /** Distance of x from the receiver's edge of the net, into the receiver's half. */
    const depth = (x: number) => (edge - x) * f;
    /** First sample where the shuttle comes down through height h. */
    const cross = (h: number) => {
      for (let i = 1; i < path.n; i++) if (path.vy[i] > 0 && path.y[i] >= floor - h && path.y[i - 1] < floor - h) return i;
      return -1;
    };
    const ok = (i: number, margin: number) => i > 0 && depth(path.x[i]) >= margin && depth(path.x[i]) <= half - 56;

    const due = this.hitsLeft <= 0;
    const hi = cross(298), top = cross(338);
    // Ways to meet it, best first: overhead from mid-court back; low, where there is room to
    // lift it back over; near tape height close to the net; overhead in the front court; and a
    // block at chest height for a flat, fast one. The first with a clean reply wins, because
    // a net this wide leaves no reply at all from some spots.
    const ways: { i: number; over: boolean }[] = [];
    const offer = (i: number, over: boolean, margin: number) => {
      if (ok(i, margin)) ways.push({ i, over });
    };
    offer(hi, true, Math.max(62, half * 0.3));
    offer(cross(62 + rnd() * 34), false, 170);
    offer(cross(120 + rnd() * 30), false, 40);
    offer(hi, true, 62);
    offer(cross(190), false, 40);
    offer(cross(226), false, 30);
    if (!ways.length) { r.stroke = null; return; }

    let i = -1, over = false, shot: Shot = 'lift', jump = 0, next: Launch | null = null;
    for (const way of ways) {
      ({ i, over } = way);
      jump = 0;
      const u = rnd();
      if (over) shot = u > 0.56 ? 'clear' : 'drop';
      else shot = u < (depth(path.x[i]) < half * 0.42 ? 0.45 : 0.22) ? 'net' : 'lift';
      if (due) shot = 'fault';
      next = null;
      if (way === ways[0] && over && ok(top, 80) && u < 0.24) {
        // A smash only if a flat, fast line over the tape exists from up there.
        const smash = this.shotPath('smash', path.x[top], path.y[top], f);
        if (smash.shot === 'smash') { next = smash; i = top; jump = 38; }
      }
      next ??= this.shotPath(shot, path.x[i], path.y[i], f);
      if (!next.stray) break;
    }
    if (next!.stray) this.strays++;
    shot = next!.shot;

    const tc = fl.t0 + i * path.dt, cx = path.x[i], cy = path.y[i], now = Math.max(this.t, fl.t0);
    const lo = f > 0 ? 34 : edge + 46, hiX = f > 0 ? edge - 46 : L.w - 34;
    // A lunge trails a leg far behind, so it keeps off the back wall when the shuttle allows.
    let x = clamp(cx - f * (over ? 20 : 128), lo, hiX);
    if (!over) x = f > 0 ? Math.max(x, Math.min(lo + 66, cx - 46)) : Math.min(x, Math.max(hiX - 66, cx + 46));
    const c = this.contactArm(r, x, over ? 108 : 76, over ? 2 : 30, jump, cx, cy, over);
    const keys: Key[] = [{ t: now, a: [...r.pose.arm] as Arm, ease: 'io' }];
    const add = (t: number, a: Arm, ease: Ease) => {
      if (t > keys[keys.length - 1].t + 0.05) keys.push({ t, a, ease });
    };
    if (over) {
      add(tc - 0.36, [150, 95, 115], 'io');
      add(tc - 0.12, [115, 200, 255], 'io');
    } else add(tc - 0.24, shot === 'net' ? [-92, -70, -100] : [-115, -95, -150], 'io');
    keys.push({ t: Math.max(tc, keys[keys.length - 1].t + 0.02), a: c, ease: 'in' });
    const follow: Arm = over ? (shot === 'smash' ? [-18, -52, -104] : shot === 'drop' ? [28, 4, -30] : [4, -36, -76])
      : shot === 'net' ? [-28, -2, 16] : [20, 70, 106];
    keys.push({ t: tc + 0.17, a: follow, ease: 'out' }, { t: tc + 0.58, a: READY, ease: 'io' });
    r.stroke = { over, serve: false, shot, tc, cx, cy, jump, keys, next };

    const t0 = now + Math.min(0.1, (tc - now) * 0.2);
    r.move = { x0: r.x, t0, x1: x, t1: Math.max(t0 + 0.05, tc - 0.07) };
    this.players[fl.hitter].hopAt = tc;
  }

  /** A flight is good when it clears the tape, stays in the picture and comes down in court. */
  private valid(p: Path, dir: number, flat = false): boolean {
    const L = this.L;
    let clear = Infinity, apex = Infinity, low = -1;
    for (let i = 0; i < p.n; i++) {
      apex = Math.min(apex, p.y[i]);
      if (low < 0 && p.y[i] >= L.floor - 185) low = p.x[i];
      if (p.x[i] >= L.netX && p.x[i] <= L.netX + NET.width) clear = Math.min(clear, L.netTop - p.y[i]);
    }
    const end = p.x[p.n - 1];
    const over = dir > 0 ? end > L.netX + NET.width + 22 : end < L.netX - 22;
    // A flat shot may run long as long as it is down to blocking height inside the court.
    if (flat) return over && clear >= 14 && low > 90 && low < L.w - 90 && (dir > 0 ? low - L.netX - NET.width : L.netX - low) >= 120;
    return over && clear >= 11 && apex >= 30 && end > 26 && end < L.w - 26;
  }

  private shotPath(shot: Shot, x: number, y: number, dir: number): Launch {
    const L = this.L, floor = L.floor, rnd = this.rnd;
    const edge = dir > 0 ? L.netX + NET.width : L.netX;
    const half = dir > 0 ? L.w - edge : edge;
    const R = (a: number, b: number) => a + (b - a) * rnd();
    const land = (a: number, b: number) => edge + dir * half * R(a, b);
    // On the wide court the shuttle comes down at a shallower angle, so short means further.
    const short = (share: number, least: number) => edge + dir * Math.max(half * share, least + (L.name === 'wide' ? 90 : 0));
    const byAngle = (angles: number[], tx: number): Path | null => {
      for (const a of angles) {
        const v = speedFor(x, y, a, tx, floor - 1, floor, L.drag);
        if (v == null) continue;
        const [vx, vy] = launch(v, a, dir);
        const p = fly(x, y, vx, vy, floor, L.drag);
        if (this.valid(p, dir)) return p;
      }
      return null;
    };
    const steps = (from: number, to: number, by: number) => {
      const out: number[] = [];
      for (let a = from; a <= to; a += by) out.push(a);
      return out;
    };
    let path: Path | null = null;

    if (shot === 'fault') {
      const [cx, cy] = catchPoint(L);
      for (const a of [R(54, 66), 70, 76, 46]) {
        const v = speedFor(x, y, a, cx, cy, floor, L.drag);
        if (v == null) continue;
        const [vx, vy] = launch(v, a, dir);
        const p = fly(x, y, vx, vy, floor, L.drag);
        let apex = Infinity, at = -1, tape = NaN;
        for (let i = 1; i < p.n; i++) {
          apex = Math.min(apex, p.y[i]);
          if (p.vy[i] > 0 && Number.isNaN(tape) && p.y[i] >= L.netTop) tape = p.x[i];
          if (p.vy[i] > 0 && p.y[i] >= cy - 2 && Math.abs(p.x[i] - cx) < 34) { at = i; break; }
        }
        if (at > 0 && apex >= 30 && Math.abs(tape - cx) < 46) return { path: p, catchT: at * p.dt, shot, stray: false };
      }
      shot = 'lift';
    }
    if (shot === 'smash') {
      for (const v of [R(7400, 9400), 6200, 5000, 4000, 3200, 2600]) {
        const a = angleFor(x, y, v, edge + dir * 6, L.netTop - 30, floor, L.drag);
        if (a == null) continue;
        const [vx, vy] = launch(v, a, dir);
        const p = fly(x, y, vx, vy, floor, L.drag);
        if (this.valid(p, dir, true)) { path = p; break; }
      }
      if (!path) shot = 'clear';
    }
    if (shot === 'serve') shot = rnd() < 0.55 ? 'lift' : 'net';
    if (shot === 'clear') path = byAngle([R(44, 56), 40, 34, 28, 22, 16], land(0.66, 0.86));
    // Short shots still land a stride or two past the net: closer than that nobody could dig
    // them back over a net this wide.
    else if (shot === 'drop') path = byAngle(steps(R(4, 14), 76, 7), short(R(0.12, 0.3), R(105, 150)));
    else if (shot === 'net') path = byAngle(steps(R(36, 46), 82, 6), short(R(0.09, 0.22), R(95, 135)));
    if (!path) path = byAngle([R(58, 68), 54, 48, 42, 36, 30, 24], land(0.6, 0.86));
    // Still nothing (a low contact far back, under a low ceiling): shorter, then flatter.
    for (const depth of [0.5, 0.36, 0.24]) path ??= byAngle(steps(20, 84, 4).reverse(), short(depth + 0.1 * rnd(), 100));
    const stray = !path;
    if (!path) {
      // Nothing clean from here: a plain high lift, whatever it clears.
      const tx = land(0.7, 0.8), v = speedFor(x, y, 62, tx, floor - 1, floor, L.drag) ?? 2600;
      const [vx, vy] = launch(v, 62, dir);
      path = fly(x, y, vx, vy, floor, L.drag);
    }
    return { path, catchT: null, shot, stray };
  }

  // ————— bodies —————

  private makePlayer(side: Side): Player {
    const L = this.L, f = side === 0 ? 1 : -1, x = L.base[side];
    return {
      side, f, x, vx: 0, move: null, steps: [null, null], stroke: null, hopAt: -9,
      pose: {
        x, floor: L.floor, f, hip: 107, jump: 0, lean: 3, arm: [...IDLE] as Arm, off: [-90, -76],
        feet: [{ x: x + f * 12, lift: 0, tilt: 0 }, { x: x - f * 14, lift: 0, tilt: 0 }],
      },
      parts: new Array<string>(PARTS.length).fill(''),
      joints: { head: [0, 0], hand: [0, 0], shoulder: [0, 0] },
    };
  }

  /** Moves both bodies on by dt and places the shuttle. With no dt it only redraws. */
  private pose(dt = 0): void {
    for (const p of this.players) {
      if (dt > 0) this.body(p, dt);
      solve(p.pose, p.parts, p.joints);
    }
    if (dt > 0) this.shuttle(dt);
  }

  private shuttle(dt: number): void {
    const t = this.t, fl = this.flight;
    if (this.mode === 'fly' && fl) {
      const s = sampleAt(fl.path, t - fl.t0, this.s4);
      this.sx = s[0]; this.sy = s[1];
      const heading = (Math.atan2(s[3], s[2]) * 180) / Math.PI;
      // Struck on the cork while flying cork first, it leaves skirt first and turns over.
      const u = t - this.flipAt;
      const turn = u < 0.5 ? (near(this.flipFrom, heading) - heading) * Math.exp(-u / 0.045) * Math.cos(u * 16) : 0;
      this.sa = heading + turn;
    } else if (this.mode === 'caught') {
      const [cx, cy] = catchPoint(this.L), a = this.amp();
      this.sx = cx + this.dir[0] * a; this.sy = cy + this.dir[1] * a;
      this.sa = toward(this.sa, 90 + (this.dir[0] >= 0 ? -1 : 1) * 16, dt, 0.1);
    } else if (this.mode === 'held') {
      const p = this.players[this.server], s = p.stroke;
      this.shown = t >= this.heldFrom;
      if (s) {
        const hx = p.joints.hand[0] + p.f * 3, hy = p.joints.hand[1] + 15;
        const u = smooth(clamp((t - (s.tc - 0.1)) / 0.1, 0, 1));
        this.sx = hx + (s.cx - hx) * u; this.sy = hy + (s.cy - hy) * u;
        this.sa = 90;
      }
    }
  }

  private body(p: Player, dt: number): void {
    const t = this.t, pose = p.pose, f = p.f;
    const before = p.x;
    if (p.move) {
      const m = p.move, u = clamp((t - m.t0) / (m.t1 - m.t0), 0, 1);
      p.x = m.x0 + (m.x1 - m.x0) * smooth(u);
      if (u >= 1) p.move = null;
    }
    p.vx = (p.x - before) / dt;
    pose.x = p.x;

    const s = p.stroke, tau = s ? t - s.tc : 0;
    const live = this.mode === 'fly' || this.mode === 'held';
    let lean = 3, hip = 107, nearFoot = 12, farFoot = -14, jump = 0, urgent = false, stride = 9;
    let off: [number, number] = [-90, -76];
    if (s && s.serve && tau < 0.36) {
      nearFoot = -22; farFoot = 26;
      if (tau < -0.1) { lean = 4; hip = 105; off = t >= this.heldFrom - 0.1 ? [-36, -6] : [-80, -40]; }
      else { lean = 13; hip = 101; off = [-62, -14]; }
    } else if (s && s.over && tau > -0.5 && tau < 0.36) {
      urgent = true;
      if (tau < -0.17) { lean = -13; hip = 99; nearFoot = -30; farFoot = 26; off = [58, 76]; }
      else if (tau < 0.03) { lean = 2; hip = 108; nearFoot = -26; farFoot = 26; off = [-10, 36]; }
      else { lean = s.shot === 'smash' ? 30 : 19; hip = 96; nearFoot = 34; farFoot = -30; off = [-84, -24]; }
      if (Math.abs(tau) < 0.2) jump = s.jump * (1 - (tau / 0.2) ** 2);
    } else if (s && !s.over && tau > -0.34 && tau < 0.3) {
      urgent = true; stride = 16;
      if (tau < 0.12) { lean = 30; hip = 76; nearFoot = 76; farFoot = -76; off = [204, 188]; }
      else { lean = 15; hip = 95; nearFoot = 30; farFoot = -30; off = [-70, -10]; }
    } else if (live) {
      lean = 10 + clamp(p.vx * f * 0.03, -9, 10); hip = 100; nearFoot = 24; farFoot = -27; off = [-64, -4];
      const h = t - p.hopAt;
      if (h > -0.15 && h < 0) jump = 8 * Math.sin((Math.PI * (h + 0.15)) / 0.15);
      if (h >= 0 && h < 0.2) hip -= 9;
      if (h > -0.15 && h < 0.26) { nearFoot += 9; farFoot -= 9; }
    }
    pose.lean = toward(pose.lean, lean, dt, 0.08);
    pose.hip = toward(pose.hip, hip, dt, 0.07);
    pose.jump = jump;
    pose.off[0] = toward(pose.off[0], off[0], dt, 0.09);
    pose.off[1] = toward(pose.off[1], off[1], dt, 0.09);

    // Feet: planted until the hips have moved off them, then one steps at a time.
    const want = [p.x + f * nearFoot, p.x + f * farFoot];
    let busy = 0;
    for (const k of [0, 1] as const) {
      const st = p.steps[k], foot = pose.feet[k];
      if (!st) continue;
      const u = (t - st.t0) / st.d;
      if (u >= 1) { foot.x = st.x1; foot.lift = 0; foot.tilt = 0; p.steps[k] = null; }
      else {
        foot.x = st.x0 + (st.x1 - st.x0) * smooth(u);
        foot.lift = st.h * Math.sin(Math.PI * u);
        foot.tilt = 16 * Math.sin(Math.PI * u);
        if (u < 0.6) busy++;
      }
    }
    if (jump > 3) {
      for (const k of [0, 1] as const) {
        p.steps[k] = null;
        pose.feet[k].x = toward(pose.feet[k].x, want[k], dt, 0.05);
        pose.feet[k].lift = 0; pose.feet[k].tilt = 22;
      }
    } else if (!busy) {
      const e0 = p.steps[0] ? 0 : Math.abs(want[0] - pose.feet[0].x), e1 = p.steps[1] ? 0 : Math.abs(want[1] - pose.feet[1].x);
      const k = e0 >= e1 ? 0 : 1;
      if (Math.max(e0, e1) > (urgent ? 9 : 28)) {
        const d = urgent ? 0.13 : 0.2;
        p.steps[k] = { x0: pose.feet[k].x, x1: want[k] + p.vx * d * 0.6, t0: t, d, h: stride };
      }
    }
    for (const k of [0, 1] as const) {
      // A planted foot left far behind the hips rolls up onto its toes.
      const foot = pose.feet[k], behind = (p.x - foot.x) * f;
      if (!p.steps[k] && jump <= 3) {
        const roll = clamp((behind - 56) * 1.4, 0, 52);
        foot.tilt = toward(foot.tilt, roll, dt, 0.05);
        foot.lift = foot.tilt * 0.22;
      }
    }

    // Racket arm: keyed swing, pinned onto the shuttle around the moment of contact.
    if (s) {
      const keys = s.keys;
      let a: Arm = keys[keys.length - 1].a;
      for (let i = 1; i < keys.length; i++) {
        if (t <= keys[i].t) {
          const k0 = keys[i - 1], k1 = keys[i];
          let u = clamp((t - k0.t) / (k1.t - k0.t), 0, 1);
          u = k1.ease === 'in' ? u * u * u : k1.ease === 'out' ? 1 - (1 - u) ** 3 : smooth(u);
          a = [k0.a[0] + (k1.a[0] - k0.a[0]) * u, k0.a[1] + (k1.a[1] - k0.a[1]) * u, k0.a[2] + (k1.a[2] - k0.a[2]) * u];
          break;
        }
      }
      const w = tau > -0.07 && tau <= 0.03 ? smooth(Math.min(1, (tau + 0.07) / 0.07)) : tau > 0 && tau < 0.07 ? (0.07 - tau) / 0.04 : 0;
      if (w > 0) {
        const [sx, sy] = shoulder(pose);
        const aim = (Math.atan2(sy - s.cy, f * (s.cx - sx)) * 180) / Math.PI;
        const c = reach(sx, sy, s.cx, s.cy, aim + (s.over ? -6 : 14), f);
        a = [a[0] + (near(c[0], a[0]) - a[0]) * w, a[1] + (near(c[1], a[1]) - a[1]) * w, a[2] + (near(c[2], a[2]) - a[2]) * w];
      }
      pose.arm = a;
      if (t > keys[keys.length - 1].t) p.stroke = null;
    } else {
      const rest = live ? READY : IDLE;
      for (const i of [0, 1, 2] as const) pose.arm[i] = toward(pose.arm[i], rest[i], dt, 0.11);
    }
  }
}
