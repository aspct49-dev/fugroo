/**
 * Single-elimination bracket maths.
 *
 * Pure functions over a flat `Match[]` — no storage, no React, no dates. The
 * admin editor calls these on every keystroke and the public page calls them
 * to render a finished bracket, so they have to agree exactly; keeping them
 * here rather than inside a component is what makes that true by construction
 * instead of by discipline.
 *
 * The bracket is flat rather than a tree because a tree of matches has to be
 * walked to find anything, and every operation here — fill a name, advance a
 * winner — is a lookup by id. `${round}-${position}` is that id, and the child
 * of a match is derivable from it (`round + 1`, `position / 2`), so the
 * structure is implied by the ids and never has to be stored.
 */

export interface Player {
  name: string;
  /** The slot they picked on Roobet for this match. Free text; see `slots.ts`. */
  slot: string;
  /**
   * The catalogue's artwork and studio for that slot, copied here when it was
   * picked rather than looked up when it is drawn.
   *
   * It means the public bracket renders the art without downloading a 600KB
   * catalogue, and a tournament played in May still shows what it was played
   * with after the catalogue is refreshed. Both are absent for a slot typed by
   * hand, which is a normal state, not a broken one.
   */
  slotImg?: string;
  slotProvider?: string;
}

export type WinnerSlot = 'p1' | 'p2' | null;

export interface Match {
  /** `${round}-${position}`. Round 0 is the opening round. */
  id: string;
  round: number;
  position: number;
  player1: Player;
  player2: Player;
  /** The multiple each player hit. Null until entered — 0 is a real result. */
  mult1: number | null;
  mult2: number | null;
  winner: WinnerSlot;
}

/** The sizes the editor offers. Powers of two, so no byes are ever needed. */
export const BRACKET_SIZES = [4, 8, 16, 32] as const;
export type BracketSize = (typeof BRACKET_SIZES)[number];

export const EMPTY_PLAYER: Player = { name: '', slot: '' };

export function isBracketSize(n: number): n is BracketSize {
  return (BRACKET_SIZES as readonly number[]).includes(n);
}

export function totalRounds(size: number): number {
  return Math.log2(size);
}

/** The id of the match a winner advances into, or null out of the final. */
function childId(match: Pick<Match, 'round' | 'position'>, rounds: number): string | null {
  if (match.round + 1 >= rounds) return null;
  return `${match.round + 1}-${Math.floor(match.position / 2)}`;
}

/**
 * An empty bracket of the given size.
 *
 * Round 0 is seeded in pairs — entrant 0 plays 1, 2 plays 3 — which is the
 * order the admin types them in. Deliberately not a seeded ladder where 1
 * plays 8: there are no rankings to seed from, and pretending otherwise would
 * imply the draw meant something it does not.
 */
export function buildBracket(size: BracketSize, players: Player[] = []): Match[] {
  const rounds = totalRounds(size);
  const matches: Match[] = [];

  for (let r = 0; r < rounds; r++) {
    const count = size / Math.pow(2, r + 1);
    for (let i = 0; i < count; i++) {
      matches.push({
        id: `${r}-${i}`,
        round: r,
        position: i,
        player1: r === 0 ? { ...(players[i * 2] ?? EMPTY_PLAYER) } : { ...EMPTY_PLAYER },
        player2: r === 0 ? { ...(players[i * 2 + 1] ?? EMPTY_PLAYER) } : { ...EMPTY_PLAYER },
        mult1: null,
        mult2: null,
        winner: null,
      });
    }
  }
  return matches;
}

export function setPlayerField(
  matches: Match[],
  matchId: string,
  which: 1 | 2,
  field: keyof Player,
  value: string,
): Match[] {
  return matches.map((m) => {
    if (m.id !== matchId) return m;
    const player = which === 1 ? m.player1 : m.player2;
    const updated = { ...player, [field]: value };
    return which === 1 ? { ...m, player1: updated } : { ...m, player2: updated };
  });
}

/**
 * Sets a player's slot and its artwork together.
 *
 * One call rather than three `setPlayerField`s, because the name, the studio
 * and the image are one fact — set separately they can interleave and leave a
 * card showing one game's picture under another game's name.
 */
