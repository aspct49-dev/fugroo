'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SiKick } from 'react-icons/si';

import type { Entry, Gates, IncomingMessage, Miss } from '@/lib/giveaway';
import { readChat, type ChatMessage, type ChatReader, type ChatStatus } from '@/lib/kick-client';
import { PRIMARY_PARTNER } from '@/lib/partners';

/**
 * Running a chat raffle.
 *
 * Connect to the channel, open a round with a keyword and whatever gates
 * apply, then spin.
 *
 * **This component holds the chat connection.** The socket to Kick is opened
 * here, in the browser, because the alternative — holding it on the server —
 * only works where the server process outlives the request, and on serverless
 * it does not. The reasoning is written out in `lib/kick-client.ts`.
 *
 * That makes the split worth being precise about, because it is now the only
 * thing keeping a raffle honest:
 *
 *   · the browser **hears** chat, and forwards messages matching the keyword
 *   · the server **decides** — it re-checks the keyword, runs the eligibility
 *     gate against the affiliate list, and draws the winner
 *
 * So nothing a browser could tamper with changes who is eligible or who wins.
 * The entry list on screen is the server's answer, fetched back by polling,
 * not the browser's own tally.
 *
 * The spinner does not decide anything either. `roll()` picks the winner on
 * the server and returns it; the reel is then built so that name lands under
 * the marker. Letting the animation choose would put the draw in a browser,
 * where whoever is running it could reload until they liked the outcome — and
 * now that the browser holds the socket too, that line matters more, not less.
 *
 * The "not eligible" list under the entries is the point of the whole panel on
 * stream: it turns "why am I not in the list?" from a guess into an answer.
 */

/** Server state, as the poll endpoint returns it. */
export interface GiveawayView {
  open: boolean;
  keyword: string;
  channel: string;
  chatroomId: number | null;
  entries: Entry[];
  misses: Miss[];
  winner: Entry | null;
  entryCount: number;
  missCount: number;
  gates: Gates;
  slug: string;
  live: boolean;
  avatar: string | null;
}

/** The chat pill, in the three states the socket actually has. Reconnecting
 *  after a drop is not "off" and it is not "reading" — saying so is the
 *  difference between a quiet chat and a broken one. */
const CHAT_PILL: Record<ChatStatus, string> = {
  off: 'give-pill give-pill-warn',
  connecting: 'give-pill give-pill-warn',
  on: 'give-pill give-pill-ok',
};
const CHAT_LABEL: Record<ChatStatus, string> = {
  off: 'Not reading chat',
  connecting: 'Connecting…',
  on: 'Reading chat',
};

/** How long matched messages are held before being posted as one batch. */
const INGEST_MS = 1200;
/** Recent chat kept per person, for the winner's history. Browser-side only. */
const HISTORY_PER_USER = 6;
const HISTORY_USERS = 400;

/* ------------------------------------------------------------- the reel */

/** Card width plus its gap. Must match `.give-reel-card` in the stylesheet. */
const CARD_W = 160;
const SPIN_MS = 5200;
/** Cards that ride past before the winner lands, so it reads as a spin. */
const RUNWAY = 38;
/** Cards left over after the winner, so the reel does not end on a gap. */
const TAIL = 8;
const POLL_MS = 2000;

