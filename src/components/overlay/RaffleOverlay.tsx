'use client';

import { useEffect, useRef, useState } from 'react';
import { FaCrown, FaRegClock, FaTicketAlt } from 'react-icons/fa';

import { SPIN_MS, type RaffleOverlay as State } from '@/lib/overlay.shared';
import { usePoll } from './usePoll';

/**
 * The raffle card for OBS.
 *
 * Four states, all in the one card so it never jumps position on stream:
 *
 * - **hidden** — no round and no winner. The page is transparent.
 * - **open** — the keyword to type and the entry count, climbing live.
 * - **drawing** — a reel through the entrants' names, timed to land at the
 *   same moment as the admin panel's (see `SPIN_MS`).
 * - **winner** — the name, the keyword, how many were in it and how long ago.
 *
 * `demo` feeds the card sample data instead of polling, so it can be placed
 * and sized in OBS before a raffle is running.
 */

export type RaffleDemo = 'open' | 'drawing' | 'winner';

type Phase = 'hidden' | 'open' | 'drawing' | 'winner';

interface Spin {
  frames: string[];
  start: number;
  end: number;
  /** Which draw this is, so the same draw is never spun twice. */
  drawnAt: number;
}

/** Enough names flash past that it reads as a spin rather than a slideshow. */
const FRAMES = 34;
/** A draw due to land sooner than this is shown as a result, not spun. */
const MIN_SPIN_MS = 700;

