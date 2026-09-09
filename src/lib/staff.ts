/**
 * Accounts that never appear on a leaderboard.
 *
 * Staff play under the same referral code as everyone else, so they show up in
 * the affiliate feed like any other player. Excluding them here keeps them out
 * of the standings, the prize places and the whole-board stats alike.
 *
 * Matching is case-insensitive and trimmed, because operators do not agree on
 * casing between their APIs and their dashboards.
 */
const EXCLUDED = ['fugroo'];

export function isExcludedPlayer(username: string | null | undefined): boolean {
  if (!username) return false;
  return EXCLUDED.includes(username.trim().toLowerCase());
}

/** Drops excluded accounts from a set of rows before ranking or totalling. */
export function withoutExcluded<T>(rows: T[], getUsername: (row: T) => string): T[] {
  return rows.filter((row) => !isExcludedPlayer(getUsername(row)));
}
