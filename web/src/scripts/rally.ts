// Runs the rally of the 404 page on the SVG that 404.astro already rendered.
// SVG rather than canvas: the still frame for no-JS and reduced motion is that same markup, the
// figures stay sharp at any size, and a frame only rewrites `transform` on some forty nodes (no
// layout). No GSAP: the motion is a simulation stepped per frame, not a set of tweens.
import { digitCords, makeLayout, type LayoutName } from '../lib/rally/court';
import { Rally, type Frame, type Side } from '../lib/rally/rally';

interface Stage {
  svg: SVGSVGElement;
  rally: Rally;
  players: SVGElement[][];
  shuttle: SVGElement;
  shade: SVGElement;
  fallen: SVGElement[];
  zero: SVGElement;
  /** Whether the cords of the 0 are drawn dented right now. */
  dented: boolean;
}

const all = (root: Element, selector: string) => [...root.querySelectorAll<SVGElement>(selector)];

function makeStage(svg: SVGSVGElement): Stage {
  return {
    svg,
    rally: new Rally(makeLayout(svg.dataset.rally as LayoutName), Date.now()),
    players: all(svg, '[data-player]').map(g => [...g.children] as SVGElement[]),
    shuttle: svg.querySelector<SVGElement>('[data-shuttle]')!,
    shade: svg.querySelector<SVGElement>('[data-shade]')!,
    fallen: all(svg, '[data-fallen]'),
    zero: svg.querySelector<SVGElement>('[data-zero]')!,
    dented: true,
  };
}

/** Writes an attribute only when it changed, so resting parts cost nothing. */
function set(el: SVGElement, name: string, value: string): void {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function draw(stage: Stage, frame: Frame): void {
  frame.players.forEach((parts, side) => parts.forEach((t, i) => set(stage.players[side][i], 'transform', t)));
  set(stage.shuttle, 'transform', frame.shuttle);
  set(stage.shade, 'transform', frame.shade);
  frame.fallen.forEach((t, i) => set(stage.fallen[i], 'transform', t));
  if (frame.bulge || stage.dented) {
    stage.zero.setAttribute('d', digitCords(frame.bulge));
    stage.dented = Boolean(frame.bulge);
  }
}

export function initRally(): void {
  const host = document.querySelector<HTMLElement>('[data-rally-stage]');
  if (!host) return;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hint = document.querySelector<HTMLElement>('[data-rally-hint]');
  const stages = new Map<SVGSVGElement, Stage>();
  let onScreen = true;
  let raf = 0;
  let last = 0;

  let stage: Stage | undefined;

  /** Takes up the drawing the current width shows (the other one is display: none). */
  const pick = () => {
    const svg = all(host, 'svg[data-rally]').find(s => s.getClientRects().length > 0) as SVGSVGElement | undefined;
    stage = svg && (stages.get(svg) ?? stages.set(svg, makeStage(svg)).get(svg));
  };

  const tick = (now: number) => {
    raf = 0;
    if (stage) {
      stage.rally.advance(last ? (now - last) / 1000 : 0);
      draw(stage, stage.rally.frame());
    }
    last = now;
    sync();
  };

  /** Runs only while it can be seen: motion allowed, tab visible, scene on screen. */
  function sync(): void {
    const run = !still.matches && !document.hidden && onScreen;
    if (hint) hint.hidden = still.matches;
    if (run && !raf) raf = requestAnimationFrame(tick);
    else if (!run) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }
  }

  new IntersectionObserver(entries => {
    onScreen = entries[entries.length - 1].isIntersecting;
    sync();
  }).observe(host);
  document.addEventListener('visibilitychange', sync);
  still.addEventListener('change', sync);
  window.matchMedia('(max-width: 860px)').addEventListener('change', pick);

  host.addEventListener('pointerdown', event => {
    if (!stage || still.matches) return;
    const box = stage.svg.getBoundingClientRect();
    stage.rally.poke((event.clientX < box.left + box.width / 2 ? 0 : 1) as Side);
  });

  pick();
  sync();
}
