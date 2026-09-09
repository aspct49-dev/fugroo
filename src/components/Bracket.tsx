'use client';

import {
  championOf,
  matchReady,
  matchScored,
  matchesInRound,
  roundLabel,
  roundsIn,
  type Match,
  type Player,
} from '@/lib/bracket';
import { SlotPicker, SlotThumb } from './SlotPicker';

/**
 * The bracket, drawn once for both audiences.
 *
 * The public page and the admin editor render the *same* component — the only
 * difference is whether the fields are inputs. Two components would be two
 * geometries, and the first time one gained a row height the wires would stop
 * meeting the cards on one of them. So the layout maths lives here and the
 * editability is a prop.
 *
 * Everything is controlled: this holds no state at all. The editor owns the
 * `Match[]` so it can persist after each change, and the public page passes
 * matches with no handlers, which is what makes it read-only.
 */

/* ------------------------------------------------------------- geometry */

/**
 * Fixed pixel geometry, not a CSS grid.
 *
 * A bracket's whole point is that a round's cards sit centred between the two
 * they came from, which is a function of `2^round` and cannot be expressed as
 * a repeating grid. So the column padding and gaps are computed, and the SVG
 * wires are computed from the same numbers — one source, so they line up.
 */
const ROW_H = 60; // artwork, name and slot line
const FOOTER_H = 28;
const CARD_H = ROW_H * 2 + 2 + FOOTER_H;
const BASE_GAP = 14;
const SLOT_PX = CARD_H + BASE_GAP;
const COL_W = 250;
const COL_GAP = 46;
const LABEL_H = 32;
const WIN_H = 72;

const padTop = (r: number) => (SLOT_PX / 2) * (Math.pow(2, r) - 1);
const gapBetween = (r: number) => SLOT_PX * Math.pow(2, r) - CARD_H;

const cardCentreY = (r: number, i: number) =>
  LABEL_H + padTop(r) + i * (CARD_H + gapBetween(r)) + CARD_H / 2;

const rowCentreY = (r: number, i: number, row: 0 | 1) => {
  const top = LABEL_H + padTop(r) + i * (CARD_H + gapBetween(r));
  return row === 0 ? top + 1 + ROW_H / 2 : top + 1 + ROW_H + 1 + ROW_H / 2;
};

/* ----------------------------------------------------------------- wires */

function Wires({ rounds }: { rounds: number }) {
  const width = (rounds + 1) * COL_W + rounds * COL_GAP + 4;
  const firstRound = Math.pow(2, rounds - 1);
  const height = LABEL_H + firstRound * CARD_H + (firstRound - 1) * BASE_GAP + 80;
  const parts: React.ReactNode[] = [];

  for (let r = 0; r < rounds; r++) {
    const xRight = r * (COL_W + COL_GAP) + COL_W;
    const xNext = (r + 1) * (COL_W + COL_GAP);
    const xMid = xRight + COL_GAP / 2;

    if (r < rounds - 1) {
      for (let j = 0; j < Math.pow(2, rounds - 2 - r); j++) {
        const topY = cardCentreY(r, j * 2);
        const botY = cardCentreY(r, j * 2 + 1);
        parts.push(
          <g key={`w-${r}-${j}`} fill="none" strokeLinecap="square">
            <line x1={xRight} y1={topY} x2={xMid} y2={topY} />
            <line x1={xRight} y1={botY} x2={xMid} y2={botY} />
            <line x1={xMid} y1={topY} x2={xMid} y2={botY} />
            <polyline
              points={`${xMid},${topY} ${xMid},${rowCentreY(r + 1, j, 0)} ${xNext},${rowCentreY(r + 1, j, 0)}`}
            />
            <polyline
              points={`${xMid},${botY} ${xMid},${rowCentreY(r + 1, j, 1)} ${xNext},${rowCentreY(r + 1, j, 1)}`}
            />
          </g>,
        );
      }
    } else {
      parts.push(
        <line
          key="w-final"
          x1={xRight}
          y1={cardCentreY(r, 0)}
          x2={xNext}
          y2={LABEL_H + padTop(rounds - 1) + CARD_H / 2}
        />,
      );
    }
  }

  return (
    <svg className="bkt-wires" width={width} height={height} aria-hidden>
      {parts}
    </svg>
  );
}

/* ------------------------------------------------------------ match card */

interface RowHandlers {
  onName?: (which: 1 | 2, value: string) => void;
  onSlot?: (which: 1 | 2, slot: { name: string; provider?: string; img?: string }) => void;
  onMult?: (which: 1 | 2, value: number | null) => void;
  onDecide?: () => void;
  onReset?: () => void;
}

