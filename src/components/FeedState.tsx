'use client';

import { useEffect, useState } from 'react';

/**
 * When the standings were last pulled from the operator.
 *
 * A board with nobody on it looks identical whether the feed is healthy and
 * the month is genuinely quiet, or the call is failing and we are showing an
 * empty shell. This is the line that tells the two apart, so it renders in
 * both cases rather than only when something is wrong.
 *
 * Client-side because the age is relative to the *visitor's* clock, and a
 * server-rendered "2 minutes ago" is wrong the moment the page is cached. It
 * renders the state without an age until mounted, which is the part that is
 * true regardless of whose clock you ask.
 */
export function FeedState({ at, live }: { at: string; live: boolean }) {
  const [age, setAge] = useState<string | null>(null);

  useEffect(() => {
    const pulled = new Date(at).getTime();
    const tick = () => {
      const secs = Math.max(0, Math.round((Date.now() - pulled) / 1000));
      if (secs < 60) setAge('just now');
      else if (secs < 3600) setAge(`${Math.floor(secs / 60)} min ago`);
      else if (secs < 86_400) setAge(`${Math.floor(secs / 3600)} hr ago`);
      else setAge(`${Math.floor(secs / 86_400)} d ago`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [at]);

  return (
    <p className="feed-state" data-live={live || undefined}>
      <span className="feed-dot" aria-hidden />
      {live ? 'Live from Roobet' : 'Feed unavailable'}
      {age && live && <span className="feed-age">updated {age}</span>}
    </p>
  );
}
