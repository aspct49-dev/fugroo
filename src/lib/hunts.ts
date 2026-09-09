import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Bonus hunt storage.
 *
 * A JSON file, written atomically — the whole store is serialised to a
 * temporary file and renamed over the real one, so a crash mid-write leaves
 * the previous version intact rather than a truncated file. Writes are
 * serialised behind a promise chain because two admins saving at once would
 * otherwise interleave and lose one of the edits.
 *
 * This is deliberately not a database. The site runs as a single Next process
 * on one VPS and a hunt has tens of rows, not millions; a Postgres dependency
 * would be more to install, run and back up than the problem is worth. It is
 * also why every read and write goes through this module: moving to Postgres
 * later is a rewrite of this file and nothing above it.
 *
 * The one thing it cannot do is run behind more than one process. If the site
 * is ever load-balanced, this has to change first.
 */

export interface Bonus {
  id: string;
  /** The slot the bonus is on. */
  game: string;
  /** Stake per spin, in dollars. */
  bet: number;
  /** What it paid. Null until the bonus has been opened. */
  payout: number | null;
}

export type HuntStatus = 'collecting' | 'opening' | 'settled';

export interface Hunt {
  id: string;
  name: string;
  /** What the hunt was funded with. */
  startBalance: number;
  status: HuntStatus;
  createdAt: string;
  settledAt: string | null;
  bonuses: Bonus[];
}

interface Store {
  hunts: Hunt[];
}

const FILE = path.join(process.cwd(), 'data', 'hunts.json');
const EMPTY: Store = { hunts: [] };

async function read(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) as Store;
  } catch {
    // Missing or unreadable is the same as empty — the first hunt creates it.
    return { ...EMPTY };
  }
}

/** Serialises writes, so two saves at once cannot interleave. */
let queue: Promise<unknown> = Promise.resolve();

function write(next: Store): Promise<void> {
  const run = queue.then(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2), 'utf8');
    // Rename is atomic on the same filesystem: readers see the old file or the
    // new one, never a half-written one.
    await fs.rename(tmp, FILE);
  });
  queue = run.catch(() => {});
  return run;
}

async function mutate(fn: (s: Store) => void): Promise<Store> {
  const store = await read();
  fn(store);
  await write(store);
  return store;
}

/* ------------------------------------------------------------------ reads */

export async function listHunts(): Promise<Hunt[]> {
  const { hunts } = await read();
  return [...hunts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getHunt(id: string): Promise<Hunt | undefined> {
  const { hunts } = await read();
  return hunts.find((h) => h.id === id);
}

/** The hunt on show: whichever is still running, else the most recent. */
export async function activeHunt(): Promise<Hunt | undefined> {
  const hunts = await listHunts();
  return hunts.find((h) => h.status !== 'settled') ?? hunts[0];
}

/* ----------------------------------------------------------------- writes */

export async function createHunt(name: string, startBalance: number): Promise<Hunt> {
  const hunt: Hunt = {
    id: randomUUID(),
    name,
    startBalance,
    status: 'collecting',
    createdAt: new Date().toISOString(),
    settledAt: null,
    bonuses: [],
  };
  await mutate((s) => {
    s.hunts.unshift(hunt);
  });
  return hunt;
}

export async function addBonus(huntId: string, game: string, bet: number): Promise<void> {
  await mutate((s) => {
    s.hunts.find((h) => h.id === huntId)?.bonuses.push({
      id: randomUUID(),
      game,
      bet,
      payout: null,
    });
  });
}

export async function removeBonus(huntId: string, bonusId: string): Promise<void> {
  await mutate((s) => {
    const hunt = s.hunts.find((h) => h.id === huntId);
    if (hunt) hunt.bonuses = hunt.bonuses.filter((b) => b.id !== bonusId);
  });
}

/** A null payout puts the bonus back to unopened. */
export async function setPayout(
  huntId: string,
  bonusId: string,
  payout: number | null,
): Promise<void> {
  await mutate((s) => {
    const bonus = s.hunts.find((h) => h.id === huntId)?.bonuses.find((b) => b.id === bonusId);
    if (bonus) bonus.payout = payout;
  });
}

export async function setStatus(huntId: string, status: HuntStatus): Promise<void> {
  await mutate((s) => {
    const hunt = s.hunts.find((h) => h.id === huntId);
    if (!hunt) return;
    hunt.status = status;
    hunt.settledAt = status === 'settled' ? new Date().toISOString() : null;
  });
}

export async function deleteHunt(huntId: string): Promise<void> {
  await mutate((s) => {
    s.hunts = s.hunts.filter((h) => h.id !== huntId);
  });
}

/* ----------------------------------------------------------------- derived */

export interface HuntStats {
  count: number;
  opened: number;
  totalBet: number;
  averageBet: number;
  /** The multiple the hunt has to average to get the start balance back. */
  breakEvenX: number;
  /** What the opened bonuses have returned so far. */
  returned: number;
  /** The multiple those opened bonuses have actually averaged. */
  runningX: number;
  /** Profit against the start balance, once everything is opened. */
  profit: number;
  best: Bonus | null;
  worst: Bonus | null;
}

/**
 * Everything the pages show, computed from the hunt rather than stored.
 *
 * Break-even is the figure that matters while a hunt is running, and it is
 * against the *average bet*, not the total: a hunt needs its bonuses to average
 * `startBalance / totalBet` times their stake to come back level.
 */
export function huntStats(hunt: Hunt): HuntStats {
  const { bonuses, startBalance } = hunt;
  const opened = bonuses.filter((b) => b.payout !== null);
  const totalBet = bonuses.reduce((sum, b) => sum + b.bet, 0);
  const returned = opened.reduce((sum, b) => sum + (b.payout ?? 0), 0);
  const openedBet = opened.reduce((sum, b) => sum + b.bet, 0);

  const ranked = [...opened].sort(
    (a, b) => (b.payout ?? 0) / b.bet - (a.payout ?? 0) / a.bet,
  );

  return {
    count: bonuses.length,
    opened: opened.length,
    totalBet,
    averageBet: bonuses.length ? totalBet / bonuses.length : 0,
    breakEvenX: totalBet ? startBalance / totalBet : 0,
    returned,
    runningX: openedBet ? returned / openedBet : 0,
    profit: returned - startBalance,
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
  };
}
