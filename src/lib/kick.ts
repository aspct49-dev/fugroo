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
/** The handshake in flight, so a second Connect waits on it rather than
 *  restarting it. */
let opening: Promise<boolean> | null = null;

export function chatState() {
  return {
    connected: socket?.readyState === WebSocket.OPEN,
    chatroomId: joined,
  };
}

export function onChat(fn: Handler | null) {
  handler = fn;
}

/**
 * Opens the socket and subscribes, and does not resolve until it is actually
 * open.
 *
 * The waiting is the point. This used to return the moment the socket was
 * *asked* to open, so the admin panel's Connect finished with the handshake
 * still in flight, `chatState()` still reported CONNECTING rather than OPEN,
 * and the button appeared to have done nothing until the next poll two
 * seconds later. Long enough to press it again, or reload and assume it had
 * dropped.
 *
 * Calling it again for the same room is still a no-op — and a second call
 * while the first is mid-handshake waits on that same handshake rather than
 * tearing it down and starting another.
 */
export function connectChat(id: number): Promise<boolean> {
  if (socket && joined === id && socket.readyState === WebSocket.OPEN) {
    return Promise.resolve(true);
  }
  if (opening && joined === id) return opening;

  disconnectChat();
  joined = id;
  opening = open(id).finally(() => {
    opening = null;
  });
  return opening;
}

/**
 * Resolves true once the socket is open, false if it fails or takes too long.
 *
 * Never rejects: the reconnect timer calls this and nothing awaits it there,
 * and an unhandled rejection on a background retry would take the process
 * down for a chat socket.
 */
function open(id: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const ws = new WebSocket(PUSHER_URL);
    socket = ws;

    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve(ok);
    };
    /* Kick is up or it is not; a handshake still running after this is not
       going to complete, and the admin is waiting on a button. */
    const deadline = setTimeout(() => settle(false), 8000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `chatrooms.${id}.v2` } }));
      // Pusher drops an idle connection; this is well inside its timeout.
      ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }, 30_000);
      settle(true);
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
      // A close before the handshake finished is a failed connect, and the
      // caller is owed the answer now rather than after the retry.
      settle(false);
      // Only reconnect if nobody asked us to stop; `joined` is cleared on
      // disconnect, which is what tells the difference.
      if (joined === id && !reconnect) {
        reconnect = setTimeout(() => {
          reconnect = null;
          if (joined === id) void open(id);
        }, 4000);
      }
    };

    ws.on('close', retry);
    ws.on('error', retry);
  });
}

export function disconnectChat(): void {
  joined = null;
  opening = null;
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
