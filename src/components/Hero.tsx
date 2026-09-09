/**
 * The vault, in four depth planes:
 *
 *   1. the room, drifting
 *   2. the mascot under his wordmark, lit from the seams in the walls
 *   3. the aces, turning past him on both sides
 *   4. the rail, cropping him at the chest and closing the frame
 *
 * It owns the whole first screen and runs to the divider. Nothing is written
 * over it and nothing is stacked under it: the scene is the message, and the
 * places to act are the sidebar, the rack immediately below, and the
 * leaderboard itself.
 *
 * Everything arrives in one orchestrated load sequence and then holds still
 * apart from the ambient drift. The rest of the page has no scroll reveals at
 * all — one staged moment reads as deliberate where a dozen read as a
 * template.
 */

/** [side, top %, width, float seconds, delay seconds] */
type Ace = ['left' | 'right', number, string, number, number];

// Fixed placements rather than random ones: the server and the client must
// render the same layout or React reports a hydration mismatch.
//
// The same ace on both sides, the right one mirrored and given its own size,
// drift and phase, so the pair reads as two cards rather than as one card and
// its reflection.
const ACES: Ace[] = [
  ['left', 22, 'clamp(76px, 8.4vw, 138px)', 7.5, 0],
  ['right', 36, 'clamp(64px, 7vw, 116px)', 9.2, 1.6],
];

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-vault" aria-hidden />
      <div className="hero-vault-shade" aria-hidden />

      <div className="hero-stage">
        <div className="hero-props" aria-hidden>
          {ACES.map(([side, top, width, dur, delay]) => (
            <span
              key={side}
              className="prop"
              data-side={side}
              style={{
                top: `${top}%`,
                ['--w' as string]: width,
                ['--dur' as string]: `${dur}s`,
                ['--delay' as string]: `${delay}s`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative sprite */}
              <img src="/prop-ace.webp" alt="" />
            </span>
          ))}
        </div>

        {/* The wordmark is artwork, so the h1 wraps it and the name lives in
            the alt text — the page keeps a real heading either way. */}
        <h1 className="hero-mark">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
          <img src="/wordmark.webp" alt="Fugroo" />
        </h1>

        <div className="hero-mascot" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative scene art */}
          <img src="/mascot.webp" alt="" />
        </div>
      </div>

      {/* The horizon: it laps up over his chest, so he stands behind it. */}
      <div className="hero-rail" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative scene art */}
        <img src="/hero-rail.webp" alt="" />
      </div>

    </section>
  );
}