function MatchCard({
  match,
  editable,
  handlers,
}: {
  match: Match;
  editable: boolean;
  handlers: RowHandlers;
}) {
  const ready = matchReady(match);
  const scored = matchScored(match);
  const canDecide = editable && ready && scored && !match.winner;
  const winnerName =
    match.winner === 'p1' ? match.player1.name : match.winner === 'p2' ? match.player2.name : null;

  const row = (player: Player, mult: number | null, which: 1 | 2) => {
    const isWinner =
      (which === 1 && match.winner === 'p1') || (which === 2 && match.winner === 'p2');
    const isLoser = match.winner !== null && !isWinner;

    return (
      <div className="bkt-row" data-winner={isWinner} data-loser={isLoser} style={{ height: ROW_H }}>
        {/* The slot's artwork is the anchor once one is picked, because that is
            what an admin scanning the bracket recognises first. Before then it
            falls back to the player's initial so the row is never empty. */}
        {player.slot ? (
          <SlotThumb name={player.slot} img={player.slotImg} />
        ) : (
          <span className="bkt-seed" aria-hidden>
            {player.name.trim() ? player.name.trim().charAt(0).toUpperCase() : '–'}
          </span>
        )}

        <span className="bkt-who">
          {editable ? (
            <>
              <input
                className="bkt-name-in"
                value={player.name}
                placeholder="Player"
                aria-label={`Player ${which} name`}
                autoComplete="off"
                onChange={(e) => handlers.onName?.(which, e.target.value)}
              />
              <SlotPicker
                compact
                value={player.slot}
                ariaLabel={`Slot picked by player ${which}`}
                onChange={(v) => handlers.onSlot?.(which, { name: v })}
                onPick={(slot) =>
                  slot && handlers.onSlot?.(which, {
                    name: slot.name,
                    provider: slot.provider,
                    img: slot.img,
                  })
                }
              />
            </>
          ) : (
            <>
              <b className="bkt-name">{player.name || 'TBD'}</b>
              <span className="bkt-slot">
                {player.slot || '—'}
                {player.slotProvider && <i>{player.slotProvider}</i>}
              </span>
            </>
          )}
        </span>

        {editable ? (
          <input
            className="bkt-mult-in"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0"
            aria-label={`Multiplier for player ${which}`}
            value={mult ?? ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              const n = Number(raw);
              handlers.onMult?.(which, raw === '' || !Number.isFinite(n) ? null : n);
            }}
          />
        ) : (
          <span className="bkt-mult">{mult === null ? '—' : `${formatMult(mult)}×`}</span>
        )}
      </div>
    );
  };

  return (
    <div className="bkt-card" data-decided={match.winner !== null} style={{ width: COL_W }}>
      {row(match.player1, match.mult1, 1)}
      <span className="bkt-rule" aria-hidden />
      {row(match.player2, match.mult2, 2)}

      <div className="bkt-foot" style={{ height: FOOTER_H }}>
        {winnerName ? (
          editable ? (
            <button type="button" className="bkt-foot-btn" data-reset onClick={handlers.onReset}>
              {winnerName} won · undo
            </button>
          ) : (
            <span className="bkt-foot-note" data-won>
              {winnerName} advances
            </span>
          )
        ) : canDecide ? (
          <button type="button" className="bkt-foot-btn" onClick={handlers.onDecide}>
            Decide winner
          </button>
        ) : (
          <span className="bkt-foot-note">
            {!ready ? 'Awaiting players' : editable ? 'Enter both multipliers' : 'Not played yet'}
          </span>
        )}
      </div>
    </div>
  );
}

/** Trims the trailing zeros a stored number carries, without rounding it. */
function formatMult(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/* ------------------------------------------------------------------ tree */

export interface BracketProps {
  matches: Match[];
  /** Turns every field into an input. The admin editor sets this. */
  editable?: boolean;
  onName?: (matchId: string, which: 1 | 2, value: string) => void;
  onSlot?: (
    matchId: string,
    which: 1 | 2,
    slot: { name: string; provider?: string; img?: string },
  ) => void;
  onMult?: (matchId: string, which: 1 | 2, value: number | null) => void;
  onDecide?: (matchId: string) => void;
  onReset?: (matchId: string) => void;
}

export function Bracket({
  matches,
  editable = false,
  onName,
  onSlot,
  onMult,
  onDecide,
  onReset,
}: BracketProps) {
  const rounds = roundsIn(matches);
  const champion = championOf(matches);

  if (!rounds) return null;

  return (
    <div className="bkt-scroll">
      <div className="bkt">
        <Wires rounds={rounds} />

        {Array.from({ length: rounds }, (_, r) => (
          <div className="bkt-col" key={r} style={{ width: COL_W, marginRight: COL_GAP }}>
            <p className="bkt-round" style={{ height: LABEL_H, lineHeight: `${LABEL_H}px` }}>
              {roundLabel(r, rounds)}
            </p>
            <div className="bkt-stack" style={{ paddingTop: padTop(r), gap: `${gapBetween(r)}px` }}>
              {matchesInRound(matches, r).map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  editable={editable}
                  handlers={{
                    onName: (which, value) => onName?.(match.id, which, value),
                    onSlot: (which, slot) => onSlot?.(match.id, which, slot),
                    onMult: (which, value) => onMult?.(match.id, which, value),
                    onDecide: () => onDecide?.(match.id),
                    onReset: () => onReset?.(match.id),
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="bkt-col" style={{ width: COL_W }}>
          <p className="bkt-round" style={{ height: LABEL_H, lineHeight: `${LABEL_H}px` }}>
            Winner
          </p>
          <div style={{ paddingTop: padTop(rounds - 1) + CARD_H / 2 - WIN_H / 2 }}>
            <div className="bkt-champ" data-has={champion !== null} style={{ height: WIN_H }}>
              {champion ? (
                <>
                  {champion.slot && <SlotThumb name={champion.slot} img={champion.slotImg} />}
                  <span className="bkt-champ-text">
                    <b>{champion.name}</b>
                    {champion.slot && <span>{champion.slot}</span>}
                  </span>
                </>
              ) : (
                <span className="bkt-champ-tbd">To be decided</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
