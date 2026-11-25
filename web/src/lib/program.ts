// The programme page (/program/): the week in the hall as a timetable, the group picker and the
// guide to the groups. Everything here is pure; the site data is read, never changed.
// Times are 'HH:MM' (24 h) and compare as minutes since midnight.
import type { FilterOption } from './filter';
import { countRo } from './ro';
import type { Coach, Group, Session, SiteData } from './types';

/** The colour of a group, by its position: the performance road solid, the play road light. */
export type GroupTone = 'red' | 'blue' | 'deep' | 'outline' | 'mist';
const TONES: GroupTone[] = ['red', 'blue', 'deep', 'outline', 'mist'];

/** The fill of each tone's swatch in the group picker (its edge is set by the page). */
const SWATCH: Record<GroupTone, string> = {
  red: 'var(--red-field)', blue: 'var(--blue)', deep: 'var(--blue-deep)', outline: 'var(--white)', mist: 'var(--mist)',
};

export function groupTone(index: number): GroupTone {
  return TONES[index % TONES.length];
}

/**
 * One session on the timetable. `col` is its day's grid column; it spans rows `r1` to `r2`
 * (the row after its last half hour). Sessions that overlap on a day share the column in
 * `lanes` side-by-side lanes; `lane` is its own, from 0. `provisional`: the hours are an example.
 */
export type PlannerBlock = {
  group: Group; tone: GroupTone; day: number; col: number; r1: number; r2: number; label: string;
  lane: number; lanes: number; provisional: boolean;
};
/**
 * The week as a grid: row 1 holds the day names, then a row per half hour from the first full
 * hour to the last; a stretch of two hours or more empty on every day is one `gapRows` row.
 */
export type Planner = {
  days: { day: number; name: string; col: number }[];
  marks: { label: string; row: number }[];
  gapRows: number[];
  blocks: PlannerBlock[];
};

const DAY_NAMES = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
const SLOT = 30;
/** Empty slots in a row that collapse into one gap row: two hours. */
const MIN_GAP = 4;

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const span = (s: Session) => `${s.start}–${s.end}`;

/**
 * The week of these groups, or undefined when none has a session. A group's tone comes from its
 * position in `groups`, sessions or not. Every session must end after it starts (parseSiteData
 * checks it); one that does not is a bug upstream, and this throws rather than draw it.
 */
export function weekPlanner(groups: Group[]): Planner | undefined {
  const sessions = groups
    .flatMap((group, index) => group.sessions.map(s => ({ group, index, s, from: minutes(s.start), to: minutes(s.end) })))
    .sort((a, b) => a.s.day - b.s.day || a.from - b.from || a.index - b.index);
  const backwards = sessions.find(x => x.to <= x.from);
  if (backwards) throw new Error(`weekPlanner: ${backwards.group.name} has a session that does not end after it starts (${span(backwards.s)})`);
  if (sessions.length === 0) return undefined;

  const dayList = [...new Set(sessions.map(x => x.s.day))];
  const days = dayList.map((day, i) => ({ day, name: DAY_NAMES[day - 1], col: i + 2 }));
  const colOf = new Map(days.map(d => [d.day, d.col]));

  const first = Math.floor(Math.min(...sessions.map(x => x.from)) / 60) * 60;
  const last = Math.ceil(Math.max(...sessions.map(x => x.to)) / 60) * 60;
  const slotCount = (last - first) / SLOT;
  const slotOf = (m: number) => Math.floor((m - first) / SLOT);
  const busy = Array.from({ length: slotCount }, (_, k) => {
    const from = first + k * SLOT;
    return sessions.some(x => x.from < from + SLOT && x.to > from);
  });

  // Rows: each slot its own, except runs of MIN_GAP or more empty slots, which share one.
  const rowOf: number[] = [];
  const gapRows: number[] = [];
  const marks: Planner['marks'] = [];
  let row = 2;
  for (let k = 0; k < slotCount; ) {
    let end = k;
    while (end < slotCount && !busy[end]) end++;
    const start = first + k * SLOT;
    if (end - k >= MIN_GAP) {
      for (let j = k; j < end; j++) rowOf[j] = row;
      gapRows.push(row);
      if (start % 60 === 0) marks.push({ label: clock(start), row });
      row++;
      k = end;
    } else {
      rowOf[k] = row;
      if (start % 60 === 0) marks.push({ label: clock(start), row });
      row++;
      k++;
    }
  }
  marks.push({ label: clock(last), row });

  // Lanes per day: a cluster of sessions that overlap one another shares the column.
  const blocks: PlannerBlock[] = [];
  for (const day of dayList) {
    const todays = sessions.filter(x => x.s.day === day);
    let cluster: PlannerBlock[] = [];
    let laneEnds: number[] = [];
    let clusterEnd = -1;
    const close = () => {
      for (const b of cluster) b.lanes = laneEnds.length;
      blocks.push(...cluster);
      cluster = [];
      laneEnds = [];
    };
    for (const x of todays) {
      if (x.from >= clusterEnd) close();
      let lane = laneEnds.findIndex(end => end <= x.from);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = x.to;
      clusterEnd = Math.max(clusterEnd, x.to);
      cluster.push({
        group: x.group, tone: groupTone(x.index), day, col: colOf.get(day)!,
        r1: rowOf[slotOf(x.from)], r2: rowOf[slotOf(x.to - 1)] + 1, label: span(x.s), lane, lanes: 1,
        provisional: x.s.provisional === true,
      });
    }
    close();
  }
  return { days, marks, gapRows, blocks };
}

