import 'server-only';

import { channelInfo } from './kick';
import { listProfiles } from './profiles';
import { roster } from './roster';
import { mutateJson, readJson, writeJson } from './store';

/**
 * The chat raffle.
 *
 * Someone types the keyword in Kick chat and lands in the entry list, provided
 * they clear whatever gates are switched on. Every gate is checked here, on
 * the server, and so is the draw — the browser reads chat and forwards what it
 * saw, but nothing it sends decides who is eligible or who wins.
 *
 * **Where the chat connection lives.** Not here. `lib/kick-client.ts` opens
 * the socket in the admin's browser and posts the messages that match the
 * keyword to `ingest()`. The socket used to live in this process, which works
 * only where the process outlives the request — on serverless it is frozen the
 * moment a response is sent, so the connection died before anything could use
 * it. The reasoning is written out in `kick-client.ts`.
 *
 * **Where the round lives.** In the store, not in module memory, for the same
 * reason: two requests on serverless are two different instances as far as
 * memory is concerned. That also means a round now survives a redeploy and a
 * page reload, which the in-memory version never did.
 *
 * The one thing it does not survive is nobody watching: entries arrive through
 * a browser, so they arrive only while the panel is open.
 */

const FILE = 'giveaway.json';

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

export interface Round {
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
  /** Whether the channel was streaming, as of the last channel lookup. */
  live: boolean;
  avatar: string | null;
}

