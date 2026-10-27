import { FeedState } from '@/components/FeedState';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER } from '@/lib/partners';
import type { Leaderboard, LeaderboardEntry } from '@/lib/types';

/**
 * The full standings: every paying seat, in order.
 *
 * The prize table decides how many rows there are, not how many players turned
 * up — so an unclaimed place renders with its prize attached and says the seat
 * is open. At this community size that is the honest picture and also the more
 * persuasive one.
 */
export function Board({
  board,
  feed,
}: {
  board: Leaderboard;
  /** Replaces the live-feed line — a past month is not live, and says so. */
  feed?: React.ReactNode;
}) {
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
      {feed ?? <FeedState at={board.updatedAt} live={board.source === 'live' && !board.error} />}

      <div className="board-head" role="presentation">
        <span>Rank</span>
        <span>Player</span>
        <span>Wagered</span>
        <span>Prize</span>
      </div>

      {board.entries.map((entry) => {
        const short = shortOfMinimum(entry, board.claimMinimum);
        return (
          <div
            className="board-row"
            key={entry.rank}
            data-rank={entry.rank}
            data-open={entry.unclaimed}
            data-short={short > 0 || undefined}
          >
            <span className="board-rank">{entry.rank}</span>

            <span className="board-player">
              {/* The operator mark, always — see the note in `Podium`. Rows and
                  cards have to agree here: rank emblems in one and not the other
                  would read as the rows having lost something. */}
              <span className="board-avatar">
                <span className="board-avatar-mark" aria-hidden />
              </span>
              {/* The name and nothing else. The row used to carry the player's
                  most-played game under it, which said something about them
                  rather than about the board they are on — and on a masked name
                  it is the only identifying detail left. */}
              <span className="board-name">{entry.unclaimed ? 'Open seat' : entry.username}</span>
            </span>

            <span className="board-wagered">
              {entry.unclaimed ? '—' : formatMoney(entry.wagered, { cents: true })}
            </span>

            <span className="board-prize">
              <span className="board-prize-amount">
                <span className="sym">$</span>
                {entry.prize.toLocaleString('en-US')}
              </span>
              {/* The place still shows, struck rather than hidden: the prize
                  is what they are short of, and how far short is what they
                  can act on. */}
              {short > 0 && (
                <span
                  className="board-short"
                  title={`Under the ${formatMoney(board.claimMinimum)} minimum to claim a prize`}
                >
                  {formatMoney(short)} short
                </span>
              )}
            </span>
          </div>
        );
      })}

      {board.claimMinimum > 0 && (
        <p className="board-minimum">
          {formatMoney(board.claimMinimum)} minimum wagered to claim a prize.
        </p>
      )}
    </div>
  );
}

/**
 * How far a paying place is below the claim minimum, or 0 if it is not.
 *
 * Open seats and unpaid places are never short — there is nobody to be short,
 * or nothing to claim. Rounded *up* to the whole dollar: the figure is read as
 * "wager this much more", and $225.49 shown as "$225 short" would leave anyone
 * who did exactly that still under. Rounding up also means a player a fraction
 * of a cent under reads "$1 short", never "$0 short".
 */
export function shortOfMinimum(entry: LeaderboardEntry, minimum: number): number {
  if (!minimum || entry.unclaimed || entry.prize <= 0) return 0;
  const gap = minimum - entry.wagered;
  return gap > 0 ? Math.ceil(gap) : 0;
}

export function BoardStats({
  board,
  when = 'this month',
}: {
  board: Leaderboard;
  /** "this month", or "in September" on a past board. */
  when?: string;
}) {
  return (
    <div className="board-stats">
      <div className="stat">
        <div className="stat-v">{board.stats.players.toLocaleString('en-US')}</div>
        <span className="stat-k">Players on the board</span>
      </div>
      <div className="stat">
        <div className="stat-v">{formatMoney(board.stats.totalWagered)}</div>
        <span className="stat-k">
          {PRIMARY_PARTNER.metricLabel} {when}
        </span>
      </div>
      <div className="stat">
        <div className="stat-v">{formatMoney(board.stats.topWager)}</div>
        <span className="stat-k">Leading figure</span>
      </div>
    </div>
  );
}
