/**
 * Reading a Kick chatroom, from the browser.
 *
 * Kick fronts its chat with Pusher and the feed is public: subscribing to
 * `chatrooms.<id>.v2` needs no token, only the chatroom id, which the channel
 * API hands over. None of the Kick OAuth credentials are involved — those are
 * for *acting* as an account, and all this does is listen.
 *
 * **Why the browser and not the server.** This socket used to live in a Node
 * module on the server, which works for exactly as long as the process does.
 * On serverless there is no such process: the function is frozen the moment a
 * request finishes and thawed for the next one, on no guarantee it is even the
 * same instance. A socket opened during a request is dead before the next poll
 * asks about it, which from the panel looked like a Connect button that did
 * nothing. The admin's own tab, by contrast, is a genuinely long-lived process
 * for as long as it is open, and the same code then runs on any host.
 *
 * The trade, stated plainly: **entries collect only while the tab is open.**
 * Close it mid-round and nothing is listening. The socket surviving on its own
 * was the one thing the server version did better, and it is the price of
 * running anywhere.
 *
 * Nothing here decides anything. Messages are handed to the caller, which
 * posts the ones that matter to the server — the eligibility gate and the draw
 * both stay server-side, where a browser cannot argue with them.
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

export type ChatStatus = 'off' | 'connecting' | 'on';

export interface ChatReader {
  /** Stops listening and closes the socket. Safe to call twice. */
  close(): void;
}

/**
 * Opens a reader for one chatroom.
 *
 * `onStatus` fires on every transition so the panel can say what is happening
 * rather than guessing from the absence of messages. A drop reconnects on its
 * own — a stream's socket gets closed for all sorts of reasons that are not
 * anybody deciding to stop.
 */
export function readChat(
  chatroomId: number,
  onMessage: (msg: ChatMessage) => void,
  onStatus: (status: ChatStatus) => void,
): ChatReader {
  let socket: WebSocket | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const clearTimers = () => {
    if (ping) clearInterval(ping);
    if (retry) clearTimeout(retry);
    ping = null;
    retry = null;
  };

  const open = () => {
    if (closed) return;
    onStatus('connecting');

    const ws = new WebSocket(PUSHER_URL);
    socket = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `chatrooms.${chatroomId}.v2` } }));
      // Pusher drops an idle connection; this is well inside its timeout.
      ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
        }
      }, 30_000);
      onStatus('on');
    };

    ws.onmessage = (event) => {
      let frame: { event?: string; data?: unknown };
      try {
        frame = JSON.parse(String(event.data));
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
        onMessage({
          username: sender.username,
          userId: String(sender.id ?? sender.username),
          text: content,
          at: Date.now(),
        });
      } catch {
        /* A malformed frame is not worth taking the listener down for. */
      }
    };

    const dropped = () => {
      clearTimers();
      if (closed) return;
      onStatus('connecting');
      retry = setTimeout(open, 4000);
    };

    ws.onclose = dropped;
    ws.onerror = dropped;
  };

  open();

  return {
    close() {
      closed = true;
      clearTimers();
      try {
        socket?.close();
      } catch {
        /* Closing an already-dead socket is not an error worth surfacing. */
      }
      socket = null;
      onStatus('off');
    },
  };
}
