import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Board, BoardStats } from '@/components/Board';
import { MonthTabs } from '@/components/MonthTabs';
import { Podium } from '@/components/Podium';
import { pastLeaderboard, pastMonths } from '@/lib/archive';
import { currentPeriod, formatMoney, isMonthKey, monthKey, monthLabel, type MonthKey } from '@/lib/format';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { pageMeta } from '@/lib/site';

/**
 * A finished month's board — `/leaderboard/2026-09`.
 *
 * The same podium and standings as the live page, minus everything that only
 * makes sense while a month is running: no countdown, no live-feed line, no
 * "sign up and climb". What it adds is which month it was and whether the
 * figures are final — see `lib/archive.ts` for what "final" means here.
 */

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ month: string }> };

/** The month in the URL, if it is one with a finished board. */
function resolve(raw: string): MonthKey | 'current' | null {
  if (!isMonthKey(raw)) return null;
  if (raw === monthKey(currentPeriod().start)) return 'current';
  return pastMonths().includes(raw) ? raw : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { month } = await params;
  const m = resolve(month);
  if (!m || m === 'current') return {};
  return pageMeta({
    title: `${monthLabel(m)} Leaderboard`,
    description: `Final standings and prizes from the ${monthLabel(m)} ${PRIMARY_PARTNER.name} wager leaderboard under code ${PRIMARY_PARTNER.code}.`,
    path: `/leaderboard/${m}`,
  });
}

const DAY = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', DAY);

export default async function PastLeaderboardPage({ params }: Params) {
  const { month } = await params;
  const m = resolve(month);
  // This month's board lives at /leaderboard; a link to it by date goes there.
  if (m === 'current') redirect('/leaderboard');
  if (!m) notFound();

  const past = await pastLeaderboard('roobet', m);
  const { board } = past;
  const label = monthLabel(m);
  const shortMonth = label.split(' ')[0];

  return (
    <>
      <header className="lb-head">
        <div className="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
          <img className="lb-partner" src={PRIMARY_PARTNER.logo} alt={PRIMARY_PARTNER.name} />

          <p className="lb-past-tag" data-final={past.status === 'final' || undefined}>
            {label} · {past.status === 'final' ? 'Final standings' : 'Provisional'}
          </p>

          <h1 className="lb-headline">
            <span className="lb-amount">{formatMoney(board.prizePool)}</span> leaderboard
          </h1>

          <p className="lb-lede">
            Ended {date(board.periodEnd)}.{' '}
            {past.status === 'final'
              ? 'Prizes are settled on these standings.'
              : `Figures can still move as late play settles — they are final from ${date(past.settlesAt)}.`}
          </p>

          <div className="lb-podium">
            <Podium board={board} />
          </div>
        </div>
      </header>

      <section className="section wrap">
        <MonthTabs months={pastMonths()} selected={m} />
        <Board
          board={board}
          feed={
            <p className="feed-state" data-live={past.status === 'final' || undefined}>
              <span className="feed-dot" aria-hidden />
              {board.error
                ? 'Feed unavailable'
                : past.status === 'final'
                  ? `Final · saved ${date(past.frozenAt!)}`
                  : `Provisional · final from ${date(past.settlesAt)}`}
            </p>
          }
        />
        <BoardStats board={board} when={`in ${shortMonth}`} />
      </section>
    </>
  );
}