export function setPlayerSlot(
  matches: Match[],
  matchId: string,
  which: 1 | 2,
  slot: { name: string; provider?: string; img?: string },
): Match[] {
  return matches.map((m) => {
    if (m.id !== matchId) return m;
    const base = which === 1 ? m.player1 : m.player2;
    const updated: Player = { name: base.name, slot: slot.name };
    if (slot.img) updated.slotImg = slot.img;
    if (slot.provider) updated.slotProvider = slot.provider;
    return which === 1 ? { ...m, player1: updated } : { ...m, player2: updated };
  });
}

export function setMultiplier(
  matches: Match[],
  matchId: string,
  which: 1 | 2,
  value: number | null,
): Match[] {
  return matches.map((m) =>
    m.id === matchId ? { ...m, [which === 1 ? 'mult1' : 'mult2']: value } : m,
  );
}

/**
 * Records a winner and carries them into the next round.
 *
 * Refuses to act on a match that already has one — changing a decided result
 * has to go through `resetMatch`, which also unwinds everything downstream. A
 * silent overwrite would leave the loser's name sitting in a later round.
 */
export function advanceWinner(matches: Match[], matchId: string, which: 'p1' | 'p2'): Match[] {
  const match = matches.find((m) => m.id === matchId);
  if (!match || match.winner) return matches;

  const rounds = roundsIn(matches);
  const updated = matches.map((m) => (m.id === matchId ? { ...m, winner: which } : m));
  const winner = which === 'p1' ? match.player1 : match.player2;

  const next = childId(match, rounds);
  if (!next) return updated;

  // Even positions feed the top row of the next match, odd the bottom. That is
  // what keeps the wires from crossing when it is drawn.
  const first = match.position % 2 === 0;
  return updated.map((m) =>
    m.id === next
      ? {
          ...m,
          player1: first ? { ...winner } : m.player1,
          player2: first ? m.player2 : { ...winner },
        }
      : m,
  );
}

/**
 * Decides a match on the multipliers entered.
 *
 * A tie goes to player 1, which is arbitrary but has to be *something*; in
 * practice two identical multiples on a live stream get re-spun rather than
 * split, and the admin can reset the match to do that.
 */
export function decideByMultiplier(matches: Match[], matchId: string): Match[] {
  const m = matches.find((x) => x.id === matchId);
  if (!m || m.winner) return matches;
  if (m.mult1 === null || m.mult2 === null) return matches;
  return advanceWinner(matches, matchId, m.mult1 >= m.mult2 ? 'p1' : 'p2');
}

/**
 * Undoes a decided match, and everything it caused.
 *
 * The reference implementation this was ported from cleared only the match's
 * own winner, which left the advanced name — and any result built on top of it
 * — standing in the later rounds. Resetting a quarter-final would leave a
 * ghost in the semi. So this walks forward and clears each slot it filled,
 * stopping at the first round that had not been decided yet.
 */
export function resetMatch(matches: Match[], matchId: string): Match[] {
  const rounds = roundsIn(matches);
  let out = matches.map((m) => (m.id === matchId ? { ...m, winner: null } : m));

  let cursor = out.find((m) => m.id === matchId);
  while (cursor) {
    const next = childId(cursor, rounds);
    if (!next) break;
    const child = out.find((m) => m.id === next);
    if (!child) break;

    const first = cursor.position % 2 === 0;
    const cleared: Match = {
      ...child,
      player1: first ? { ...EMPTY_PLAYER } : child.player1,
      player2: first ? child.player2 : { ...EMPTY_PLAYER },
      mult1: first ? null : child.mult1,
      mult2: first ? child.mult2 : null,
      winner: null,
    };
    out = out.map((m) => (m.id === next ? cleared : m));

    // Only keep unwinding while the round we just cleared had itself produced
    // a result. If it had not, nothing further down was ever filled in.
    if (!child.winner) break;
    cursor = cleared;
  }
  return out;
}

/** Rounds present in a bracket, derived rather than passed around. */
export function roundsIn(matches: Match[]): number {
  return matches.reduce((max, m) => Math.max(max, m.round + 1), 0);
}

