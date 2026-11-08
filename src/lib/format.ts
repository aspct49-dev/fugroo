/** Formatting and masking. Shared by providers and components. */

/**
 * Usernames are masked to their last four characters — the convention across
 * casino affiliate leaderboards, and the reason providers never hand a full
 * name to the UI.
 */
export function maskUsername(name: string | null | undefined): string {
  if (!name) return '****';
  if (name.length <= 4) return '*'.repeat(4) + name;
  return '*'.repeat(Math.min(name.length - 4, 8)) + name.slice(-4);
}

/** Wagers run to five figures; the cents are noise. */
export function formatMoney(n: number, opts: { cents?: boolean } = {}): string {
  /*
   * Something under a cent, but not nothing.
   *
   * This used to print the real figure to four places, for bonus hunts, where
   * a 138x off a third of a cent is the interesting part. That section is
   * gone, and on a leaderboard the same rule put "$0.0072" in a column next to
   * "$6,448.82" — which reads as a rendering fault, not as a small number.
   * "$0.00" would be worse: it says they wagered nothing while a prize sits
   * beside it. So say what is actually true and say it at the column's own
   * precision.
   */
  if (opts.cents && n > 0 && n < 0.01) return '<$0.01';
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: opts.cents ? 2 : 0,
      maximumFractionDigits: opts.cents ? 2 : 0,
    })
  );
}

export function formatMultiplier(n: number): string {
  return (n >= 100 ? Math.round(n) : Number(n.toFixed(2))).toLocaleString('en-US') + '×';
}

/**
 * The day of the month a board starts on, by the month it took effect —
 * dated like the prize history, so changing it never moves a finished board.
 *
 * Boards ran on calendar months until October 2026. The board was then paused
 * at the start of November and restarted on Friday 6 November, counting from
 * that day, and from then on every board runs from the 6th to the 5th. The
 * days in between (1–5 November) belong to no board.
 */
const START_DAY_HISTORY: { from: MonthKey; day: number }[] = [
  { from: '2026-11', day: 6 },
  { from: '2026-09', day: 1 },
];

function startDayFor(key: MonthKey): number {
  const hit = START_DAY_HISTORY.find((h) => h.from <= key);
  return (hit ?? START_DAY_HISTORY[START_DAY_HISTORY.length - 1]).day;
}

/**
 * The board running at a given moment.
 *
 * A board is named for the month it *starts* in, so on 3 December the board
 * running is November's (6 Nov – 5 Dec). In a gap between boards — the days
 * the board was paused — this returns the next one to start.
 */
export function currentPeriod(now: Date = new Date()) {
  const here = periodForMonth(monthKey(now));
  if (now >= here.start) return here;

  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prev = periodForMonth(monthKey(prevMonth));
  return now <= prev.end ? prev : here;
}

/**
 * A leaderboard month as `YYYY-MM`, in UTC — the board's own calendar.
 *
 * The one key for a month everywhere it is stored or linked: the archive is
 * keyed on it, the prize history is dated with it, and it is the URL segment
 * of a past board. A string rather than a Date because two Dates for the same
 * month are never `===`, and that has to be true for a lookup to work.
 */
export type MonthKey = `${number}-${number}`;

export function monthKey(d: Date): MonthKey {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` as MonthKey;
}

export function isMonthKey(s: string): s is MonthKey {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

/**
 * The board named for a month: from its start day, to the second before the
 * same day of the next month, in UTC.
 *
 * The end is measured with the board's *own* start day, not the next board's —
 * so October (a calendar month) ends on 31 October rather than stretching to
 * where November's board begins.
 */
export function periodForMonth(key: MonthKey) {
  const [y, m] = key.split('-').map(Number);
  const day = startDayFor(key);
  const start = new Date(Date.UTC(y, m - 1, day, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, day, 0, 0, 0) - 1000);
  return { start, end };
}

/** "6 November – 5 December", for saying when a board runs. */
export function periodRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/** "September 2026". */
export function monthLabel(key: MonthKey): string {
  return periodLabel(periodForMonth(key).start.toISOString());
}

export function periodLabel(start: string): string {
  return new Date(start).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
