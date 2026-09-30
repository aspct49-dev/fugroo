'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { FaCrown } from 'react-icons/fa';

import { buildBracket, advanceWinner, matchesInRound, type Match, type Player } from '@/lib/bracket';
import type { TournamentOverlay as State } from '@/lib/overlay.shared';
import { Bracket } from '../Bracket';
import { SlotThumb } from '../SlotPicker';
import { usePoll } from './usePoll';

/**
 * The tournament for OBS, in one of two shapes.
 *
 * - **bracket** — the whole draw, with the stage named above it and the match
 *   being played lit. It is the site's own `Bracket`, scaled to fit whatever
 *   size the browser source is, so a 32-player draw fits a 1080p scene and a
 *   4-player one does not sit tiny in the corner of it.
 * - **stage** — a narrow panel for the side of the stream: the stage, the
 *   round's matches, and which one is on now. What a viewer arriving halfway
 *   through actually wants to know.
 *
 * Nothing is shown while there is no published tournament — drafts never reach
 * this, see `activeTournament`.
 */

export type TournamentView = 'bracket' | 'stage';

export function TournamentOverlay({ view, demo }: { view: TournamentView; demo: boolean }) {
  const polled = usePoll<State>('/api/overlay/tournament', demo);
  const t = demo ? DEMO : polled.data?.tournament ?? null;

  if (!t) return <div className="ovt" data-show={false} />;

  return (
    <div className="ovt" data-show data-view={view}>
      <header className="ovt-head">
        <span className="ovt-title">
          <span className="ovt-eyebrow">
            Tournament{t.prize && <> · <b>{t.prize}</b></>}
          </span>
          <span className="ovt-name">{t.name}</span>
        </span>
        <span className="ovt-stage" data-done={t.status === 'complete' || undefined}>
          <span className="ovt-stage-label">{t.status === 'complete' ? 'Complete' : 'Now playing'}</span>
          <strong key={t.stage}>{t.stage}</strong>
        </span>
      </header>

      <ol className="ovt-rail" aria-label="Stages">
        {t.stages.map((s, r) => (
          <li
            key={s}
            data-state={
              t.status === 'complete' || r < t.currentRound
                ? 'done'
                : r === t.currentRound
                  ? 'now'
                  : 'next'
            }
          >
            {s}
          </li>
        ))}
      </ol>

      {view === 'bracket' ? (
        <Fit>
          <Bracket
            matches={t.matches}
            liveMatchId={t.liveMatchId}
            currentRound={t.status === 'complete' ? null : t.currentRound}
          />
        </Fit>
      ) : t.champion ? (
        <Champion player={t.champion} prize={t.prize} />
      ) : (
        <ul className="ovt-matches">
          {matchesInRound(t.matches, t.currentRound).map((m) => (
            <StageMatch key={m.id} match={m} live={m.id === t.liveMatchId} />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ stage view */

function StageMatch({ match, live }: { match: Match; live: boolean }) {
  const row = (p: Player, mult: number | null, side: 'p1' | 'p2') => (
    <div
      className="ovt-row"
      data-winner={match.winner === side || undefined}
      data-loser={(match.winner !== null && match.winner !== side) || undefined}
    >
      {p.slot ? (
        <SlotThumb name={p.slot} img={p.slotImg} />
      ) : (
        <span className="ovt-seed" aria-hidden>
          {p.name.trim().charAt(0).toUpperCase() || '–'}
        </span>
      )}
      <span className="ovt-who">
        <b>{p.name || 'TBD'}</b>
        <span>{p.slot || '—'}</span>
      </span>
      <span className="ovt-mult">{mult === null ? '' : `${formatMult(mult)}×`}</span>
    </div>
  );

  return (
    <li className="ovt-match" data-live={live || undefined} data-decided={match.winner !== null || undefined}>
      {live && <span className="ovt-live">Live</span>}
      {row(match.player1, match.mult1, 'p1')}
      {row(match.player2, match.mult2, 'p2')}
    </li>
  );
}

function Champion({ player, prize }: { player: Player; prize: string }) {
  return (
    <div className="ovt-champ">
      <span className="ovt-champ-label">
        <FaCrown aria-hidden /> Champion
      </span>
      <div className="ovt-champ-body">
        {player.slot && <SlotThumb name={player.slot} img={player.slotImg} />}
        <span>
          <strong>{player.name}</strong>
          {player.slot && <em>{player.slot}</em>}
        </span>
      </div>
      {prize && <span className="ovt-champ-prize">{prize}</span>}
    </div>
  );
}

function formatMult(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/* ------------------------------------------------------------------- fit */

/**
 * Scales its content down (or up, a little) to fill the space left under the
 * header, measured rather than guessed.
 *
 * The bracket is drawn in fixed pixels — its wires are computed from the same
 * numbers as its cards — so it cannot reflow to fit. Scaling it as a whole
 * keeps that geometry intact and makes the browser source's size the only
 * setting that matters. Capped at 1.4× so a four-player draw in a large source
 * does not balloon into something that reads as a mistake.
 */
function Fit({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const w = inner.current.scrollWidth;
      const h = inner.current.scrollHeight;
      const box = outer.current.getBoundingClientRect();
      if (!w || !h) return;
      setSize({ w, h });
      setScale(Math.min(box.width / w, box.height / h, 1.4));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="ovt-fit" ref={outer}>
      <div
        className="ovt-fit-inner"
        ref={inner}
        style={{
          transform: `scale(${scale})`,
          // Centred horizontally in whatever width is left over once scaled.
          marginLeft: size.w ? `max(0px, calc((100% - ${size.w * scale}px) / 2))` : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ demo */

/**
 * An eight-player draw part-way through the quarters, for placing the source.
 * Built with the real bracket functions, so it is a bracket the site could
 * actually have produced.
 */
const DEMO: NonNullable<State['tournament']> = (() => {
  const names = ['Soulblind', 'kiwiReels', 'maxwin_mo', 'LuckyLeo', 'ThreeSevens', 'crashkid', 'RooBoy', 'ZeroEdge'];
  const slots = ['Gates of Olympus', 'Sweet Bonanza', 'Wanted Dead or a Wild', 'Sugar Rush', 'Dog House', 'Big Bass Splash', 'Book of Dead', 'Starlight Princess'];
  let m = buildBracket(8, names.map((name, i) => ({ name, slot: slots[i] })));
  m = m.map((x) => (x.id === '0-0' ? { ...x, mult1: 212.4, mult2: 48 } : x));
  m = advanceWinner(m, '0-0', 'p1');
  m = m.map((x) => (x.id === '0-1' ? { ...x, mult1: 15.2, mult2: 96.75 } : x));
  m = advanceWinner(m, '0-1', 'p2');
  return {
    name: 'Slot Battle',
    prize: '$250',
    size: 8,
    status: 'live',
    rounds: 3,
    currentRound: 0,
    stage: 'Quarter-finals',
    stages: ['Quarter-finals', 'Semi-finals', 'Final'],
    decided: 2,
    total: m.length,
    liveMatchId: '0-2',
    matches: m,
    champion: null,
  };
})();
