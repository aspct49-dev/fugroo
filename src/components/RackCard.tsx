'use client';

import { useRef } from 'react';
import Link from 'next/link';

import type { SectionCard } from '@/lib/types';
import { CardArt } from './CardArt';

/**
 * One card on the rack: a link, a hue, and an object floating in that hue's
 * light.
 *
 * Two layers of motion, and they are deliberately separate elements:
 *
 *   .rack-art-wrap  the ambient bob, running always
 *   .rack-art       the pop on hover
 *
 * One element cannot carry both. An `animation` and a hover `transform` fight
 * over the same property, and swapping one for the other on hover makes the
 * object jump to wherever the bob happened to be. Splitting them lets the pop
 * ride on top of the drift and unwind cleanly when the pointer leaves.
 *
 * The burst fires from behind the object at the moment it pops, then clears
 * itself. The media slot stays dumb: it renders the still, and a `motion` file
 * layers above it — swapping in Rive or a video is a change here and nowhere
 * else.
 */

/**
 * [x, y, size, spin deg, delay ms] — where each particle ends up, measured
 * from the centre of the card.
 *
 * x, y and size are in `cqw`: a share of the card's own width. The artwork
 * fills most of the card, so a particle has to clear its silhouette to be seen
 * at all, and a fixed pixel throw that cleared it on a wide card disappeared
 * entirely on a narrow one. Half the card is 50cqw across and 40cqw tall at
 * 5:4, so nothing here throws further than 44 by 26.
 *
 * Fixed rather than random: the server and the client have to render the same
 * thing or React reports a hydration mismatch.
 */
const BURST: [number, number, number, number, number][] = [
  [-43, -19, 5, -140, 0],
  [41, -22, 5.8, 160, 30],
  [-47, 6, 4.2, 95, 60],
  [46, 9, 4.8, -110, 20],
  [-26, -27, 3.6, 60, 80],
  [28, -28, 4.4, -70, 50],
  [-34, 24, 3.9, 130, 95],
  [37, 23, 5, -150, 70],
  [-5, -31, 3.3, 40, 110],
  [8, 29, 3.6, -40, 100],
];

export function RackCard({ card, beat = 1 }: { card: SectionCard; beat?: number }) {
  const motion = useRef<HTMLVideoElement>(null);

  /**
   * A <video> without `autoplay` has to be told to start, and telling it here
   * rather than autoplaying is the point: nothing is fetched or decoded until
   * a pointer is actually over the card. play() rejects if the element is torn
   * down mid-gesture, which is not an error worth surfacing.
   */
  function run(on: boolean) {
    const el = motion.current;
    if (!el) return;
    if (on) {
      void el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }

  return (
    <Link
      className="rack-card"
      href={card.href}
      style={{ ['--hue' as string]: card.hue, ['--beat' as string]: `${beat}` }}
      onMouseEnter={() => run(true)}
      onMouseLeave={() => run(false)}
      onFocus={() => run(true)}
      onBlur={() => run(false)}
    >
      <span className="rack-bloom" aria-hidden />

      {/* Behind the object, so the particles read as thrown out from under it
          rather than sprayed over the top. */}
      <span className="rack-burst" aria-hidden>
        {BURST.map(([x, y, size, spin, delay], i) => (
          <span
            key={`p-${i}`}
            className="rack-particle"
            style={{
              ['--x' as string]: `${x}cqw`,
              ['--y' as string]: `${y}cqw`,
              ['--r' as string]: `${spin}deg`,
              width: `${size}cqw`,
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </span>

      <span className="rack-label">{card.label}</span>

      <span className="rack-media">
        <span className="rack-art-wrap">
          <span className="rack-art">
            <CardArt id={card.id} />
          </span>
        </span>

        {card.motion && (
          <video
            ref={motion}
            className="rack-motion"
            src={card.motion}
            preload="none"
            muted
            loop
            playsInline
            aria-hidden
          />
        )}
      </span>

      {/* One band of light, crossing on hover. Drawn last so it passes over
          everything, including the artwork. */}
      <span className="rack-sheen" aria-hidden />
    </Link>
  );
}
