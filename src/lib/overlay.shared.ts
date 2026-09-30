/**
 * What the stream overlays are sent, and the timing they share with the admin
 * panel.
 *
 * Split from `overlay.ts` because that file is `server-only` and the overlay
 * pages are client components that poll — they need the shapes, not the store.
 */

import type { Match, Player } from './bracket';

/**
 * How long the raffle reel spins, from the moment the draw is made.
 *
 * Shared by the admin panel's reel and the overlay's, so the two land on the
 * same name at the same moment. If they disagreed, the stream would show the
 * winner before the streamer's own screen did, or after it — and either way
 * the reaction on camera would be out of step with what viewers see.
 */
export const SPIN_MS = 5200;

/** How often the overlays ask for fresh state. */
export const OVERLAY_POLL_MS = 1500;

export interface RaffleOverlay {
  /** Server clock at the time of the reply, so the reel can time itself
   *  against the draw without trusting the streaming PC's clock. */
  now: number;
  open: boolean;
  keyword: string;
  entryCount: number;
  /**
   * Kick names of the people in the pool, for the reel to spin through.
   *
   * Only the chat handle — the same name that was typed into public chat to
   * enter. The Roobet account behind it, which the code gate matched on, is
   * never sent: the overlay is a public URL.
   */
  names: string[];
  winner: { username: string } | null;
  drawnAt: number | null;
  /** How many have been drawn this round, including the latest. */
  winnerCount: number;
}

export interface TournamentOverlay {
  now: number;
  tournament: {
    name: string;
    prize: string;
    size: number;
    status: 'live' | 'complete';
    rounds: number;
    /** The round being played, or the final once it is all decided. */
    currentRound: number;
    /** "Quarter-finals", "Final" — see `roundLabel`. */
    stage: string;
    /** Every round's name, first to last, for the bracket headers. */
    stages: string[];
    decided: number;
    total: number;
    /** The next match to be played: both names in, no result yet. */
    liveMatchId: string | null;
    /** The bracket as stored. Nothing in it is private — the tournaments
     *  page renders every field of it already. */
    matches: Match[];
    champion: Player | null;
  } | null;
}