/** The matches of one round, in bracket order. */
export function matchesInRound(matches: Match[], round: number): Match[] {
  return matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
}

/** The entrant who won the final, or null while it is still running. */
export function championOf(matches: Match[]): Player | null {
  const rounds = roundsIn(matches);
  if (!rounds) return null;
  const final = matches.find((m) => m.round === rounds - 1);
  if (!final?.winner) return null;
  return final.winner === 'p1' ? final.player1 : final.player2;
}

/** How many matches have been decided, for a progress line. */
export function decidedCount(matches: Match[]): number {
  return matches.filter((m) => m.winner).length;
}

export function roundLabel(round: number, rounds: number): string {
  const fromEnd = rounds - 1 - round;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semi-finals';
  if (fromEnd === 2) return 'Quarter-finals';
  if (fromEnd === 3) return 'Round of 16';
  return `Round ${round + 1}`;
}

/** Both names present — the point at which multipliers can be entered. */
export function matchReady(m: Match): boolean {
  return m.player1.name.trim() !== '' && m.player2.name.trim() !== '';
}

/** Both multiples in, so the match can be decided. */
export function matchScored(m: Match): boolean {
  return m.mult1 !== null && m.mult2 !== null;
}

/* -------------------------------------------------------------- decoding */

const MAX_FIELD = 80;

/**
 * The artwork URL, if it is one we are willing to put on a public page.
 *
 * The bracket is authored by an admin but *rendered to everyone*, so an image
 * URL travelling through this payload would otherwise be an arbitrary remote
 * asset embedded in a public page — a tracking pixel at best. Restricting it
 * to https on the hosts the catalogue actually uses keeps it to what a pick
 * can legitimately produce.
 */
const ART_HOSTS = [
  'roobet-dev-public-images-prod.s3.amazonaws.com',
  'roobet-dev-public-images-prod.s3.eu-central-1.amazonaws.com',
  'cdn.hub88.io',
  'bshots.egcvi.com',
];

function asArt(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length > 300) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return undefined;
    return ART_HOSTS.includes(url.hostname) ? raw : undefined;
  } catch {
    return undefined;
  }
}

function asPlayer(raw: unknown): Player {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PLAYER };
  const r = raw as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_FIELD) : '');
  const player: Player = { name: text(r.name), slot: text(r.slot) };
  const img = asArt(r.slotImg);
  const provider = text(r.slotProvider);
  if (img) player.slotImg = img;
  if (provider) player.slotProvider = provider;
  return player;
}

function asMultiplier(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  // A multiple cannot be negative, and 0 is a real result — a bonus that paid
  // nothing — so it must survive where a falsy check would drop it.
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Rebuilds a bracket from whatever the browser sent.
 *
 * The editor posts the entire `Match[]` back, so this is the boundary where it
 * stops being trusted. Rather than validating the payload in place, it is
 * copied field by field onto a freshly built skeleton of the right size: the
 * ids, rounds and positions are therefore always the ones this server
 * computed, and only the parts a person can actually edit — names, slots,
 * multipliers, winners — come from the request.
 *
 * Returns null if the payload does not describe this bracket at all, which the
 * caller treats as a failed save rather than writing a damaged store.
 */
export function normaliseBracket(size: BracketSize, input: unknown): Match[] | null {
  if (!Array.isArray(input)) return null;

  const byId = new Map<string, Record<string, unknown>>();
  for (const entry of input) {
    if (entry && typeof entry === 'object') {
      const r = entry as Record<string, unknown>;
      if (typeof r.id === 'string') byId.set(r.id, r);
    }
  }

  const out: Match[] = [];
  for (const base of buildBracket(size)) {
    const raw = byId.get(base.id);
    if (!raw) return null;
    out.push({
      ...base,
      player1: asPlayer(raw.player1),
      player2: asPlayer(raw.player2),
      mult1: asMultiplier(raw.mult1),
      mult2: asMultiplier(raw.mult2),
      winner: raw.winner === 'p1' || raw.winner === 'p2' ? raw.winner : null,
    });
  }
  return out;
}
