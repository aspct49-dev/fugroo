import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Guess the balance.
 *
 * A round is opened against a bonus hunt, everyone submits one guess at what
 * the hunt will finish on, entries close, and the closest guess when the admin
 * draws takes it.
 *
 * Same storage as the hunts: one JSON file, written atomically and serialised.
 * The reasoning is in `hunts.ts` and applies here unchanged — and so does the
 * limitation, which is that neither can run behind more than one process.
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

const FILE = path.join(process.cwd(), 'data', 'guesses.json');

async function read(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Store;
  } catch {
    return { games: [] };
  }
}

let queue: Promise<unknown> = Promise.resolve();

function write(next: Store): Promise<void> {
  const run = queue.then(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), 'utf8');
    await fs.rename(tmp, FILE);
  });
  queue = run.catch(() => {});
  return run;
}

async function mutate(fn: (s: Store) => void): Promise<void> {
  const store = await read();
  fn(store);
  await write(store);
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

export async function createGame(
  name: string,
  startBalance: number,
  numBonuses: number,
  huntId: string | null,
): Promise<void> {
  await mutate((s) => {
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
