import 'server-only';

import { randomUUID } from 'node:crypto';

import { FALLBACK_CHAT_SERVER, type ChatServer } from './kick-client';

/**
 * What the server needs to know about a Kick channel.
 *
 * Only the lookup lives here now. Reading the chat itself is a WebSocket, and
 * that moved to the browser — see `lib/kick-client.ts` for why. What is left
 * is a plain HTTP call that turns a channel name into the chatroom id the
 * browser subscribes to, plus whether they are streaming.
 *
 * No Kick credentials are involved. The chat feed and the channel endpoint are
 * both public; the OAuth credentials are for *acting* as an account, and
 * nothing here does.
 *
 * The lookup also fetches which Pusher app the chat is on (`chatServerFor`),
 * since Kick started handing that out at runtime instead of fixing it.
 */

export interface ChannelInfo {
  slug: string;
  chatroomId: number | null;
  live: boolean;
  avatar: string | null;
  /** The Pusher app the browser connects to for this channel's chat. */
  chat: ChatServer;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

/**
 * Asks Kick which Pusher app serves a channel's chat.
 *
 * The same request Kick's own site makes on load. It can answer with Pusher or
 * with Centrifugo, a different realtime system; only Pusher is offered as
 * acceptable here, because that is the protocol the reader speaks. Anything
 * unexpected — a refusal, a shape change, Centrifugo regardless — falls back to
 * the last key known to work rather than failing the lookup: the chatroom id is
 * the part that has to be right, and a stale key is at worst a reconnect loop
 * the panel shows as "connecting".
 *
 * Note `web.kick.com/api` specifically: the same path on `kick.com/api` or
 * bare `web.kick.com` is refused by Kick's firewall.
 */
async function chatServerFor(channelId: number): Promise<ChatServer> {
  try {
    const res = await fetch(`https://web.kick.com/api/v1/realtime/channels/${channelId}/chat/connection`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        accept: 'application/json',
        'content-type': 'application/json',
        origin: 'https://kick.com',
        referer: 'https://kick.com/',
      },
      body: JSON.stringify({
        client: { id: randomUUID(), type: 'web' },
        capabilities: { accepted_providers: [{ provider: 'pusher' }] },
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as {
      data?: { connections?: { provider?: string; credentials?: { app_key?: string; cluster?: string } }[] };
    };
    const pusher = body.data?.connections?.find((c) => c.provider === 'pusher')?.credentials;
    if (pusher?.app_key && pusher.cluster) return { appKey: pusher.app_key, cluster: pusher.cluster };
    throw new Error('no Pusher credentials in the reply');
  } catch (err) {
    console.error('[kick] chat server lookup failed, using the fallback key:', err instanceof Error ? err.message : err);
    return FALLBACK_CHAT_SERVER;
  }
}

/**
 * One call for everything the panel shows about a channel: the chatroom to
 * subscribe to, whether it is live right now, and the profile picture.
 */
export async function channelInfo(channel: string): Promise<ChannelInfo | null> {
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(channel)}`, {
      headers: { 'User-Agent': UA, accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      id?: number;
      slug?: string;
      chatroom?: { id?: number };
      livestream?: unknown;
      user?: { profile_pic?: string };
    };
    return {
      slug: d.slug ?? channel,
      chatroomId: d.chatroom?.id ?? null,
      // `livestream` is null when offline and an object when live.
      live: Boolean(d.livestream),
      avatar: d.user?.profile_pic ?? null,
      // Keyed on the *channel* id, not the chatroom id — they differ by one
      // on Fugroo's channel and are easy to mix up.
      chat: d.id ? await chatServerFor(d.id) : FALLBACK_CHAT_SERVER,
    };
  } catch {
    return null;
  }
}
