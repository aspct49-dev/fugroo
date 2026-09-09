import { maskUsername } from '../format';
import type { LeaderboardEntry } from '../types';

/**
 * What a provider knows about a player before ranks and prizes are applied.
 *
 * `username` is the operator's raw name. Masking happens in `buildEntries`
 * rather than in each provider, so a new integration cannot forget it.
 */
export interface RawPlayer {
  username: string;
  wagered: number;
  favouriteGame?: string;
  /** Partner's own avatar or player-tier badge, if it publishes one. */
  tierBadgeUrl?: string;
}

/**
 * Turns however many players a partner returned into exactly as many seats as
 * the prize table pays.
 *
 * The affiliate base is small, so an empty seat is the normal case rather than
 * an edge case: every paying position renders, and the ones nobody has taken
 * come back `unclaimed` with the prize still attached. A leaderboard with two
 * players then reads as places going spare, which is both the honest picture
 * and the more persuasive one.
 */
export function buildEntries(players: RawPlayer[], prizeTable: number[]): LeaderboardEntry[] {
  return prizeTable.map((prize, i) => {
    const player = players[i];
    if (!player) {
      return { rank: i + 1, username: '', wagered: 0, prize, unclaimed: true };
    }
    return {
      rank: i + 1,
      username: maskUsername(player.username),
      wagered: player.wagered,
      prize,
      favouriteGame: player.favouriteGame,
      tierBadgeUrl: player.tierBadgeUrl,
      unclaimed: false,
    };
  });
}
