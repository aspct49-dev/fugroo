import type { Metadata } from 'next';

import { Board, BoardStats } from '@/components/Board';
import { BrandStrips } from '@/components/BrandStrips';
import { Countdown } from '@/components/Countdown';
import { CopyCode } from '@/components/CopyCode';
import { Podium } from '@/components/Podium';
import { ExternalIcon } from '@/components/icons';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER, WAGER_NOTE, WAGER_WEIGHTS } from '@/lib/partners';
import { pageMeta } from '@/lib/site';
import { getLeaderboard } from '@/lib/services/leaderboard';

export const revalidate = 60;

export const metadata: Metadata = pageMeta({
  title: 'Leaderboard',
  description: `The ${formatMoney(PRIMARY_PARTNER.prizePool)} monthly ${PRIMARY_PARTNER.name} wager leaderboard. Ten paying places, settled at the end of every month.`,
  path: '/leaderboard',
});

export default async function LeaderboardPage() {
  const board = await getLeaderboard('roobet');

  return (
    <>
      {/*
       * Operator mark, the offer as one headline, the terms in a line, and the
       * two things to do — then the top three. The order is the order someone
       * reads it in: whose board, how much, on what condition, how to enter.
       */}
      <header className="lb-head">
        <div className="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
          <img className="lb-partner" src={PRIMARY_PARTNER.logo} alt={PRIMARY_PARTNER.name} />

          <h1 className="lb-headline">
            <span className="lb-amount">{formatMoney(board.prizePool)}</span> monthly leaderboard
          </h1>

          <p className="lb-lede">
            Compete against everyone else playing under code <b>{PRIMARY_PARTNER.code}</b>. Ten
            places pay, and the board settles at the end of the month.
          </p>

          <div className="lb-actions">
            <CopyCode code={PRIMARY_PARTNER.code} />
            <a
              className="btn btn-primary"
              href={PRIMARY_PARTNER.signupUrl}
              target="_blank"
              rel="noreferrer"
            >
              Visit {PRIMARY_PARTNER.name}
              <ExternalIcon />
            </a>
          </div>

          <div className="lb-podium">
            <Podium board={board} />
          </div>

          <Countdown endsAt={board.periodEnd} />
        </div>
      </header>

      {/* The way in, restated right where someone has just read the prizes. */}
      <BrandStrips only="partner" />

      <section className="section wrap">
        <Board board={board} />
        <BoardStats board={board} />

        {/* On the page the board is on, not one click away. Someone querying
            their position is standing right here when they do it. */}
        <div className="rules card">
          <h2 className="h-section">Wager rules</h2>
          <p className="lede" style={{ marginTop: 12 }}>
            {WAGER_NOTE} Every game counts toward the board — dice included — but not every game
            counts the same:
          </p>

          <div style={{ marginTop: 16 }}>
            {WAGER_WEIGHTS.map((w) => (
              <div className="kv" key={w.band}>
                <span>{w.band}</span>
                <b>{w.weight} of wager counted</b>
              </div>
            ))}
          </div>

          <p className="notice" style={{ marginTop: 18 }}>
            <span className="notice-mark" aria-hidden>
              !
            </span>
            Any abuse found by {PRIMARY_PARTNER.code} or {PRIMARY_PARTNER.name} may result in your
            prize being forfeit.
          </p>
        </div>
      </section>
    </>
  );
}
