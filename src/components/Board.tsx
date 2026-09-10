import { FeedState } from '@/components/FeedState';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER } from '@/lib/partners';
import type { Leaderboard } from '@/lib/types';

/**
 * The full standings: every paying seat, in order.
 *
 * The prize table decides how many rows there are, not how many players turned
 * up — so an unclaimed place renders with its prize attached and says the seat
 * is open. At this community size that is the honest picture and also the more
 * persuasive one.
 */
export function Board({ board }: { board: Leaderboard }) {
  return (
    <div className="board">
      {board.error && (
        <p className="notice" style={{ marginBottom: 16 }}>
          <span className="notice-mark" aria-hidden>
            !
          </span>
          Standings are temporarily unavailable. The prize table below is correct; the placings will
          fill back in once the feed returns.
        </p>
      )}

      {/* Above the head rather than beside the title: it qualifies the numbers
          in the rows, and an empty board is exactly when someone wants it. */}
      <FeedState at={board.updatedAt} live={board.source === 'live' && !board.error} />

      <div className="board-head" role="presentation">
        <span>Rank</span>
        <span>Player</span>
        <span>Wagered</span>
        <span>Prize</span>
      </div>

      {board.entries.map((entry) => (
        <div
          className="board-row"
          key={entry.rank}
          data-rank={entry.rank}
          data-open={entry.unclaimed}
        >
          <span className="board-rank">{entry.rank}</span>

          <span className="board-player">
            {/* The operator mark, always — see the note in `Podium`. Rows and
                cards have to agree here: rank emblems in one and not the other
                would read as the rows having lost something. */}
            <span className="board-avatar">
              <span className="board-avatar-mark" aria-hidden />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="board-name">{entry.unclaimed ? 'Open seat' : entry.username}</span>
              {entry.favouriteGame && <span className="board-game">{entry.favouriteGame}</span>}
            </span>
          </span>

          <span className="board-wagered">
            {entry.unclaimed ? '—' : formatMoney(entry.wagered, { cents: true })}
          </span>

          <span className="board-prize">
            <span className="sym">$</span>
            {entry.prize.toLocaleString('en-US')}
          </span>
        </div>
      ))}

    </div>
  );
}

export function BoardStats({ board }: { board: Leaderboard }) {
  return (
    <div className="board-stats">
      <div className="stat">
        <div className="stat-v">{board.stats.players.toLocaleString('en-US')}</div>
        <span className="stat-k">Players on the board</span>
      </div>
      <div className="stat">
        <div className="stat-v">{formatMoney(board.stats.totalWagered)}</div>
        <span className="stat-k">{PRIMARY_PARTNER.metricLabel} this month</span>
      </div>
      <div className="stat">
        <div className="stat-v">{formatMoney(board.stats.topWager)}</div>
        <span className="stat-k">Leading figure</span>
      </div>
    </div>
  );
}
