import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  buildBracket,
  championOf,
  decidedCount,
  isBracketSize,
  type BracketSize,
  type Match,
} from './bracket';
import { mutateJson, readJson } from './store';

/**
 * Tournament storage.
 *
 * Goes through `lib/store.ts` rather than opening its own file handle the way
 * `hunts.ts` and `guesses.ts` do — those predate the shared module. The
 * guarantees are the same either way (atomic write, serialised per file) and
 * the limitation is the same too: one process only.
 *
 * A tournament is a name, a size and a flat list of matches. All of the bracket
 * logic lives in `lib/bracket.ts` as pure functions; this module's whole job is
 * to persist the result and answer "which ones may the public see".
 */

export type TournamentStatus = 'draft' | 'live' | 'complete';

export interface Tournament {
  id: string;
  name: string;
  size: BracketSize;
  status: TournamentStatus;
  /** Free text — "$500", "3 months VIP". Shown as written, never parsed. */
  prize: string;
  createdAt: string;
  completedAt: string | null;
  matches: Match[];
}

interface Store {
  tournaments: Tournament[];
}

const FILE = 'tournaments.json';
const EMPTY: Store = { tournaments: [] };

/* ------------------------------------------------------------------ reads */

/** Everything, newest first. Admin only — this includes drafts. */
export async function listTournaments(): Promise<Tournament[]> {
  const { tournaments } = await readJson<Store>(FILE, EMPTY);
  return [...tournaments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * What a signed-out visitor is allowed to see.
 *
 * Drafts are excluded. A bracket is built before the event — entrants get
 * typed in over several minutes, half-filled — and a half-built bracket on the
 * public page reads as a real draw with people missing from it. The admin
 * publishes when it is ready, which is the same reason a section that is not
 * finished gets a holding page rather than a nav entry leading nowhere.
 */
export async function publicTournaments(): Promise<Tournament[]> {
  return (await listTournaments()).filter((t) => t.status !== 'draft');
}

export async function getTournament(id: string): Promise<Tournament | undefined> {
  return (await listTournaments()).find((t) => t.id === id);
}

/** The one to feature: whichever is running, else the most recently finished. */
export async function activeTournament(): Promise<Tournament | undefined> {
  const open = await publicTournaments();
  return open.find((t) => t.status === 'live') ?? open[0];
}

/* ----------------------------------------------------------------- writes */

export async function createTournament(
  name: string,
  size: number,
  prize: string,
): Promise<Tournament | null> {
  if (!isBracketSize(size)) return null;

  const tournament: Tournament = {
    id: randomUUID(),
    name,
    size,
    status: 'draft',
    prize,
    createdAt: new Date().toISOString(),
    completedAt: null,
    matches: buildBracket(size),
  };

  await mutateJson<Store>(FILE, EMPTY, (s) => {
    s.tournaments.unshift(tournament);
  });
  return tournament;
}

/**
 * Replaces the bracket wholesale.
 *
 * The editor holds the whole thing in memory and sends it back after each
 * change, because every bracket operation already returns a new `Match[]` and
 * a tournament is at most 31 matches. Sending a patch would mean writing a
 * second implementation of the bracket rules on the server and keeping the two
 * in step, which is precisely the bug this avoids.
 *
 * Completion is derived here rather than trusted from the client: a tournament
 * is complete when its final has a winner, and nothing else can set that.
 */
export async function saveBracket(id: string, matches: Match[]): Promise<void> {
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const t = s.tournaments.find((x) => x.id === id);
    if (!t) return;
    t.matches = matches;

    const done = championOf(matches) !== null;
    if (done && t.status === 'live') {
      t.status = 'complete';
      t.completedAt = new Date().toISOString();
    } else if (!done && t.status === 'complete') {
      // A reset final puts it back in play rather than leaving a finished
      // tournament with no champion, which would render as an empty trophy.
      t.status = 'live';
      t.completedAt = null;
    }
  });
}

export async function setTournamentStatus(id: string, status: TournamentStatus): Promise<void> {
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const t = s.tournaments.find((x) => x.id === id);
    if (!t) return;
    t.status = status;
    t.completedAt = status === 'complete' ? (t.completedAt ?? new Date().toISOString()) : null;
  });
}

export async function updateTournamentMeta(
  id: string,
  meta: { name?: string; prize?: string },
): Promise<void> {
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const t = s.tournaments.find((x) => x.id === id);
    if (!t) return;
    if (meta.name !== undefined) t.name = meta.name;
    if (meta.prize !== undefined) t.prize = meta.prize;
  });
}

export async function deleteTournament(id: string): Promise<void> {
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    s.tournaments = s.tournaments.filter((t) => t.id !== id);
  });
}

/* ---------------------------------------------------------------- derived */

export interface TournamentProgress {
  decided: number;
  total: number;
  champion: ReturnType<typeof championOf>;
}

export function tournamentProgress(t: Tournament): TournamentProgress {
  return {
    decided: decidedCount(t.matches),
    total: t.matches.length,
    champion: championOf(t.matches),
  };
}
