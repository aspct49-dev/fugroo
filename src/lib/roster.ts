import 'server-only';

/**
 * Everyone who has ever wagered under the code.
 *
 * The leaderboard asks Roobet for the current month. This asks for all of it,
 * because the question here is different: not "who is winning" but "is this
 * person one of ours". Someone who played in March and not since is still
 * under the code.
 *
 * The one thing to know about the endpoint is that it only returns players
 * **with wagering activity**. Somebody who signed up ten minutes ago and has
 * not placed a bet does not appear, and will be told they are not under the
 * code — which is true as far as Roobet is concerned, and is why the message
 * says to place a bet rather than to check the spelling.
 */

const ENDPOINT = 'https://roobetconnect.com/affiliate/v2/stats';

/** Roobet launched well after this; it just has to predate every account. */
const SINCE = process.env.ROOBET_STATS_SINCE ?? '2020-01-01';

export interface RosterPlayer {
  username: string;
  wagered: number;
  weightedWagered: number;
}

interface Cached {
  at: number;
  players: Map<string, RosterPlayer>;
}

/**
 * Five minutes. The list changes slowly and the endpoint rate limits hard, so
 * every eligibility check in a giveaway hitting it live would be both wasteful
 * and the fastest way to get throttled mid-stream.
 */
const TTL = 5 * 60_000;
let cache: Cached | null = null;
let inflight: Promise<Cached> | null = null;

async function load(): Promise<Cached> {
  const token = process.env.ROOBET_API_KEY;
  const userId = process.env.ROOBET_USER_ID;
  if (!token || !userId) throw new Error('Roobet credentials are not set');

  const url = new URL(ENDPOINT);
  url.searchParams.set('userId', userId.trim());
  url.searchParams.set('startDate', SINCE);
  url.searchParams.set('endDate', new Date().toISOString().slice(0, 10));

  const res = await fetch(url, {
    headers: { accept: 'application/json', authorization: `Bearer ${token.trim()}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Roobet responded ${res.status}`);

  const rows = (await res.json()) as {
    username: string;
    wagered?: number;
    weightedWagered?: number;
  }[];

  const players = new Map<string, RosterPlayer>();
  for (const row of rows) {
    if (!row.username) continue;
    // Keyed lower-case: Roobet is inconsistent about casing between its API
    // and its dashboard, and a player typing their own name will not match the
    // casing either.
    players.set(row.username.trim().toLowerCase(), {
      username: row.username,
      wagered: row.wagered ?? 0,
      weightedWagered: row.weightedWagered ?? row.wagered ?? 0,
    });
  }
  return { at: Date.now(), players };
}

/**
 * The roster, cached. `force` skips the age check but still shares an in-flight
 * request, so a room full of people hitting re-check at once makes one call.
 */
export async function roster(force = false): Promise<Cached> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache;
  if (inflight) return inflight;
  inflight = load()
    .then((next) => {
      cache = next;
      return next;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export interface RosterCheck {
  found: boolean;
  player: RosterPlayer | null;
  /** When the list this answer came from was fetched. */
  checkedAt: number;
  error?: string;
}

export async function checkRoobet(username: string, force = false): Promise<RosterCheck> {
  const key = username.trim().toLowerCase();
  if (!key) return { found: false, player: null, checkedAt: Date.now() };
  try {
    const { players, at } = await roster(force);
    const player = players.get(key) ?? null;
    return { found: Boolean(player), player, checkedAt: at };
  } catch (err) {
    // A lookup failure is not the same as "not under the code", and must not
    // be reported as one — that would refuse a legitimate entry.
    return {
      found: false,
      player: null,
      checkedAt: Date.now(),
      error: err instanceof Error ? err.message : 'Lookup failed',
    };
  }
}
