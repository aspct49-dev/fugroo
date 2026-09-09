import { formatMoney } from '@/lib/format';
import type { Leaderboard, LeaderboardEntry } from '@/lib/types';
import { TrophyIcon } from './icons';

/**
 * The top three, drawn entirely in CSS — the plates, their haze and the avatar
 * sockets. Nothing here is a banner image, which is what keeps the names and
 * the figures live text: it updates itself when the standings move, stays
 * legible at any width, and a screen reader can read it.
 *
 * The prize sits inside the card under a hairline, rather than on a bar
 * hanging beneath it. Three cards each trailing a separate slab put four
 * horizontal edges across the row and forced a gap between the columns to keep
 * them apart; one block per player closes the row up.
 *
 * Sizes inside the card are in `cqi`, so the same component is the small card
 * in the home page promo and the large one on the leaderboard.
 */

const PLACES = [
  { place: 2, rank: 'var(--rank-2)', label: '2nd' },
  { place: 1, rank: 'var(--rank-1)', label: '1st' },
  { place: 3, rank: 'var(--rank-3)', label: '3rd' },
] as const;

export function Podium({ board }: { board: Leaderboard }) {
  return (
    <div className="podium">
      {PLACES.map(({ place, rank, label }) => (
        <PodiumCard
          key={place}
          entry={board.entries[place - 1]}
          place={place}
          rank={rank}
          label={label}
        />
      ))}
    </div>
  );
}

function PodiumCard({
  entry,
  place,
  rank,
  label,
}: {
  entry: LeaderboardEntry | undefined;
  place: number;
  rank: string;
  label: string;
}) {
  // A paying seat nobody has taken is the ordinary case at this community
  // size, so the card renders with the prize still on it and says so plainly.
  const open = !entry || entry.unclaimed;

  return (
    <article
      className="pod"
      data-place={place}
      data-open={open}
      style={{ ['--rank' as string]: rank }}
    >
      <div className="pod-badge">
        <TrophyIcon />
        {label}
      </div>

      <div className="pod-card">
        <div className="pod-face">
          <div className="pod-avatar">
            {/* Roobet publishes a tier badge per player. Where there is one it
                fills the socket; where there is not, the operator mark stands
                in, masked to the rank colour. */}
            {!open && entry.tierBadgeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote operator asset
              <img src={entry.tierBadgeUrl} alt="" aria-hidden />
            ) : (
              <span className="pod-avatar-mark" aria-hidden />
            )}
          </div>

          <p className="pod-name">{open ? 'Open seat' : entry.username}</p>

          <p className="pod-metric">Wagered</p>
          <p className="pod-wagered">
            <span className="sym">$</span>
            {(open ? 0 : entry.wagered).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>

          <div className="pod-rule" />

          <p className="pod-metric">Prize</p>
          <p className="pod-prize">{formatMoney(entry?.prize ?? 0)}</p>
        </div>
      </div>
    </article>
  );
}
