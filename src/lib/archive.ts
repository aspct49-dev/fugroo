import 'server-only';

import { currentPeriod, monthKey, periodForMonth, type MonthKey } from './format';
import { prizeTableFor } from './partners';
import { getLeaderboard } from './services/leaderboard';
import { mutateJson, readJson } from './store';
import type { Leaderboard, PartnerId } from './types';

/**
 * Finished leaderboards, frozen.
 *
 * A past month could be fetched from Roobet every time it is viewed — the
 * stats endpoint takes any date range — but the answer would not be stable.
 * Roobet revises a month after it ends (voided bets, reversed play), and a
 * past board that changes after the prizes were paid out would contradict
 * what was paid. So the first time a finished month is asked for once it has
 * settled, its standings are saved, and that copy is what it shows from then on.
 *
 * What is frozen is the standings — what Roobet said — and not the prizes,
 * which are ours and are applied from `prizeTableFor` every time a board is
 * read. Correcting a month's split in the prize history then corrects its past
 * board too, instead of leaving the old figures stuck in a snapshot.
 *
 * Names are saved already masked by `buildEntries`, so nothing goes to disk
 * that the public board did not already show.
 *
 * No cron needed. Freezing on first view after the settle window means the
 * snapshot happens on its own the first time anyone looks — and a month nobody
 * looks at is a month nothing depends on.
 */

/** The first month a board ran. Nothing before it is listed. */
export const FIRST_MONTH: MonthKey = '2026-09';

/**
 * How long after a month ends before its figures are trusted as final.
 *
 * Until then a past board is still fetched live and marked provisional — late
 * settlements land in the first day or two, and freezing the board at 00:01
 * on the 1st would freeze it before they did.
 */
export const SETTLE_MS = 3 * 24 * 60 * 60 * 1000;

const FILE = 'leaderboard-archive.json';

interface Frozen extends Leaderboard {
  frozenAt: string;
}

interface Store {
  boards: Record<string, Frozen>;
}

const EMPTY: Store = { boards: {} };

export interface PastBoard {
  board: Leaderboard;
  month: MonthKey;
  /** `final` once frozen; `provisional` while still inside the settle window. */
  status: 'final' | 'provisional';
  frozenAt: string | null;
  /** When a provisional board will be frozen. */
  settlesAt: string;
}

const key = (partner: PartnerId, month: MonthKey) => `${partner}:${month}`;

/** The month's prizes, laid over its standings by rank. See the note above. */
function withPrizes(board: Leaderboard, partner: PartnerId, month: MonthKey): Leaderboard {
  const table = prizeTableFor(partner, month);
  return {
    ...board,
    prizePool: table.reduce((sum, n) => sum + n, 0),
    entries: board.entries.map((e, i) => ({ ...e, prize: table[i] ?? 0 })),
  };
}

/** Every finished month with a board, newest first. */
export function pastMonths(now: Date = new Date()): MonthKey[] {
  const current = monthKey(currentPeriod(now).start);
  const out: MonthKey[] = [];
  let cursor = periodForMonth(FIRST_MONTH).start;
  while (monthKey(cursor) < current) {
    out.unshift(monthKey(cursor));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return out;
}

export async function pastLeaderboard(partner: PartnerId, month: MonthKey): Promise<PastBoard> {
  const period = periodForMonth(month);
  const settlesAt = new Date(period.end.getTime() + 1000 + SETTLE_MS);

  const settles = settlesAt.toISOString();
  const final = (f: Frozen): PastBoard => {
    const { frozenAt, ...board } = f;
    return { board: withPrizes(board, partner, month), month, status: 'final', frozenAt, settlesAt: settles };
  };

  const { boards } = await readJson<Store>(FILE, EMPTY);
  const saved = boards?.[key(partner, month)];
  if (saved) return final(saved);

  const board = await getLeaderboard(partner, period);
  const settled = Date.now() >= settlesAt.getTime();

  /* Only a real answer is frozen. A failed fetch comes back as an empty board
     marked with an error, and saving that would make an outage permanent. */
  if (settled && board.source === 'live' && !board.error) {
    const fresh: Frozen = { ...board, frozenAt: new Date().toISOString() };
    let kept: Frozen | null = null;
    await mutateJson<Store>(FILE, EMPTY, (s) => {
      s.boards ??= {};
      // Two first views at once must not race to overwrite each other: the
      // first one in wins, and the second shows what that one saved.
      kept = s.boards[key(partner, month)] ?? null;
      if (!kept) s.boards[key(partner, month)] = fresh;
    });
    return final((kept as Frozen | null) ?? fresh);
  }

  return {
    board: withPrizes(board, partner, month),
    month,
    status: 'provisional',
    frozenAt: null,
    settlesAt: settles,
  };
}
