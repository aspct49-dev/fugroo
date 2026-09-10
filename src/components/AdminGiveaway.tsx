'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SiKick } from 'react-icons/si';

import type { Entry, Gates, Miss } from '@/lib/giveaway';
import { PRIMARY_PARTNER } from '@/lib/partners';

/**
 * Running a chat giveaway.
 *
 * Connect to the channel, open a round with a keyword and whatever gates
 * apply, then spin. The gates are enforced on the server as each message
 * arrives — these switches decide what is checked, not whether it is checked.
 *
 * Two things make this a client component rather than the form-post panel it
 * used to be:
 *
 *   1. **Entries arrive on their own.** They come from chat while the admin
 *      watches, so the count has to move without anyone clicking. It polls.
 *   2. **The spin is an animation.** A reel of names runs past and slows onto
 *      the winner, because a giveaway on stream is a moment and an instant
 *      answer throws it away.
 *
 * The spinner does **not** decide anything. `roll()` picks the winner on the
 * server and returns it; the reel is then built so that name lands under the
 * marker. Letting the animation choose would move the draw into a browser,
 * where whoever is running it could reload until they liked the outcome.
 *
 * The "not eligible" list under the entries is the point of the whole panel on
 * stream: it turns "why am I not in the list?" from a guess into an answer.
 */

/** Server state, as the poll endpoint returns it. */
export interface GiveawayView {
  connected: boolean;
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
  /* Added for the channel bar and the winner's chat history. */
  slug: string;
  live: boolean;
  avatar: string | null;
  winnerMessages: { text: string; at: number }[];
}

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
  onConnect,
  onDisconnect,
  onOpen,
  onClose,
  onRoll,
  onReset,
  onClearMisses,
}: {
  initial: GiveawayView;
  onConnect: (form: FormData) => Promise<void>;
  onDisconnect: () => Promise<void>;
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

  const act = (fn: () => Promise<void>) => async () => {
    await fn();
    void refresh();
  };

  const [editingChannel, setEditingChannel] = useState(false);

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
              await onConnect(fd);
              setEditingChannel(false);
              void refresh();
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
              {!g.connected && <span className="give-pill give-pill-warn">Not reading chat</span>}
              <button
                className="give-bar-btn"
                type="button"
                onClick={() => setEditingChannel(true)}
              >
                &larr; Change channel
              </button>
            </span>
          </>
        )}
      </div>

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
          ) : g.winnerMessages.length ? (
            <div className="give-msgs">
              {g.winnerMessages.map((m, i) => (
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

      {g.connected && (
        <form action={act(onDisconnect)} style={{ marginTop: 14 }}>
          <button className="btn btn-quiet btn-sm" type="submit">
            Disconnect From Chat
          </button>
        </form>
      )}
    </>
  );
}
