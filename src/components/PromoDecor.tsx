/**
 * The drift inside the leaderboard plate: diamonds tumbling slowly at the
 * edges, and sparkles catching the light between them.
 *
 * Everything is kept off the copy column. The prize figure and the pairing
 * line own the left third; a coin drifting behind either of them stops being
 * decoration and starts being a smudge. What is left — the top and bottom
 * strips, the gutter, and the plate behind the podium — is where these sit.
 *
 * Fixed placements rather than random ones: the server and the client have to
 * render the same layout or React reports a hydration mismatch.
 */

/** [top %, left %, size px, tumble seconds, delay seconds, opacity] */
type Gem = [number, number, number, number, number, number];

// The source art is 44px wide, so nothing here is drawn larger than that.
const GEMS: Gem[] = [
  [4, 32, 40, 26, 0, 0.9],
  [82, 5, 26, 21, 3.5, 0.7],
  [15, 46, 22, 24, 1.8, 0.6],
  [82, 52, 34, 29, 5.2, 0.65],
  [6, 92, 32, 23, 2.6, 0.85],
  [45, 40, 18, 27, 4.4, 0.5],
  [66, 68, 20, 25, 6.1, 0.45],
];

/** [top %, left %, size px, twinkle seconds, delay seconds] */
type Spark = [number, number, number, number, number];

const SPARKS: Spark[] = [
  [9, 25, 15, 3.4, 0],
  [72, 36, 11, 4.2, 1.1],
  [27, 43, 13, 3.8, 2.2],
  [91, 22, 10, 4.6, 0.6],
  [11, 60, 12, 3.2, 1.7],
  [48, 96, 15, 4, 0.4],
  [90, 79, 11, 3.6, 2.8],
  [34, 88, 9, 4.4, 3.3],
];

export function PromoDecor() {
  return (
    <div className="promo-decor" aria-hidden>
      {GEMS.map(([top, left, size, spin, delay, opacity], i) => (
        <span
          key={`gem-${i}`}
          className="promo-gem"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}px`,
            opacity,
            animationDuration: `${spin}s`,
            animationDelay: `${delay}s`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative sprite */}
          <img src="/diamond.webp" alt="" loading="lazy" decoding="async" />
        </span>
      ))}

      {SPARKS.map(([top, left, size, dur, delay], i) => (
        <svg
          key={`spark-${i}`}
          className="promo-spark"
          viewBox="0 0 24 24"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}px`,
            animationDuration: `${dur}s`,
            animationDelay: `${delay}s`,
          }}
        >
          {/* A four-point star with concave sides — the shape a highlight makes,
              rather than the five-point star of a rating widget. */}
          <path d="M12 0c.6 6.4 5 10.8 12 12-7 1.2-11.4 5.6-12 12-.6-6.4-5-10.8-12-12C7 10.8 11.4 6.4 12 0z" />
        </svg>
      ))}
    </div>
  );
}