/** The grid's row sizes: the day names, `--slot` per half hour, `--gap-row`, and a line under the last hour. */
export function plannerRows(p: Planner): string {
  const end = p.marks[p.marks.length - 1].row;
  const sizes: string[] = [];
  for (let r = 2; r < end; r++) sizes.push(p.gapRows.includes(r) ? 'var(--gap-row)' : 'var(--slot)');
  const runs: string[] = [];
  for (let i = 0; i < sizes.length; ) {
    let j = i;
    while (j < sizes.length && sizes[j] === sizes[i]) j++;
    runs.push(j - i > 1 ? `repeat(${j - i}, ${sizes[i]})` : sizes[i]);
    i = j;
  }
  return ['auto', ...runs, '1px'].join(' ');
}

/** A stretch of the schedule line; `provisional` on hours given only as an example (hatched). */
export type SchedulePart = { text: string; provisional?: boolean };

/**
 * A group's week in one line: "Luni, miercuri, vineri, 17:00–18:30" when every day has the same
 * hours (and all are confirmed, or all are examples), otherwise "Luni 18:30–20:30, sâmbătă
 * 10:00–12:00". The hours are parts of their own, so example hours can be hatched as on the
 * timetable; the days stay plain. Empty without sessions.
 */
export function scheduleParts(sessions: Session[]): SchedulePart[] {
  if (sessions.length === 0) return [];
  const sorted = [...sessions].sort((a, b) => a.day - b.day || minutes(a.start) - minutes(b.start));
  const day = (d: number, i: number) => (i === 0 ? DAY_NAMES[d - 1] : DAY_NAMES[d - 1].toLowerCase());
  const hours = (s: Session): SchedulePart => ({ text: span(s), provisional: s.provisional === true });
  const [first] = sorted;
  if (sorted.every(s => span(s) === span(first) && (s.provisional === true) === (first.provisional === true))) {
    const days = [...new Set(sorted.map(s => s.day))];
    return [{ text: `${days.map(day).join(', ')}, ` }, hours(first)];
  }
  return sorted.flatMap((s, i) => [{ text: `${i === 0 ? '' : ', '}${day(s.day, i)} ` }, hours(s)]);
}

export type ProgramPage = {
  planner?: Planner;
  filters: FilterOption[];
  /** `coachProvisional`: the coach is named only as an example. */
  tracks: { title: string; groups: { group: Group; tone: GroupTone; coach?: Coach; coachProvisional: boolean }[] }[];
  missingCoach: boolean;
  /** Something on the page (an hour or a coach) is an example the club has not confirmed. */
  provisional: boolean;
  note?: string;
};

const TRACK_TITLES = { performanta: 'Pentru cine vrea performanță', amatori: 'Pentru cine vrea doar să joace' } as const;

const weekCount = (n: number) => `${countRo(n, 'antrenament', 'antrenamente')} pe săptămână`;

export function programView(site: SiteData): ProgramPage {
  const planner = weekPlanner(site.groups);
  const toned = site.groups.map((group, i) => ({ group, tone: groupTone(i) }));
  // A filter only when there is a choice: two groups with sessions or more.
  const training = toned.filter(({ group }) => group.sessions.length > 0);
  const filters: FilterOption[] = training.length < 2 ? [] : [
    { value: 'toate', label: 'Toate grupele', countLabel: weekCount(training.reduce((n, t) => n + t.group.sessions.length, 0)) },
    ...training.map(({ group, tone }) => ({
      value: group.slug, label: group.name, swatch: SWATCH[tone],
      countLabel: `${weekCount(group.sessions.length)} la ${group.name}`,
    })),
  ];
  const coachOf = (g: Group) => site.coaches.find(c => c.id === g.coachId);
  const tracks = (['performanta', 'amatori'] as const)
    .map(track => ({
      title: TRACK_TITLES[track],
      groups: toned.filter(t => t.group.track === track).map(t => {
        const coach = coachOf(t.group);
        return { ...t, ...(coach ? { coach } : {}), coachProvisional: coach !== undefined && t.group.coachProvisional === true };
      }),
    }))
    .filter(t => t.groups.length > 0);
  return {
    ...(planner ? { planner } : {}),
    filters,
    tracks,
    missingCoach: site.groups.some(g => !coachOf(g)),
    provisional: site.groups.some(g => (coachOf(g) && g.coachProvisional) || g.sessions.some(s => s.provisional)),
    ...(site.info.programNote ? { note: site.info.programNote } : {}),
  };
}