export function RaffleOverlay({ demo }: { demo: RaffleDemo | null }) {
  const polled = usePoll<State>('/api/overlay/raffle', demo !== null);
  const fake = useDemo(demo);
  const data = demo ? fake : polled.data;
  const skew = demo ? 0 : polled.skew;

  const [spin, setSpin] = useState<Spin | null>(null);
  const [frame, setFrame] = useState(0);
  const handled = useRef<number | null>(null);

  /* A new draw starts a spin that ends when the admin reel does. Joining
     late — the scene switched in two seconds after the button — spins for
     what is left of it; joining after it has landed just shows the result. */
  useEffect(() => {
    if (!data?.winner || !data.drawnAt || handled.current === data.drawnAt) return;
    handled.current = data.drawnAt;

    const now = Date.now();
    const end = data.drawnAt - skew + SPIN_MS;
    if (end - now < MIN_SPIN_MS) return;

    setSpin({
      frames: reel(data.names, data.winner.username),
      start: now,
      end,
      drawnAt: data.drawnAt,
    });
  }, [data, skew]);

  useEffect(() => {
    if (!spin) return;
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - spin.start) / (spin.end - spin.start));
      setFrame(Math.round(easeOut(t) * (spin.frames.length - 1)));
      if (t < 1) raf = requestAnimationFrame(step);
      else setSpin(null);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [spin]);

  const ago = useAgo(data?.drawnAt ?? null, skew);

  const phase: Phase = spin
    ? 'drawing'
    : data?.winner
      ? 'winner'
      : data?.open
        ? 'open'
        : 'hidden';

  /* The last thing shown is kept on screen while the card fades out, so the
     exit is the card leaving rather than going blank and then leaving. */
  const shown = useRef<{ phase: Phase; data: State } | null>(null);
  if (phase !== 'hidden' && data) shown.current = { phase, data };
  const view = shown.current;

  if (!view) return <div className="ovr" data-show={false} />;

  const d = view.data;
  const entrants = d.entryCount + d.winnerCount;
  const p = phase === 'hidden' ? view.phase : phase;

  const label =
    p === 'open' ? (
      <>
        <span className="ovr-dot" aria-hidden /> Raffle open
      </>
    ) : p === 'drawing' ? (
      'Drawing…'
    ) : (
      <>
        <FaCrown aria-hidden /> {d.winnerCount > 1 ? `Winner #${d.winnerCount}` : 'Winner'}
      </>
    );

  const headline =
    p === 'open' ? (
      <span className="ovr-name ovr-name-cta">
        Type <em>{d.keyword}</em>
      </span>
    ) : p === 'drawing' && spin ? (
      <span key={frame} className="ovr-name ovr-name-reel">
        {spin.frames[frame]}
      </span>
    ) : (
      <span key={`w-${d.drawnAt}`} className="ovr-name ovr-name-win">
        {d.winner?.username ?? ''}
      </span>
    );

  return (
    <div className="ovr" data-show={phase !== 'hidden'} data-phase={p}>
      <div className="ovr-card">
        <div className="ovr-top">
          <span className="ovr-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element -- channel mark */}
            <img src="/brand-mark.webp" alt="" />
          </span>
          <span className="ovr-head">
            <span className="ovr-label">{label}</span>
            <span className="ovr-name-box">{headline}</span>
          </span>
          {/* While open, the count is the headline at the bottom, so the corner
              says the round is live instead of repeating the number. */}
          {p === 'open' ? (
            <span className="ovr-badge ovr-badge-top ovr-badge-live">Live</span>
          ) : (
            <span className="ovr-badge ovr-badge-top" title="Entries">
              <FaTicketAlt aria-hidden /> {entrants.toLocaleString('en-GB')}
            </span>
          )}
        </div>

        <div className="ovr-bottom">
          <span className="ovr-field">
            {p === 'open' ? (
              <>
                <span className="ovr-label">Entries</span>
                <strong key={entrants} className="ovr-count">
                  {entrants.toLocaleString('en-GB')}
                </strong>
              </>
            ) : (
              <>
                <span className="ovr-label">Keyword</span>
                <strong>{d.keyword}</strong>
              </>
            )}
          </span>
          {p === 'winner' && ago && (
            <span className="ovr-badge">
              <FaRegClock aria-hidden /> {ago}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ reel */

/**
 * The names the reel shows, ending on the winner.
 *
 * Shuffled so the reel does not read out chat in the order people typed, and
 * repeated to length so a round of four still spins. The winner is left out
 * of the run-up — landing on a name that flashed past a moment earlier looks
 * like the reel stuttered.
 */
function reel(names: string[], winner: string): string[] {
  const others = names.filter((n) => n !== winner);
  const pool = others.length ? others : ['???'];
  const out: string[] = [];
  let bag: string[] = [];
  while (out.length < FRAMES - 1) {
    if (!bag.length) bag = shuffle(pool);
    const next = bag.pop()!;
    // Never the same name twice in a row, where there is a choice.
    if (out.length && out[out.length - 1] === next && pool.length > 1) continue;
    out.push(next);
  }
  out.push(winner);
  return out;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fast out of the gate, a long slow crawl onto the name. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/* ------------------------------------------------------------------- ago */

/** "just now", "4m", "2h" — the same shorthand Kick's own cards use. */
function useAgo(at: number | null, skew: number): string | null {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);
  if (!at) return null;
  const mins = Math.floor((Date.now() + skew - at) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

/* ------------------------------------------------------------------ demo */

const SAMPLE = [
  'Soulblind', 'kiwiReels', 'maxwin_mo', 'LuckyLeo', 'ThreeSevens', 'crashkid',
  'nomadspin', 'RooBoy', 'ScatterQueen', 'bonusbuyer', 'ZeroEdge', 'vaultrunner',
];

/**
 * Sample state for placing the card in OBS. `drawing` re-draws every ten
 * seconds so the reel can be watched as many times as it takes to size it.
 */
function useDemo(demo: RaffleDemo | null): State | null {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    if (!demo) return;
    const base: State = {
      now: Date.now(),
      open: demo === 'open',
      keyword: '!enter',
      entryCount: 128,
      names: SAMPLE,
      winner: null,
      drawnAt: null,
      winnerCount: 0,
    };

    if (demo === 'open') {
      setState(base);
      const id = setInterval(
        () => setState((s) => s && { ...s, entryCount: s.entryCount + 1 + Math.floor(Math.random() * 3) }),
        1400,
      );
      return () => clearInterval(id);
    }

    if (demo === 'winner') {
      setState({
        ...base,
        winner: { username: 'Soulblind' },
        drawnAt: Date.now() - 12 * 60_000,
        winnerCount: 1,
      });
      return;
    }

    const draw = () =>
      setState({
        ...base,
        now: Date.now(),
        winner: { username: SAMPLE[Math.floor(Math.random() * SAMPLE.length)] },
        drawnAt: Date.now(),
        winnerCount: 1,
      });
    draw();
    const id = setInterval(draw, 10_000);
    return () => clearInterval(id);
  }, [demo]);

  return state;
}
