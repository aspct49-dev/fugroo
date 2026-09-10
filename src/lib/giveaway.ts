import 'server-only';

import { channelInfo, chatState, connectChat, disconnectChat, onChat } from './kick';
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
  slug: string;
  chatroomId: number | null;
  keyword: string;
  open: boolean;
  gates: Gates;
  entries: Entry[];
  misses: Miss[];
  winner: Entry | null;
  drawnAt: number | null;
  /** Whether the channel is streaming, as of the last connect. */
  live: boolean;
  avatar: string | null;
}

const state: State = {
  channel: process.env.KICK_CHANNEL ?? 'fugroo',
  slug: process.env.KICK_CHANNEL ?? 'fugroo',
  chatroomId: null,
  keyword: '!enter',
  open: false,
  gates: { requireCode: false, minWagered: 0 },
  entries: [],
  misses: [],
  winner: null,
  drawnAt: null,
  live: false,
  avatar: null,
};

/**
 * The last few things each chatter said.
 *
 * Kept so the panel can show the winner's recent messages — on stream that is
 * how you tell a real viewer from a name that appeared once to enter, without
 * leaving the panel to go and read chat.
 *
 * Capped hard in both directions: a handful of lines per person, and a bounded
 * number of people. A giveaway runs for minutes in a busy chat, and an
 * unbounded map keyed on username is a memory leak with a stream attached.
 */
const MAX_PER_USER = 6;
const MAX_USERS = 400;
const recent = new Map<string, { text: string; at: number }[]>();

function remember(username: string, text: string) {
  const key = username.toLowerCase();
  const list = recent.get(key) ?? [];
  list.unshift({ text, at: Date.now() });
  if (list.length > MAX_PER_USER) list.length = MAX_PER_USER;
  recent.set(key, list);
  if (recent.size > MAX_USERS) {
    // Oldest insertion first — Map keeps insertion order.
    const oldest = recent.keys().next().value;
    if (oldest) recent.delete(oldest);
  }
}

export function recentMessages(username: string | null | undefined) {
  if (!username) return [];
  return recent.get(username.toLowerCase()) ?? [];
}

/** Roobet name by Discord id is the wrong direction — we need Kick name in.
 *  Rebuilt each time the giveaway opens rather than per message. */
let kickToRoobet = new Map<string, string>();

/**
 * Whether this runtime can hold a chat socket open at all.
 *
 * The reader is a WebSocket living in module memory, which needs a process
 * that stays up between requests. Serverless gives it the opposite: the
 * function is frozen the moment a request finishes and thawed for the next
 * one, on no guarantee it is even the same instance. So Connect succeeds, the
 * invocation ends, the socket dies with it, and the next poll — quite possibly
 * a different instance entirely — reports a connection nobody is holding.
 *
 * That is exactly what it looks like from the panel: press Connect, nothing
 * changes; reload, it says connected; a moment later it does not. Worth
 * saying out loud on the page rather than leaving someone to press the button
 * harder.
 */
export function socketCanPersist(): boolean {
  return process.env.VERCEL !== '1';
}

export function giveawayState() {
  const chat = chatState();
  const winnerName = state.winner?.username ?? null;
  return {
    ...state,
    ephemeral: !socketCanPersist(),
    connected: chat.connected,
    entryCount: state.entries.length,
    missCount: state.misses.length,
    /* The winner's own lines, so the panel can show who they are without
       anyone leaving it to go and read chat. */
    winnerMessages: recentMessages(winnerName),
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
  // Remembered whether or not the round is open, so the winner's history is
  // already there the moment they are drawn.
  remember(msg.username, msg.text);
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
  /*
   * The candidate is only committed once it turns out to exist.
   *
   * This used to write the typed name straight onto the state and then look
   * it up, so a typo left the panel pointing at a channel that is not there —
   * and the bare Connect button, which deliberately reuses the stored
   * channel, would then keep failing until someone retyped the right one.
   * A failed connect should leave you where you were.
   */
  const candidate = channel
    ? channel.trim().replace(/^.*kick\.com\//i, '')
    : state.channel;

  const info = await channelInfo(candidate);
  if (!info?.chatroomId) {
    return { ok: false, error: `Could not find a chatroom for "${candidate}"` };
  }

  state.channel = candidate;
  state.chatroomId = info.chatroomId;
  state.slug = info.slug;
  state.live = info.live;
  state.avatar = info.avatar;
  // The handler goes on before the socket does, or the first messages after
  // the subscribe land with nobody listening.
  onChat(handle);
  // Awaited, so this returns with the socket genuinely open rather than
  // merely asked to open — the panel reads the state the moment this
  // resolves, and a half-open socket reads there as "not reading chat".
  const opened = await connectChat(info.chatroomId);
  if (!opened) {
    return { ok: false, error: `Could not reach ${candidate}'s chat. Try again.` };
  }
  return { ok: true };
}

/** Re-reads whether the channel is live, without touching the socket. */
export async function refreshLive(): Promise<void> {
  const info = await channelInfo(state.channel);
  if (info) {
    state.live = info.live;
    state.avatar = info.avatar;
  }
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
 * An unbiased index in [0, max).
 *
 * `random % max` is the obvious version and it is skewed: 2^32 does not divide
 * evenly by the entry count, so the first `2^32 % max` indices come up slightly
 * more often than the rest. At 24 entrants the bias is far too small to notice
 * and it is still, straightforwardly, not a fair draw. Rejecting the values
 * that fall in the short final block removes it, and costs one extra draw
 * roughly never.
 */
function unbiasedIndex(max: number): number {
  if (max <= 1) return 0;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

/**
 * Picks the winner.
 *
 * `crypto.getRandomValues` rather than `Math.random`, because this decides who
 * gets money and the difference costs nothing — and drawn through
 * `unbiasedIndex`, for the same reason.
 *
 * The winner is chosen here, on the server, and returned. The admin panel's
 * spinner animates *towards* the name it is given; it does not pick one. An
 * animation that chose the winner would put the draw in a browser, where the
 * person running the giveaway could reload until they liked the result.
 */
export function roll(): Entry | null {
  if (state.entries.length === 0) return null;
  const winner = state.entries[unbiasedIndex(state.entries.length)];
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
