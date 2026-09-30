import 'server-only';

import { championOf, decidedCount, matchReady, roundLabel, roundsIn } from './bracket';
import { giveawayState } from './giveaway';
import type { RaffleOverlay, TournamentOverlay } from './overlay.shared';
import { activeTournament } from './tournaments';

/**
 * The state the stream overlays render, cut down to what can be public.
 *
 * The overlays are browser sources in OBS, which means a URL with no session
 * behind it — anyone who finds the address can read it. So the raffle reply is
 * not the admin state with a few fields hidden; it is built up from nothing,
 * and every field is here because it is already on stream anyway.
 */

/** Enough for the reel to look like a crowd without sending a whole chat. */
const REEL_NAMES = 60;

export async function raffleOverlay(): Promise<RaffleOverlay> {
  const g = await giveawayState();

  /* The pool the reel spins through. Winners are included because a winner
     leaves `entries` the moment they are drawn — the reel still has to have
     them in it to land on them. Names only; see `RaffleOverlay.names`. */
  const pool = [...g.entries, ...g.winners].map((e) => e.username);
  const names = [...new Set(pool)].slice(-REEL_NAMES);

  return {
    now: Date.now(),
    open: g.open,
    keyword: g.keyword,
    entryCount: g.entryCount,
    names,
    winner: g.winner ? { username: g.winner.username } : null,
    drawnAt: g.drawnAt,
    winnerCount: g.winners.length,
  };
}

/**
 * The featured tournament: whichever is live, else the last one finished.
 *
 * Drafts never appear, for the same reason they are kept off the public page —
 * see `publicTournaments`. A half-typed bracket on stream is worse than none.
 */
export async function tournamentOverlay(): Promise<TournamentOverlay> {
  const t = await activeTournament();
  if (!t) return { now: Date.now(), tournament: null };

  const rounds = roundsIn(t.matches);
  const open = t.matches.filter((m) => !m.winner);

  /* The stage is the earliest round with anything left in it. Taken as a
     minimum rather than "the round after the last decided match", because an
     admin can settle a semi before the last quarter is in — the stage is
     still the quarters until every quarter is done. */
  const currentRound = open.length ? Math.min(...open.map((m) => m.round)) : rounds - 1;

  const live =
    open
      .filter((m) => m.round === currentRound && matchReady(m))
      .sort((a, b) => a.position - b.position)[0] ?? null;

  const champion = championOf(t.matches);

  return {
    now: Date.now(),
    tournament: {
      name: t.name,
      prize: t.prize,
      size: t.size,
      status: champion ? 'complete' : 'live',
      rounds,
      currentRound,
      stage: champion ? 'Champion' : roundLabel(currentRound, rounds),
      stages: Array.from({ length: rounds }, (_, r) => roundLabel(r, rounds)),
      decided: decidedCount(t.matches),
      total: t.matches.length,
      liveMatchId: live?.id ?? null,
      matches: t.matches,
      champion,
    },
  };
}
