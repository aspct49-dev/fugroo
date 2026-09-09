'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Bracket } from './Bracket';
import {
  championOf,
  decideByMultiplier,
  decidedCount,
  resetMatch,
  setMultiplier,
  setPlayerField,
  setPlayerSlot,
  type Match,
} from '@/lib/bracket';
import type { Tournament } from '@/lib/tournaments';

/**
 * Running a bracket.
 *
 * The one client component in the admin panel, and it is one because a bracket
 * is edited continuously rather than submitted: a name typed into a semi-final
 * has to appear immediately, and every other panel here is a form post that
 * re-renders the page. Holding the `Match[]` in state and persisting behind it
 * is what keeps typing from feeling like it goes through a server.
 *
 * Saving is deliberately two-speed. A decision — advancing a winner, undoing
 * one — writes immediately, because that is the thing viewers are waiting on
 * and it happens once a match. Typing is debounced, because a name is a dozen
 * keystrokes and a dozen writes of the same bracket is pointless. Either way
 * the whole bracket goes back and the server rebuilds it from a fresh
 * skeleton, so a lost keystroke costs a character, never the structure.
 */

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 600;

export function AdminTournament({
  tournament,
  onSave,
}: {
  tournament: Tournament;
  onSave: (id: string, matches: Match[]) => Promise<void>;
}) {
  const [matches, setMatches] = useState<Match[]>(tournament.matches);
  const [save, setSave] = useState<SaveState>('idle');

  // Refs, not state: the debounce timer and the newest bracket have to be
  // readable from a callback that was created several renders ago.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Match[]>(tournament.matches);
  const persist = useRef(onSave);
  persist.current = onSave;

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setSave('saving');
    try {
      await persist.current(tournament.id, latest.current);
      setSave('saved');
    } catch {
      setSave('error');
    }
  }, [tournament.id]);

  const apply = useCallback(
    (next: Match[], immediate: boolean) => {
      setMatches(next);
      latest.current = next;
      if (timer.current) clearTimeout(timer.current);
      if (immediate) {
        void flush();
      } else {
        setSave('saving');
        timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
      }
    },
    [flush],
  );

  // A pending keystroke must not be lost by navigating away mid-debounce.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void persist.current(tournament.id, latest.current);
      }
    };
  }, [tournament.id]);

  const onName = (id: string, which: 1 | 2, value: string) =>
    apply(setPlayerField(latest.current, id, which, 'name', value), false);

  const onSlot = (
    id: string,
    which: 1 | 2,
    slot: { name: string; provider?: string; img?: string },
  ) => apply(setPlayerSlot(latest.current, id, which, slot), false);

  const onMult = (id: string, which: 1 | 2, value: number | null) =>
    apply(setMultiplier(latest.current, id, which, value), false);

  const onDecide = (id: string) => apply(decideByMultiplier(latest.current, id), true);

  const onReset = (id: string) => apply(resetMatch(latest.current, id), true);

  const decided = decidedCount(matches);
  const champion = championOf(matches);

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h2 className="h-section">{tournament.name}</h2>
        <div className="admin-actions">
          <span className="bkt-save" data-state={save}>
            {save === 'saving'
              ? 'Saving…'
              : save === 'saved'
                ? 'Saved'
                : save === 'error'
                  ? 'Not saved — retry'
                  : 'Up to date'}
          </span>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => void flush()}>
            Save now
          </button>
        </div>
      </div>

      <p className="admin-note">
        {decided} of {matches.length} matches decided
        {champion ? ` · won by ${champion.name}` : ''}
        {tournament.status === 'draft'
          ? ' · this bracket is a draft and is not on the public page yet'
          : ''}
      </p>

      <p className="admin-note">
        Enter both multipliers, then decide the match — the higher multiple advances. Undoing a
        result also clears every round it fed.
      </p>

      <Bracket
        matches={matches}
        editable
        onName={onName}
        onSlot={onSlot}
        onMult={onMult}
        onDecide={onDecide}
        onReset={onReset}
      />
    </div>
  );
}
