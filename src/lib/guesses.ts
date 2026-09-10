import 'server-only';

import { randomUUID } from 'node:crypto';

import { mutateJson, readJson } from './store';

/**
 * Guess the balance.
 *
 * A round is opened against a bonus hunt, everyone submits one guess at what
 * the hunt will finish on, entries close, and the closest guess when the admin
 * draws takes it.
 *
 * Storage goes through `lib/store.ts`, like the tournaments and the profiles.
 * It used to open its own file handle, which meant it was the one table that
 * would not follow the store to a different backend — and so the one table
 * that broke the moment the site ran anywhere without a writable disk.
 */

export interface Guess {
  /** Discord id. One guess per account, and the id is the only stable handle. */
  userId: string;
  username: string;
  avatar: string | null;
  value: number;
  at: string;
}

export type GameStatus = 'open' | 'closed' | 'drawn';

export interface Game {
  id: string;
  name: string;
  /** What the hunt was funded with, shown as the anchor for a guess. */
  startBalance: number;
  numBonuses: number;
  /** Set when the round was opened against a hunt, so the draw can read the
   *  real figure instead of it being typed in twice. */
  huntId: string | null;
  status: GameStatus;
  createdAt: string;
  drawnAt: string | null;
  finalBalance: number | null;
  guesses: Guess[];
}

interface Store {
  games: Game[];
}

const FILE = 'guesses.json';
const EMPTY: Store = { games: [] };

async function read(): Promise<Store> {
  return readJson<Store>(FILE, EMPTY);
}

async function mutate(fn: (s: Store) => void): Promise<void> {
  await mutateJson<Store>(FILE, EMPTY, fn);
}

/* ------------------------------------------------------------------ reads */

export async function listGames(): Promise<Game[]> {
  const { games } = await read();
  return [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The round on show: whichever is still running, else the most recent. */
export async function activeGame(): Promise<Game | undefined> {
  const games = await listGames();
  return games.find((g) => g.status !== 'drawn') ?? games[0];
}

/* ----------------------------------------------------------------- writes */

/**
 * Opens a round, and closes whatever was still taking guesses.
 *
 * The public page shows exactly one round — `activeGame()`, the newest that
 * has not been drawn — so a second open round is not a second round, it is a
 * round nobody can reach that still says "Entries open" in the panel. Closing
 * the old one makes the list say what is actually true.
 *
 * Closed rather than deleted: its guesses are still worth having, and the
 * round can still be drawn afterwards from the All rounds list.
 */
export async function createGame(
  name: string,
  startBalance: number,
  numBonuses: number,
  huntId: string | null,
): Promise<void> {
  await mutate((s) => {
    for (const g of s.games) {
      if (g.status === 'open') g.status = 'closed';
    }
    s.games.unshift({
      id: randomUUID(),
      name,
      startBalance,
      numBonuses,
      huntId,
      status: 'open',
      createdAt: new Date().toISOString(),
      drawnAt: null,
      finalBalance: null,
      guesses: [],
    });
  });
}

/**
 * Records a guess, replacing this account's previous one.
 *
 * Rejected once entries are closed rather than silently ignored — someone who
 * submits at the moment the round closes deserves to be told, not to think it
 * landed.
 */
export async function submitGuess(
  gameId: string,
  user: { userId: string; username: string; avatar: string | null },
  value: number,
): Promise<{ ok: boolean; error?: string }> {
  let result: { ok: boolean; error?: string } = { ok: true };
  await mutate((s) => {
    const game = s.games.find((g) => g.id === gameId);
    if (!game) {
      result = { ok: false, error: 'That round no longer exists.' };
      return;
    }
    if (game.status !== 'open') {
      result = { ok: false, error: 'Entries are closed for this round.' };
      return;
    }
    game.guesses = game.guesses.filter((g) => g.userId !== user.userId);
    game.guesses.push({ ...user, value, at: new Date().toISOString() });
  });
  return result;
}

export async function setGameStatus(gameId: string, status: GameStatus): Promise<void> {
  await mutate((s) => {
    const game = s.games.find((g) => g.id === gameId);
    if (game && status !== 'drawn') {
      game.status = status;
      game.drawnAt = null;
      game.finalBalance = null;
    }
  });
}

/** Settles the round. Drawing is the one status change that carries a figure. */
export async function drawGame(gameId: string, finalBalance: number): Promise<void> {
  await mutate((s) => {
    const game = s.games.find((g) => g.id === gameId);
    if (!game) return;
    game.status = 'drawn';
    game.finalBalance = finalBalance;
    game.drawnAt = new Date().toISOString();
  });
}

export async function deleteGame(gameId: string): Promise<void> {
  await mutate((s) => {
    s.games = s.games.filter((g) => g.id !== gameId);
  });
}

/* ---------------------------------------------------------------- derived */

export interface Ranked extends Guess {
  /** Absolute distance from the final balance. */
  offBy: number;
  place: number;
}

/**
 * The standings, closest first.
 *
 * Distance is absolute: guessing $200 over is exactly as wrong as $200 under,
 * which is what "closest" means and what everyone expects. Ties are broken by
 * who guessed first — the earlier entry was committed with less information.
 */
export function rankGuesses(game: Game): Ranked[] {
  if (game.finalBalance === null) return [];
  const final = game.finalBalance;
  return [...game.guesses]
    .map((g) => ({ ...g, offBy: Math.abs(g.value - final), place: 0 }))
    .sort((a, b) => a.offBy - b.offBy || a.at.localeCompare(b.at))
    .map((g, i) => ({ ...g, place: i + 1 }));
}

export function winnerOf(game: Game): Ranked | null {
  return rankGuesses(game)[0] ?? null;
}