function blank(): Round {
  return {
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
}

/* ------------------------------------------------------------------ reads */

export async function giveawayState() {
  const round = await readJson<Round>(FILE, blank());
  return {
    ...round,
    entryCount: round.entries.length,
    missCount: round.misses.length,
  };
}

/* ------------------------------------------------------------------ gates */

/**
 * Whether one chatter may enter.
 *
 * A lookup failure is refused with the reason rather than being silently
 * treated as "not under the code" — the two are different, and only one of
 * them is the entrant's problem.
 *
 * `linked` is passed in rather than read here because a batch of messages
 * checks it once for all of them; reading the profile list per entrant would
 * be one store round trip each, in the middle of a live chat.
 */
async function admit(
  key: string,
  gates: Gates,
  linked: Map<string, string>,
): Promise<{ ok: boolean; reason?: string; roobet?: string }> {
  if (!gates.requireCode) return { ok: true };

  const roobetName = linked.get(key);
  if (!roobetName) {
    return { ok: false, reason: 'No linked Kick and Roobet account on the site' };
  }

  try {
    const { players } = await roster();
    const player = players.get(roobetName.toLowerCase());
    if (!player) return { ok: false, reason: `${roobetName} is not under the code` };
    if (gates.minWagered > 0 && player.weightedWagered < gates.minWagered) {
      return { ok: false, reason: `${roobetName} has wagered under the minimum` };
    }
    return { ok: true, roobet: player.username };
  } catch {
    return { ok: false, reason: 'Could not reach Roobet to check' };
  }
}

/**
 * Kick user id to Roobet name, which is the direction a raffle entry needs.
 *
 * Keyed on the id rather than the handle, and that is the point of doing this
 * through OAuth at all. A chat message carries `sender.id`; the id came from
 * Kick's token endpoint, so it was proved rather than typed; and it survives a
 * rename, which a handle does not — someone changing their Kick name mid-round
 * would otherwise stop matching halfway through.
 *
 * This was once built from `roobetUsername` on both sides — a table of Roobet
 * names, searched for a Kick name — so it only ever matched people who used
 * the same handle on both sites, and refused everyone else with "No Roobet
 * account linked" despite them having linked correctly.
 *
 * A profile missing either half is skipped. Half a link cannot answer the
 * question this table exists to answer.
 */
async function linkedNames(): Promise<Map<string, string>> {
  const profiles = await listProfiles();
  const map = new Map<string, string>();
  for (const p of profiles) {
    if (!p.kickUserId || !p.roobetUsername) continue;
    map.set(p.kickUserId, p.roobetUsername);
  }
  return map;
}

/* ----------------------------------------------------------------- ingest */

export interface IncomingMessage {
  username: string;
  userId: string;
  text: string;
}

/**
 * Records a batch of chat messages the browser matched on the keyword.
 *
 * Batched on purpose. Each call is a read, a change and a write of one
 * document, and a busy chat sending one request per message would be that
 * round trip per message — on serverless, per invocation. The panel collects
 * for a beat and sends what it has.
 *
 * The keyword is re-checked here rather than trusted. The browser filters so
 * it is not posting all of chat, but "this message matched" is a claim from a
 * client, and the round's keyword is the server's to decide.
 */
export async function ingest(messages: IncomingMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const round = await readJson<Round>(FILE, blank());
  if (!round.open) return;

  const keyword = round.keyword.trim().toLowerCase();
  const linked = round.gates.requireCode ? await linkedNames() : new Map<string, string>();

  const admitted: Entry[] = [];
  const refused: Miss[] = [];
  // Within one batch as well as against what is already stored: someone
  // spamming the keyword must not take two seats.
  const seen = new Set(round.entries.map((e) => e.userId));

  for (const msg of messages) {
    if (msg.text.trim().toLowerCase() !== keyword) continue;
    if (seen.has(msg.userId)) continue;
    seen.add(msg.userId);

    // Matched on the Kick id the message carries, not the display name.
    const verdict = await admit(msg.userId, round.gates, linked);
    if (verdict.ok) {
      admitted.push({
        username: msg.username,
        userId: msg.userId,
        at: Date.now(),
        roobet: verdict.roobet ?? null,
      });
    } else {
      refused.push({
        username: msg.username,
        reason: verdict.reason ?? 'Not eligible',
        at: Date.now(),
      });
    }
  }

  if (admitted.length === 0 && refused.length === 0) return;

  // Re-read inside the mutation rather than writing the copy read above: the
  // gate checks are `await`s, and an admin pressing something during them
  // would otherwise be overwritten.
  await mutateJson<Round>(FILE, blank(), (r) => {
    if (!r.open) return;
    const already = new Set(r.entries.map((e) => e.userId));
    for (const entry of admitted) {
      if (!already.has(entry.userId)) r.entries.push(entry);
    }
    const missed = new Set(r.misses.map((m) => m.username));
    for (const miss of refused) {
      if (!missed.has(miss.username)) r.misses.push(miss);
    }
  });
}

/* ------------------------------------------------------------------ admin */

/**
 * Looks the channel up and remembers it. Does not open anything.
 *
 * The chatroom id is all the browser needs to subscribe, and finding it is a
 * plain HTTP call — which is why this half stayed on the server while the
 * socket moved off it.
 *
 * The candidate is only committed once it turns out to exist. Writing the
 * typed name first and looking it up second left a typo stored as the current
 * channel, and everything that reuses the stored channel then kept failing.
 */
export async function lookupChannel(channel?: string): Promise<{ ok: boolean; error?: string }> {
  const current = await readJson<Round>(FILE, blank());
  const candidate = channel ? channel.trim().replace(/^.*kick\.com\//i, '') : current.channel;

  const info = await channelInfo(candidate);
  if (!info?.chatroomId) {
    return { ok: false, error: `Could not find a chatroom for "${candidate}"` };
  }

  await mutateJson<Round>(FILE, blank(), (r) => {
    r.channel = candidate;
    r.slug = info.slug;
    r.chatroomId = info.chatroomId;
    r.live = info.live;
    r.avatar = info.avatar;
  });
  return { ok: true };
}

/** Re-reads whether the channel is live. */
export async function refreshLive(): Promise<void> {
  const current = await readJson<Round>(FILE, blank());
  const info = await channelInfo(current.channel);
  if (!info) return;
  await mutateJson<Round>(FILE, blank(), (r) => {
    r.live = info.live;
    r.avatar = info.avatar;
  });
}

export async function openGiveaway(keyword: string, gates: Gates): Promise<void> {
  await mutateJson<Round>(FILE, blank(), (r) => {
    r.keyword = keyword.trim() || '!enter';
    r.gates = gates;
    r.entries = [];
    r.misses = [];
    r.winner = null;
    r.drawnAt = null;
    r.open = true;
  });
}

export async function closeGiveaway(): Promise<void> {
  await mutateJson<Round>(FILE, blank(), (r) => {
    r.open = false;
  });
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
 * The winner is chosen here, on the server, and returned. The panel's spinner
 * animates *towards* the name it is given; it does not pick one. An animation
 * that chose the winner would put the draw in a browser, where the person
 * running the giveaway could reload until they liked the result — and now that
 * the browser is holding the chat socket too, that line matters more, not
 * less.
 */
export async function roll(): Promise<Entry | null> {
  const round = await readJson<Round>(FILE, blank());
  if (round.entries.length === 0) return null;

  const winner = round.entries[unbiasedIndex(round.entries.length)];
  await mutateJson<Round>(FILE, blank(), (r) => {
    r.winner = winner;
    r.drawnAt = Date.now();
    r.open = false;
  });
  return winner;
}

export async function clearMisses(): Promise<void> {
  await mutateJson<Round>(FILE, blank(), (r) => {
    r.misses = [];
  });
}

export async function reset(): Promise<void> {
  await mutateJson<Round>(FILE, blank(), (r) => {
    r.entries = [];
    r.misses = [];
    r.winner = null;
    r.drawnAt = null;
    r.open = false;
  });
}

/** Forgets the channel as well as the round. Used by Disconnect, which is now
 *  a browser-side act — the server only has to stop claiming a chatroom. */
export async function forgetChannel(): Promise<void> {
  await mutateJson<Round>(FILE, blank(), (r) => {
    r.open = false;
  });
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
  const round = await readJson<Round>(FILE, blank());
  if (!round.open) return { ok: false, error: 'Entries are closed.' };
  if (round.entries.some((e) => e.userId === userId)) return { ok: true };

  let roobet = roobetName;
  if (round.gates.requireCode) {
    if (!roobetName) return { ok: false, error: 'Link your Roobet account first.' };
    const linked = new Map([[roobetName, roobetName]]);
    const verdict = await admit(roobetName, round.gates, linked);
    if (!verdict.ok) return { ok: false, error: verdict.reason };
    roobet = verdict.roobet ?? roobetName;
  }

  await mutateJson<Round>(FILE, blank(), (r) => {
    if (!r.open) return;
    if (r.entries.some((e) => e.userId === userId)) return;
    r.entries.push({ username, userId, at: Date.now(), roobet });
  });
  return { ok: true };
}

/** Kept so a future caller can replace a round wholesale without a migration. */
export async function replaceRound(round: Round): Promise<void> {
  await writeJson(FILE, round);
}
