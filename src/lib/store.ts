import 'server-only';

import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * The JSON file store the hunts, guesses and profiles all sit on.
 *
 * Written atomically — serialised to a temporary file and renamed over the
 * real one, so a crash mid-write leaves the previous version intact rather
 * than a truncated file. Writes are serialised per file behind a promise
 * chain, because two saves at once would otherwise interleave and lose one.
 *
 * Deliberately not a database. The site is one Next process on one VPS and
 * these tables have tens of rows; Postgres would be more to install, run and
 * back up than the problem is worth. Everything goes through this module, so
 * moving to one later is a rewrite of this file and nothing above it.
 *
 * The limitation, stated plainly: this cannot run behind more than one
 * process. If the site is ever load-balanced, this has to change first.
 */

const DIR = path.join(process.cwd(), 'data');

/** One queue per file, so a slow write to one table does not block another. */
const queues = new Map<string, Promise<unknown>>();

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, name), 'utf8')) as T;
  } catch {
    // Missing or unreadable is the same as empty — the first write creates it.
    return fallback;
  }
}

export function writeJson<T>(name: string, value: T): Promise<void> {
  const file = path.join(DIR, name);
  const prev = queues.get(name) ?? Promise.resolve();
  const run = prev.then(async () => {
    await fs.mkdir(DIR, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
    // Rename is atomic on the same filesystem: a reader sees the old file or
    // the new one, never a half-written one.
    await fs.rename(tmp, file);
  });
  queues.set(name, run.catch(() => {}));
  return run;
}

/** Read, change, write — the shape almost every caller wants. */
export async function mutateJson<T>(name: string, fallback: T, fn: (value: T) => void): Promise<T> {
  const value = await readJson<T>(name, fallback);
  fn(value);
  await writeJson(name, value);
  return value;
}
