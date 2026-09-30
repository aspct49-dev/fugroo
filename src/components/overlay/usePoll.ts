'use client';

import { useEffect, useRef, useState } from 'react';

import { OVERLAY_POLL_MS } from '@/lib/overlay.shared';

/**
 * Polls an overlay endpoint and keeps the last good answer.
 *
 * A failed poll leaves the state alone rather than clearing it. On stream, a
 * card that blinks out for a second because the site hiccupped looks broken
 * in a way a card that is a second stale never does.
 *
 * Also returns the gap between the server's clock and this machine's, taken
 * from the `now` every reply carries. The raffle reel times itself against the
 * moment the draw was made, which is a server timestamp, and a streaming PC
 * whose clock is a few seconds out would otherwise land the reel early or late.
 *
 * `paused` stops the network entirely — demo mode feeds itself.
 */
export function usePoll<T extends { now: number }>(
  url: string,
  paused = false,
): { data: T | null; skew: number } {
  const [data, setData] = useState<T | null>(null);
  const skew = useRef(0);

  useEffect(() => {
    if (paused) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const next = (await res.json()) as T;
          if (!alive) return;
          skew.current = next.now - Date.now();
          setData(next);
        }
      } catch {
        // Keep what we had. See above.
      }
      if (alive) timer = setTimeout(tick, OVERLAY_POLL_MS);
    };

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [url, paused]);

  return { data, skew: skew.current };
}
