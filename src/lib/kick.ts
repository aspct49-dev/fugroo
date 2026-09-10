import 'server-only';

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
 */

export interface ChannelInfo {
  slug: string;
  chatroomId: number | null;
  live: boolean;
  avatar: string | null;
}

/**
 * One call for everything the panel shows about a channel: the chatroom to
 * subscribe to, whether it is live right now, and the profile picture.
 */
export async function channelInfo(channel: string): Promise<ChannelInfo | null> {
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(channel)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
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
    };
  } catch {
    return null;
  }
}
