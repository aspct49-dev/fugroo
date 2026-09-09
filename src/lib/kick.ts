import 'server-only';

import { WebSocket } from 'ws';

/**
 * Reading a Kick chatroom.
 *
 * Kick fronts its chat with Pusher, and the chat feed is public — subscribing
 * to `chatrooms.<id>.v2` needs no token, only the chatroom id, which the
 * channel API hands over. That is why this needs none of the Kick OAuth
 * credentials: those are for *acting* as an account, and all we do is listen.
 *
 * The connection is a module-level singleton, which is a deliberate trade. On
 * a VPS `next start` is one long-lived process, so a socket opened here lives
 * as long as the site does. It does not survive a restart or a redeploy — the
 * giveaway has to be reconnected afterwards — and it would not work at all
 * behind more than one instance. A separate worker process would fix both, and
 * is the upgrade path if either becomes a problem.
 */

const PUSHER_KEY = '32cbd69e4b950bf97679';
const PUSHER_URL = `wss://ws-us2.pusher.com/app/${PUSHER_KEY}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;

export interface ChatMessage {
  username: string;
  /** Kick's numeric user id — stable where the handle is not. */
  userId: string;
  text: string;
  at: number;
}

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

/** Looks up the chatroom behind a channel slug. */
export async function chatroomId(channel: string): Promise<number | null> {
  if (process.env.KICK_CHATROOM_ID) return Number(process.env.KICK_CHATROOM_ID);
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(channel)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { chatroom?: { id?: number } };
    return data.chatroom?.id ?? null;
  } catch {
    return null;
  }
}

type Handler = (msg: ChatMessage) => void;

let socket: WebSocket | null = null;
let joined: number | null = null;
let handler: Handler | null = null;
let ping: NodeJS.Timeout | null = null;
let reconnect: NodeJS.Timeout | null = null;

export function chatState() {
  return {
    connected: socket?.readyState === WebSocket.OPEN,
    chatroomId: joined,
  };
}

export function onChat(fn: Handler | null) {
  handler = fn;
}

/** Opens the socket and subscribes. Calling it again for the same room is a
 *  no-op, so an admin double-clicking Connect does not open two sockets. */
export function connectChat(id: number): void {
  if (socket && joined === id && socket.readyState <= WebSocket.OPEN) return;
  disconnectChat();
  joined = id;
  open(id);
}

function open(id: number) {
  const ws = new WebSocket(PUSHER_URL);
  socket = ws;

  ws.on('open', () => {
    ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `chatrooms.${id}.v2` } }));
    // Pusher drops an idle connection; this is well inside its timeout.
    ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
    }, 30_000);
  });

  ws.on('message', (raw) => {
    let frame: { event?: string; data?: unknown };
    try {
      frame = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (frame.event === 'pusher:ping') {
      ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      return;
    }
    if (frame.event !== 'App\\Events\\ChatMessageEvent') return;

    // Pusher double-encodes: the payload arrives as a JSON string inside JSON.
    try {
      const body = typeof frame.data === 'string' ? JSON.parse(frame.data) : frame.data;
      const sender = (body as { sender?: { username?: string; id?: number } }).sender;
      const content = (body as { content?: string }).content;
      if (!sender?.username || typeof content !== 'string') return;
      handler?.({
        username: sender.username,
        userId: String(sender.id ?? sender.username),
        text: content,
        at: Date.now(),
      });
    } catch {
      /* A malformed frame is not worth taking the listener down for. */
    }
  });

  const retry = () => {
    if (ping) clearInterval(ping);
    ping = null;
    // Only reconnect if nobody asked us to stop; `joined` is cleared on
    // disconnect, which is what tells the difference.
    if (joined === id && !reconnect) {
      reconnect = setTimeout(() => {
        reconnect = null;
        if (joined === id) open(id);
      }, 4000);
    }
  };

  ws.on('close', retry);
  ws.on('error', retry);
}

export function disconnectChat(): void {
  joined = null;
  if (ping) clearInterval(ping);
  if (reconnect) clearTimeout(reconnect);
  ping = null;
  reconnect = null;
  try {
    socket?.close();
  } catch {
    /* Closing an already-dead socket is not an error worth surfacing. */
  }
  socket = null;
}
