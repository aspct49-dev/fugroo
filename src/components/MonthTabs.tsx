import Link from 'next/link';

import { monthLabel, type MonthKey } from '@/lib/format';

/**
 * The switcher between this month's board and the finished ones.
 *
 * Sits at the top of the standings on every leaderboard page, current and
 * past alike, so moving between months is one tap from anywhere and the way
 * back to the live board is always the first tab. Server-rendered links rather
 * than client tabs: each month is its own URL, so a past board can be linked
 * in Discord and still say which month it is.
 */
export function MonthTabs({
  months,
  selected,
}: {
  /** Finished months, newest first. */
  months: MonthKey[];
  /** The month on screen, or null for the live board. */
  selected: MonthKey | null;
}) {
  if (!months.length) return null;

  return (
    <nav className="lb-months" aria-label="Leaderboard month">
      <Link
        href="/leaderboard"
        className="lb-month"
        data-active={selected === null || undefined}
        aria-current={selected === null ? 'page' : undefined}
      >
        <span className="lb-month-dot" aria-hidden /> This month
      </Link>
      {months.map((m) => (
        <Link
          key={m}
          href={`/leaderboard/${m}`}
          className="lb-month"
          data-active={selected === m || undefined}
          aria-current={selected === m ? 'page' : undefined}
        >
          {monthLabel(m)}
        </Link>
      ))}
    </nav>
  );
}