/** Unbiased index, for filling the decorative part of the strip. */
function randIndex(max: number): number {
  if (max <= 1) return 0;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const limit = Math.floor(0xffffffff / max) * max;
    const buf = new Uint32Array(1);
    do {
      crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * Fills the strip, never repeating a neighbour.
 *
 * With four entrants a naive random fill shows the same name twice in a row
 * often, and a reel that stutters on a duplicate as it slows looks broken
 * rather than random.
 */
function buildStrip(pool: Entry[], length: number): Entry[] {
  const out: Entry[] = [];
  for (let i = 0; i < length; i++) {
    let next = pool[randIndex(pool.length)];
    if (pool.length > 1) {
      let guard = 0;
      while (next.userId === out[i - 1]?.userId && guard++ < 12) {
        next = pool[randIndex(pool.length)];
      }
    }
    out.push(next);
  }
  return out;
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function ReelCard({ entry, lit }: { entry: Entry; lit?: boolean }) {
  return (
    <div className="give-reel-card" data-lit={lit || undefined}>
      <span className="give-reel-face" aria-hidden>
        {initial(entry.username)}
      </span>
      <span className="give-reel-name">{entry.username}</span>
      {entry.roobet && <span className="give-reel-sub">{entry.roobet}</span>}
    </div>
  );
}

/* ------------------------------------------------------------- the panel */

export function AdminGiveaway({
  initial: initialState,
  onLookup,
  onForget,
  onIngest,
  onOpen,
  onClose,
  onRoll,
  onReset,
  onClearMisses,
}: {
  initial: GiveawayView;
  onLookup: (form: FormData) => Promise<{ ok: boolean; error?: string }>;
  onForget: () => Promise<void>;
  onIngest: (messages: IncomingMessage[]) => Promise<void>;
  onOpen: (form: FormData) => Promise<void>;
  onClose: () => Promise<void>;
  onRoll: () => Promise<Entry | null>;
  onReset: () => Promise<void>;
  onClearMisses: () => Promise<void>;
}) {
  const [g, setG] = useState<GiveawayView>(initialState);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState<Entry | null>(null);
  const [strip, setStrip] = useState<Entry[]>([]);
  const [x, setX] = useState(0);
  const [gliding, setGliding] = useState(false);

  /* ------------------------------------------------------ the connection */

  const [chat, setChat] = useState<ChatStatus>('off');
  /** Set when the admin has asked to be reading; the effect below does it. */
  const [wanted, setWanted] = useState(false);
  const readerRef = useRef<ChatReader | null>(null);
  /** Matched messages waiting to be posted as a batch. */
  const pendingRef = useRef<IncomingMessage[]>([]);
  /** One in-flight post at a time: the store has no compare-and-set, so two
   *  overlapping read-modify-writes could drop entries. */
  const postingRef = useRef(false);
  /** Recent chat per person, for the winner's history. Never leaves the tab. */
  const historyRef = useRef(new Map<string, { text: string; at: number }[]>());
  const [history, setHistory] = useState<{ text: string; at: number }[]>([]);

  const stageRef = useRef<HTMLDivElement>(null);
  const spinningRef = useRef(false);

  /* --------------------------------------------------------------- poll */

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/giveaway', { cache: 'no-store' });
      if (!res.ok) return;
      setG((await res.json()) as GiveawayView);
    } catch {
      // A dropped poll is not worth surfacing; the next one is two seconds away.
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  /* ------------------------------------------------------------ the chat */

  /**
   * Sends whatever has piled up, one request at a time.
   *
   * Serialised deliberately. `ingest()` is a read, a change and a write of one
   * document and the store has no compare-and-set, so two of these in flight
   * together could read the same list and one write could lose the other's
   * entries. Anything that arrives while a post is running waits for the next
   * tick, which is a second away.
   */
  const flush = useCallback(async () => {
    if (postingRef.current) return;
    const batch = pendingRef.current;
    if (batch.length === 0) return;
    pendingRef.current = [];
    postingRef.current = true;
    try {
      await onIngest(batch);
      await refresh();
    } catch {
      // Put them back rather than dropping them on the floor: a failed post is
      // usually a blip, and an entry silently lost is the one thing this panel
      // must not do.
      pendingRef.current = [...batch, ...pendingRef.current];
    } finally {
      postingRef.current = false;
    }
  }, [onIngest, refresh]);

  useEffect(() => {
    const id = setInterval(() => void flush(), INGEST_MS);
    return () => clearInterval(id);
  }, [flush]);

  /**
   * Opens and closes the socket to follow what the admin asked for.
   *
   * Keyed on the chatroom as well as the wish, so changing channel tears the
   * old socket down and opens the new one without anyone pressing anything.
   */
  useEffect(() => {
    if (!wanted || g.chatroomId === null) {
      readerRef.current?.close();
      readerRef.current = null;
      return;
    }

    const reader = readChat(
      g.chatroomId,
      (msg: ChatMessage) => {
        // Everyone's last few lines, kept here rather than sent up: the server
        // only needs entries, and posting all of chat to it would be a request
        // per message for something only this screen ever shows.
        const key = msg.username.toLowerCase();
        const map = historyRef.current;
        const list = map.get(key) ?? [];
        list.unshift({ text: msg.text, at: msg.at });
        if (list.length > HISTORY_PER_USER) list.length = HISTORY_PER_USER;
        map.delete(key);
        map.set(key, list);
        if (map.size > HISTORY_USERS) {
          const oldest = map.keys().next().value;
          if (oldest) map.delete(oldest);
        }

        pendingRef.current.push({
          username: msg.username,
          userId: msg.userId,
          text: msg.text,
        });
      },
      setChat,
    );
    readerRef.current = reader;
    return () => {
      reader.close();
      readerRef.current = null;
    };
  }, [wanted, g.chatroomId]);

  /* --------------------------------------------------------------- spin */

  const spin = async () => {
    if (spinningRef.current || g.entries.length === 0) return;
    spinningRef.current = true;
    setSpinning(true);
    setRevealed(null);

    // The server draws first. Everything below is presentation of its answer.
    let winner: Entry | null = null;
    try {
      winner = await onRoll();
    } catch {
      winner = null;
    }
    if (!winner) {
      spinningRef.current = false;
      setSpinning(false);
      void refresh();
      return;
    }

    const pool = g.entries;
    const built = buildStrip(pool, RUNWAY);
    const winnerIndex = built.length;
    built.push(winner);
    built.push(...buildStrip(pool, TAIL));

    const stageW = stageRef.current?.offsetWidth ?? 900;
    const target = stageW / 2 - CARD_W / 2 - winnerIndex * CARD_W;

    setStrip(built);
    setGliding(false);
    setX(0);

    // Two frames: one for the browser to paint the strip at its start
    // position, one to start the transition. Setting both in the same frame
    // means there is no "before" to animate from and the reel jumps.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setGliding(true);
        setX(target);
      });
    });
  };

  const onGlideEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform' || !spinningRef.current) return;
    spinningRef.current = false;
    setSpinning(false);
    setRevealed(strip[RUNWAY] ?? null);
    void refresh();
  };

  // Never leave the panel stuck mid-spin if the transition never lands (a
  // background tab, a dropped frame). Belt and braces on a five-second bet.
  useEffect(() => {
    if (!spinning) return;
    const id = setTimeout(() => {
      if (!spinningRef.current) return;
      spinningRef.current = false;
      setSpinning(false);
      setRevealed(strip[RUNWAY] ?? null);
      void refresh();
    }, SPIN_MS + 1200);
    return () => clearTimeout(id);
  }, [spinning, strip, refresh]);

  // While the reel is running the server already knows the winner, so showing
  // `g.winner` would spoil the spin two seconds in. Suppress it until it lands.
  const shownWinner = spinning ? null : (revealed ?? g.winner);

  /* The winner's own lines, read out of this tab's buffer. They were never
     sent to the server — only entries are — so this is the one panel that
     shows what the browser heard rather than what the server decided. */
  useEffect(() => {
    if (!shownWinner) {
      setHistory([]);
      return;
    }
    setHistory(historyRef.current.get(shownWinner.username.toLowerCase()) ?? []);
  }, [shownWinner]);

  const act = (fn: () => Promise<void>) => async () => {
    await fn();
    void refresh();
  };

  const [editingChannel, setEditingChannel] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  /**
   * Look the channel up, then start listening.
   *
   * Two steps and only the first can fail usefully: the server turns a channel
   * name into a chatroom id, and the socket is opened by the effect above once
   * `wanted` is set. Both failures are caught, because both used to be silent
   * — a refused lookup and a server action that never arrived looked identical
   * from here, which is to say they looked like a button that did nothing.
   */
  const attemptConnect = async (fd: FormData): Promise<boolean> => {
    setConnecting(true);
    setConnectError(null);
    try {
      const result = await onLookup(fd);
      if (!result?.ok) {
        setConnectError(result?.error ?? 'Could not connect.');
        return false;
      }
      await refresh();
      setWanted(true);
      return true;
    } catch {
      setConnectError('The page could not reach the server. Reload and try again.');
      return false;
    } finally {
      setConnecting(false);
      void refresh();
    }
  };

  return (
    <>
      {/*
       * The channel bar. Which chat we are reading is the first thing to be
       * sure of before a giveaway, so it states it plainly and only turns into
       * an editor when asked — a text field sitting open invites an edit
       * nobody meant to make mid-stream.
       */}
      <div className="give-bar">
        {editingChannel ? (
          <form
            action={async (fd) => {
              if (await attemptConnect(fd)) setEditingChannel(false);
            }}
            className="give-bar-edit"
          >
            <span className="give-bar-mark" aria-hidden>
              <SiKick />
            </span>
            <input name="channel" defaultValue={g.channel} placeholder="fugroo" autoFocus />
            <button className="btn btn-primary btn-sm" type="submit">
              Connect
            </button>
            <button
              className="btn btn-quiet btn-sm"
              type="button"
              onClick={() => setEditingChannel(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <span className="give-bar-mark" aria-hidden>
              <SiKick />
            </span>
            <p className="give-bar-url">
              kick.com/<b>{g.slug || g.channel}</b>
            </p>

            <span className="give-bar-end">
              {/* Two different facts, and conflating them is how you end up
                  wondering why nothing is arriving: whether the streamer is
                  live, and whether we are reading their chat. */}
              <span className="give-pill" data-on={g.live || undefined}>
                {g.live ? 'Live' : 'Offline'}
              </span>
              {/* This one is the socket in this tab, not anything the server
                  knows — which is the whole point of where it now lives. */}
              <span className={CHAT_PILL[chat]}>{CHAT_LABEL[chat]}</span>

              {/*
               * Connect and disconnect, on the state they describe.
               *
               * Reconnecting used to mean opening the channel editor and
               * retyping a channel that had not changed — the editor is for
               * changing which chat we read, and it was carrying the job of
               * turning the socket back on as well. Connect sends no channel
               * at all: the server reuses the stored one.
               */}
              {chat === 'off' ? (
                <form
                  action={async (fd) => {
                    await attemptConnect(fd);
                  }}
                >
                  {/* The lookup and the handshake take a beat even when they
                      work, so the button says so rather than looking ignored. */}
                  <button
                    className="give-bar-btn give-bar-btn-on"
                    type="submit"
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting…' : 'Connect'}
                  </button>
                </form>
              ) : (
                <button
                  className="give-bar-btn give-bar-btn-off"
                  type="button"
                  onClick={() => {
                    setWanted(false);
                    setConnectError(null);
                    void onForget().then(refresh);
                  }}
                >
                  Disconnect
                </button>
              )}

              <button
                className="give-bar-btn"
                type="button"
                onClick={() => setEditingChannel(true)}
              >
                Change channel
              </button>
            </span>
          </>
        )}
      </div>

      {chat !== 'off' && (
        <p className="give-bar-error give-bar-note">
          <span aria-hidden>!</span>
          <span>
            <b>Keep this tab open.</b> The chat connection lives in this page, so entries collect
            only while it is open — closing it or letting the machine sleep stops the round.
          </span>
        </p>
      )}

      {connectError && (
        <p className="give-bar-error" role="status">
          <span aria-hidden>!</span>
          {connectError}
        </p>
      )}

      <div className="give-layout">
        {/* ----------------------------------------------------- controls */}
        <aside className="give-controls">
          <h3 className="give-legend">Controls</h3>

          <form action={onOpen} className="give-form">
            <label className="field">
              <span>Entry keyword</span>
              <input name="keyword" defaultValue={g.keyword} placeholder="!enter" />
            </label>

            <label className="give-check">
              <input type="checkbox" name="requireCode" defaultChecked={g.gates.requireCode} />
              <span>
                <b>Under code {PRIMARY_PARTNER.code}</b>
                <em>Checked against the affiliate list as each message arrives.</em>
              </span>
            </label>

            <label className="field">
              <span>Minimum wagered</span>
              <input
                name="minWagered"
                type="number"
                min="0"
                step="1"
                defaultValue={g.gates.minWagered || ''}
                placeholder="0"
              />
            </label>

            <button className="give-btn give-btn-go" type="submit">
              {g.open ? 'Restart Collecting' : 'Start Collecting'}
            </button>
          </form>

          {g.open && (
            <form action={act(onClose)}>
              <button className="give-btn give-btn-stop" type="submit">
                <span className="give-btn-glyph" aria-hidden />
                Stop collecting
              </button>
            </form>
          )}

          <button
            className="give-btn give-btn-spin"
            type="button"
            onClick={() => void spin()}
            disabled={spinning || g.entries.length === 0}
          >
            {spinning
              ? 'Spinning…'
              : `Spin (${g.entryCount} ${g.entryCount === 1 ? 'entry' : 'entries'})`}
          </button>

          <form action={act(onReset)}>
            <button className="give-btn give-btn-quiet" type="submit" disabled={spinning}>
              Clear All
            </button>
          </form>
        </aside>

        {/* --------------------------------------------------- reel + winner */}
        <div className="give-main">
          <div className="give-stage" ref={stageRef}>
            {strip.length > 0 ? (
              <>
                <span className="give-marker give-marker-top" aria-hidden />
                <span className="give-marker give-marker-bottom" aria-hidden />
                <div className="give-reel-window">
                  <div
                    className="give-reel"
                    data-gliding={gliding || undefined}
                    style={{
                      transform: `translate3d(${x}px,0,0)`,
                      transitionDuration: gliding ? `${SPIN_MS}ms` : '0ms',
                    }}
                    onTransitionEnd={onGlideEnd}
                  >
                    {strip.map((entry, i) => (
                      <ReelCard
                        key={`${entry.userId}-${i}`}
                        entry={entry}
                        lit={!spinning && i === RUNWAY}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="give-stage-empty">
                {g.entryCount > 0
                  ? 'Press Spin to draw a winner'
                  : `Waiting for “${g.keyword}” in chat…`}
              </p>
            )}
          </div>

          {shownWinner && (
            <div className="give-winner">
              <span className="give-winner-face" aria-hidden>
                {initial(shownWinner.username)}
              </span>
              <span className="give-winner-body">
                <span className="give-winner-tag">Winner</span>
                <b>{shownWinner.username}</b>
                {shownWinner.roobet && (
                  <i>
                    {shownWinner.roobet} on {PRIMARY_PARTNER.name}
                  </i>
                )}
              </span>
              <a
                className="give-bar-btn"
                href={`https://kick.com/${shownWinner.username}`}
                target="_blank"
                rel="noreferrer"
              >
                View profile ↗
              </a>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------- entries */}
        <div className="give-panel">
          <div className="give-panel-head">
            <h3>Entries</h3>
            <span className="give-panel-count" data-on={g.entryCount > 0 || undefined}>
              {g.entryCount}
            </span>
          </div>
          {g.entries.length ? (
            <div className="give-list">
              {g.entries.map((e) => (
                <span
                  className="give-chip"
                  key={e.userId}
                  data-win={shownWinner?.userId === e.userId}
                >
                  {e.username}
                  {e.roobet && <em>{e.roobet}</em>}
                </span>
              ))}
            </div>
          ) : (
            <p className="give-panel-empty">Waiting for “{g.keyword}” in chat…</p>
          )}
        </div>

        {/* --------------------------------------------- winner's own chat */}
        <div className="give-panel">
          <div className="give-panel-head">
            <h3>{shownWinner ? `${shownWinner.username}’s recent messages` : 'Recent messages'}</h3>
          </div>
          {!shownWinner ? (
            <p className="give-panel-empty">Spin to see the winner’s chat history.</p>
          ) : history.length ? (
            <div className="give-msgs">
              {history.map((m, i) => (
                <p className="give-msg" key={i}>
                  <span>
                    {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {m.text}
                </p>
              ))}
            </div>
          ) : (
            <p className="give-panel-empty">Waiting for {shownWinner.username} to chat…</p>
          )}
        </div>
      </div>

      {/* --------------------------------------------------- not eligible */}
      {g.misses.length > 0 && (
        <div className="admin-panel" style={{ marginTop: 16 }}>
          <div className="admin-panel-head">
            <h2 className="h-section">
              Not eligible <span className="admin-count">{g.missCount}</span>
            </h2>
            <form action={act(onClearMisses)}>
              <button className="btn btn-quiet btn-sm" type="submit">
                Clear
              </button>
            </form>
          </div>
          <div className="admin-list">
            {g.misses.map((m) => (
              <div className="admin-bonus" key={m.username}>
                <span className="admin-bonus-game">{m.username}</span>
                <span className="admin-bonus-bet">{m.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  );
}
