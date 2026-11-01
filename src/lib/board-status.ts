import 'server-only';

import { mutateJson, readJson } from './store';

/**
 * Whether the monthly leaderboard is running.
 *
 * A switch in the store rather than a flag in the code, so pausing and
 * resuming is a button in the admin panel and takes effect at once — no
 * commit, no deploy, no waiting for a build on the VPS.
 *
 * Paused means **switched off**, not frozen: there is no board this month and
 * nothing is on offer. The leaderboard page says so, the prize figure comes
 * off the nav and the home page, and the finished months stay viewable. It does
 * not lock the standings — Roobet keeps recording play regardless, and if the
 * board is resumed mid-month it shows the whole month's figures, the same as
 * it would have.
 */

export interface BoardStatus {
  paused: boolean;
  /** When it was last paused or resumed. */
  since: string | null;
}

const FILE = 'leaderboard-status.json';
const RUNNING: BoardStatus = { paused: false, since: null };

export async function boardStatus(): Promise<BoardStatus> {
  return { ...RUNNING, ...(await readJson<BoardStatus>(FILE, RUNNING)) };
}

export async function setBoardPaused(paused: boolean): Promise<void> {
  await mutateJson<BoardStatus>(FILE, RUNNING, (s) => {
    s.paused = paused;
    s.since = new Date().toISOString();
  });
}
