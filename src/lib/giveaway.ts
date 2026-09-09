import 'server-only';

import { chatState, chatroomId, connectChat, disconnectChat, onChat } from './kick';
import { listProfiles } from './profiles';
import { roster } from './roster';

/**
 * The chat giveaway.
 *
 * Someone types the keyword in Kick chat and lands in the entry list, provided
 * they clear whatever gates are switched on. Every gate is checked here, on
 * the server, at the moment the message arrives — the admin toggles decide
 * what is enforced, and nothing in a browser can talk its way past them.
 *
 * State is in memory on purpose. A giveaway is a thing that happens during one
 * stream: it starts, it is rolled, it is over. Persisting it would mean
 * deciding what a half-finished round means after a restart, and the honest
 * answer is that it means "run it again".
 *
 * The cost of that, stated plainly: a redeploy mid-giveaway loses the entries.
 */

export interface Entry {
  username: string;
  userId: string;
  at: number;
  /** The Roobet name that let them in, where the code gate was on. */
  roobet: string | null;
}

export interface Miss {
  username: string;
  reason: string;
  at: number;
}

export interface Gates {
  /** Entrant must have a linked Roobet name that is in the affiliate list. */
  requireCode: boolean;
  /** And, optionally, have wagered at least this much under it. */
  minWagered: number;
}

interface State {
  channel: string;
  chatroomId: number | null;
  keyword: string;
  open: boolean;
  gates: Gates;
  entries: Entry[];
  misses: Miss[];
  winner: Entry | null;
  drawnAt: number | null;
}

const state: State = {
  channel: process.env.KICK_CHANNEL ?? 'fugroo',
  chatroomId: null,
  keyword: '!enter',
  open: false,
  gates: { requireCode: false, minWagered: 0 },
  entries: [],
  misses: [],
  winner: null,
  drawnAt: null,
};

/** Roobet name by Discord id is the wrong direction — we need Kick name in.
 *  Rebuilt each time the giveaway opens rather than per message. */
let kickToRoobet = new Map<string, string>();

export function giveawayState() {
  const chat = chatState();
  return {
    ...state,
    connected: chat.connected,
    entryCount: state.entries.length,
    missCount: state.misses.length,
  };
}

/**
 * Whether one chatter may enter.
 *
 * A lookup failure is refused with the reason rather than being silently
 * treated as "not under the code" — the two are different, and only one of
 * them is the entrant's problem.
 */
async function admit(username: string): Promise<{ ok: boolean; reason?: string; roobet?: string }> {
  if (!state.gates.requireCode) return { ok: true };

  const roobetName = kickToRoobet.get(username.toLowerCase());
  if (!roobetName) {
    return { ok: false, reason: 'No Roobet account linked on the site' };
  }

  try {
    const { players } = await roster();
    const player = players.get(roobetName.toLowerCase());
    if (!player) return { ok: false, reason: `${roobetName} is not under the code` };
    if (state.gates.minWagered > 0 && player.weightedWagered < state.gates.minWagered) {
      return {
        ok: false,
        reason: `${roobetName} has wagered under the minimum`,
      };
    }
    return { ok: true, roobet: player.username };
  } catch {
    return { ok: false, reason: 'Could not reach Roobet to check' };
  }
}

async function handle(msg: { username: string; userId: string; text: string }) {
  if (!state.open) return;
  if (msg.text.trim().toLowerCase() !== state.keyword.trim().toLowerCase()) return;

  const key = msg.userId;
  // Someone spamming the keyword must not reset their own entry time, or a
  // tie-break on "who was first" stops meaning anything.
  if (state.entries.some((e) => e.userId === key)) return;

  const verdict = await admit(msg.username);
  if (!verdict.ok) {
    if (!state.misses.some((m) => m.username === msg.username)) {
      state.misses.push({
        username: msg.username,
        reason: verdict.reason ?? 'Not eligible',
        at: Date.now(),
      });
    }
    return;
  }
  state.entries.push({
    username: msg.username,
    userId: key,
    at: Date.now(),
    roobet: verdict.roobet ?? null,
  });
}

/* ------------------------------------------------------------------ admin */

export async function connect(channel?: string): Promise<{ ok: boolean; error?: string }> {
  if (channel) state.channel = channel.trim();
  const id = await chatroomId(state.channel);
  if (!id) return { ok: false, error: `Could not find a chatroom for "${state.channel}"` };
  state.chatroomId = id;
  onChat(handle);
  connectChat(id);
  return { ok: true };
}

export function disconnect(): void {
  onChat(null);
  disconnectChat();
  state.open = false;
  state.chatroomId = null;
}

export async function openGiveaway(keyword: string, gates: Gates): Promise<void> {
  state.keyword = keyword.trim() || '!enter';
  state.gates = gates;
  state.entries = [];
  state.misses = [];
  state.winner = null;
  state.drawnAt = null;

  // Built once here rather than per message: a busy chat would otherwise read
  // the profile file hundreds of times a minute.
  const profiles = await listProfiles();
  kickToRoobet = new Map(
    profiles.map((p) => [p.roobetUsername.toLowerCase(), p.roobetUsername]),
  );

  state.open = true;
}

export function closeGiveaway(): void {
  state.open = false;
}

/**
 * Picks the winner.
 *
 * `crypto.getRandomValues` rather than `Math.random`, because this decides who
 * gets money and the difference costs nothing.
 */
export function roll(): Entry | null {
  if (state.entries.length === 0) return null;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const winner = state.entries[buf[0] % state.entries.length];
  state.winner = winner;
  state.drawnAt = Date.now();
  state.open = false;
  return winner;
}

export function clearMisses(): void {
  state.misses = [];
}

export function reset(): void {
  state.entries = [];
  state.misses = [];
  state.winner = null;
  state.drawnAt = null;
  state.open = false;
}

/**
 * Adds an entry that did not come from chat.
 *
 * The site's own Enter button goes through here, so someone watching on the
 * website can take part without having Kick chat open — and it runs the same
 * gates, because the entry list should not care where a name arrived from.
 */
export async function enterFromSite(
  username: string,
  userId: string,
  roobetName: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!state.open) return { ok: false, error: 'Entries are closed.' };
  if (state.entries.some((e) => e.userId === userId)) return { ok: true };

  if (state.gates.requireCode) {
    if (!roobetName) return { ok: false, error: 'Link your Roobet account first.' };
    kickToRoobet.set(roobetName.toLowerCase(), roobetName);
    const verdict = await admit(roobetName);
    if (!verdict.ok) return { ok: false, error: verdict.reason };
    state.entries.push({ username, userId, at: Date.now(), roobet: verdict.roobet ?? roobetName });
    return { ok: true };
  }

  state.entries.push({ username, userId, at: Date.now(), roobet: roobetName });
  return { ok: true };
}
