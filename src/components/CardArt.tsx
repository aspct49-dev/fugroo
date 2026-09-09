/**
 * The card artwork, drawn rather than loaded.
 *
 * Inline SVG on a 200×200 grid, built to the recipe the reference set uses:
 *
 *   · the object body is neutral steel with a smooth gradient, not the hue
 *   · the hue is carried by the accents and by faceted gems orbiting it
 *   · no outlines at all — form comes from the gradient and from the facets
 *   · a soft elliptical shadow pools under the object so it sits on something
 *   · four-point glints scattered around, one on each gem
 *
 * Two earlier passes drew these flat-cel with heavy black outlines, matching
 * the hero props. That is right for a sticker lying on artwork and wrong for
 * an object meant to float in its own light: the outline flattened everything
 * it enclosed, and flat fills gave the shapes no volume. Volume is most of
 * what makes the reference read as well as it does.
 *
 * Drawing them is what makes them move. A flat PNG can only be scaled and spun
 * as one lump; here the arrow, the lid, the blades and the gems are each their
 * own node, so the animation is the thing the card is *about* — an arrow that
 * actually strikes the target. It also costs a few KB a card against ~90KB of
 * WebP, and stays sharp at any size.
 *
 * Gradient ids are suffixed per card. Duplicate ids across several inline SVGs
 * in one document all resolve to the first match, so without the suffix every
 * card would be painted in the first card's hue.
 */

/* ------------------------------------------------------------------ parts */

/** The shading ramps. Steel for bodies, the hue for gems and accents. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0.25" y2="1">
        <stop offset="0" stopColor="var(--a-lift)" />
        <stop offset="0.55" stopColor="var(--a-mid)" />
        <stop offset="1" stopColor="var(--a-lo)" />
      </linearGradient>
      <linearGradient id={`${id}-steel-dim`} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="var(--a-mid)" />
        <stop offset="1" stopColor="var(--a-edge)" />
      </linearGradient>
      <linearGradient id={`${id}-accent`} x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0" stopColor="var(--gem-lift)" />
        <stop offset="0.55" stopColor="var(--hue)" />
        <stop offset="1" stopColor="var(--gem-lo)" />
      </linearGradient>
      <linearGradient id={`${id}-pale`} x1="0" y1="0" x2="0.2" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.5" stopColor="#dbe6f5" />
        <stop offset="1" stopColor="#9daec9" />
      </linearGradient>

      {/* The pool of light the object floats in. */}
      <radialGradient id={`${id}-glow`}>
        <stop offset="0" stopColor="var(--hue)" stopOpacity="0.4" />
        <stop offset="1" stopColor="var(--hue)" stopOpacity="0" />
      </radialGradient>
      {/* The shadow it casts. */}
      <radialGradient id={`${id}-cast`}>
        <stop offset="0" stopColor="#01030c" stopOpacity="0.7" />
        <stop offset="1" stopColor="#01030c" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/**
 * `w` is the canvas width. The square cards use 200; the two wide ones use 300,
 * so their composition can spread across a 16:9 card instead of sitting in a
 * square well with dead space either side of it.
 */
function Frame({
  id,
  children,
  className,
  w = 200,
}: {
  id: string;
  children: React.ReactNode;
  className: string;
  w?: number;
}) {
  const cx = w / 2;
  return (
    <svg
      className={`art ${className}`}
      viewBox={`0 0 ${w} 200`}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <Defs id={id} />
      <ellipse cx={cx} cy="112" rx={w * 0.47} ry="82" fill={`url(#${id}-glow)`} />
      <ellipse cx={cx} cy="170" rx="62" ry="15" fill={`url(#${id}-cast)`} />
      {children}
    </svg>
  );
}

/**
 * A brilliant-cut gem: a table across the top, two crown facets either side,
 * and two pavilion facets running to the point. Five flat planes is enough to
 * read as cut stone, and each one takes a different step of the ramp.
 */
function Gem({
  id,
  x,
  y,
  s = 40,
  r = 0,
  tone = 'hue',
  className,
}: {
  id: string;
  x: number;
  y: number;
  s?: number;
  r?: number;
  tone?: 'hue' | 'pale' | 'gold' | 'bronze';
  className?: string;
}) {
  const fill =
    tone === 'pale' ? `url(#${id}-pale)` : tone === 'gold' ? '#f6c247' : tone === 'bronze' ? '#d79a6a' : `url(#${id}-accent)`;

  /*
   * Two nested groups, and the split matters: a CSS animation's `transform`
   * replaces the element's own transform outright rather than composing with
   * it. Put both on one node and every animated gem loses its placement and
   * snaps to the top-left of the viewBox. The outer group holds the position;
   * the inner one is what animates.
   */
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s / 40})`}>
      <g className={className}>
      <path d="M-20-10 -9-18 9-18 20-10 0 22Z" fill={fill} />
      {/* Table, catching the most light. */}
      <path d="M-9-18 9-18 14-10-14-10Z" fill="#fff" fillOpacity="0.42" />
      {/* Left crown and left pavilion, a step brighter than the right. */}
      <path d="M-20-10-9-18-14-10Z" fill="#fff" fillOpacity="0.2" />
      <path d="M-14-10 0 22 0-10Z" fill="#fff" fillOpacity="0.12" />
      {/* Right side turned away. */}
      <path d="M9-18 20-10 14-10Z" fill="#01030c" fillOpacity="0.22" />
      <path d="M14-10 0 22 0-10Z" fill="#01030c" fillOpacity="0.3" />
      {/* The glint every one of them carries. */}
      <path
        transform="translate(-7 -12) scale(0.55)"
        d="M0-11c.5 5.6 3 8.3 11 11-8 2.7-10.5 5.4-11 11-.5-5.6-3-8.3-11-11 8-2.7 10.5-5.4 11-11Z"
        fill="#fff"
      />
      </g>
    </g>
  );
}

/**
 * One gem size and one placement for every card, so a row of them reads as a
 * set. The pair sits on opposite diagonals, out in the open either side of the
 * object; the glints fill the two corners the gems leave empty.
 *
 * The coordinates run outside the viewBox on purpose. `.art` is
 * `overflow: visible`, so the drawing is not clipped by its own box — only by
 * the card — and the object is sized to fill that box. Anything placed inside
 * it therefore lands against the object, which is what the gems used to do.
 * Pushing them past the edge is what puts them in the empty part of the card.
 *
 * How far past is set by the hover state, not by taste. Three things compound
 * there: `.rack-art` scales 1.16, each gem pops on top of that, and the pop
 * also lifts the gem. A gem at 12% of the card width from the edge ends up
 * outside it, which is what the first pass did — the spread looked right at
 * rest and sliced two gems in half the moment anyone pointed at the card.
 * These sit at about 15%, the furthest out that survives all three.
 */
const GEM = 38;
const PAIR: [number, number][] = [
  [2, 24],
  [198, 176],
];
const SPARKS: [number, number, number][] = [
  [172, 14, 9],
  [24, 168, 8],
  [116, 216, 7],
];

/** Four-point glints, the shape a highlight makes. */
function Sparks({ pts }: { pts: [number, number, number][] }) {
  return (
    <g className="art-sparks" fill="#fff">
      {pts.map(([x, y, s], i) => (
        <path
          key={i}
          transform={`translate(${x} ${y}) scale(${s / 10})`}
          d="M0-10c.5 5.1 2.7 7.6 10 10-7.3 2.4-9.5 4.9-10 10-.5-5.1-2.7-7.6-10-10 7.3-2.4 9.5-4.9 10-10Z"
          opacity="0.9"
        />
      ))}
    </g>
  );
}

/** The brand, set on the face of an object. */
function Mark({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="var(--font-display)"
      fontWeight="800"
      fontSize={size}
      letterSpacing={size * 0.04}
      fill="#fff"
      fillOpacity="0.92"
    >
      FUGROO
    </text>
  );
}

/* ----------------------------------------------------------- bonus offers */

/** A wrapped box whose lid lifts, with gems drifting around it. */
function GiftArt() {
  const id = 'bo';
  return (
    <Frame id={id} className="art-gift" w={300}>
      <Gem id={id} className="art-orb art-orb-1" x={26} y={32} s={GEM} r={-18} />
      <Gem id={id} className="art-orb art-orb-2" x={274} y={32} s={GEM} r={18} />
      <Gem id={id} className="art-orb art-orb-3" x={26} y={170} s={GEM} r={14} />
      <Gem id={id} className="art-orb art-orb-4" x={274} y={170} s={GEM} r={-14} />
      <Sparks pts={[[150, 10, 9], [8, 104, 8], [292, 104, 8], [150, 194, 8]]} />

      <g transform="translate(50 0)">
      <g className="art-bow">
        <path d="M100 62c-16-14-34-16-38-6-4 9 12 14 38 6Z" fill={`url(#${id}-accent)`} />
        <path d="M100 62c16-14 34-16 38-6 4 9-12 14-38 6Z" fill={`url(#${id}-accent)`} />
        <path d="M100 62c16-14 34-16 38-6 1 3-1 5-4 7-8-4-21-3-34-1Z" fill="#01030c" fillOpacity="0.2" />
        <rect x="92" y="54" width="16" height="16" rx="5" fill={`url(#${id}-accent)`} />
        <rect x="92" y="54" width="16" height="7" rx="3.5" fill="#fff" fillOpacity="0.3" />
      </g>

      <g className="art-lid-flat">
        <rect x="40" y="70" width="120" height="30" rx="8" fill={`url(#${id}-steel)`} />
        <rect x="40" y="78" width="120" height="12" fill={`url(#${id}-accent)`} />
        <rect x="40" y="70" width="120" height="6" rx="3" fill="#fff" fillOpacity="0.18" />
      </g>

      <g className="art-box">
        <path d="M52 100h96v58a6 6 0 0 1-6 6H58a6 6 0 0 1-6-6Z" fill={`url(#${id}-steel)`} />
        <path d="M52 100h96v9H52Z" fill="#01030c" fillOpacity="0.22" />
        <path d="M132 100h16v64h-10a6 6 0 0 0 6-6Z" fill="#01030c" fillOpacity="0.16" />
        <Mark x={100} y={140} size={22} />
      </g>
      </g>
    </Frame>
  );
}

/* --------------------------------------------------------- wager milestones */

/** Five stones climbing left to right, each lighting in turn. */
function TiersArt() {
  const id = 'wm';
  const rung = [
    { x: 30, y: 152, s: 42, tone: 'bronze' as const },
    { x: 90, y: 134, s: 48, tone: 'pale' as const },
    { x: 150, y: 114, s: 54, tone: 'gold' as const },
    { x: 210, y: 92, s: 60, tone: 'hue' as const },
    { x: 270, y: 70, s: 66, tone: 'pale' as const },
  ];
  return (
    <Frame id={id} className="art-tiers" w={300}>
      <Sparks pts={[[62, 88, 9], [128, 64, 8], [196, 170, 9], [20, 104, 7], [288, 152, 7], [242, 40, 8]]} />
      {rung.map((g, i) => (
        <Gem key={i} id={id} className={`art-tier art-tier-${i + 1}`} {...g} />
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------ tournaments */

/** Two blades that scissor apart and clash back together. */
function SwordsArt() {
  const id = 'tn';
  const blade = (
    <>
      <path d="M100 18 112 50v66H88V50Z" fill={`url(#${id}-pale)`} />
      <path d="M100 18 112 50v66h-12Z" fill="#01030c" fillOpacity="0.26" />
      <path d="M94 40 91 54v58h5V54Z" fill="#fff" fillOpacity="0.55" />
      <rect x="68" y="114" width="64" height="15" rx="5" fill={`url(#${id}-accent)`} />
      <rect x="68" y="114" width="64" height="6" rx="3" fill="#fff" fillOpacity="0.3" />
      <rect x="92" y="129" width="16" height="28" rx="4" fill={`url(#${id}-steel-dim)`} />
      <circle cx="100" cy="163" r="11" fill={`url(#${id}-accent)`} />
      <circle cx="97" cy="160" r="4" fill="#fff" fillOpacity="0.45" />
    </>
  );

  return (
    <Frame id={id} className="art-swords">
      <Gem id={id} className="art-orb art-orb-1" x={PAIR[0][0]} y={PAIR[0][1]} s={GEM} r={-18} />
      <Gem id={id} className="art-orb art-orb-2" x={PAIR[1][0]} y={PAIR[1][1]} s={GEM} r={18} />
      <Sparks pts={SPARKS} />

      <g className="art-blade art-blade-l">{blade}</g>
      <g className="art-blade art-blade-r">{blade}</g>

      <g className="art-clash">
        <path
          d="M100 62c1.2 12 6.4 19 24 24-17.6 5-22.8 12-24 24-1.2-12-6.4-19-24-24 17.6-5 22.8-12 24-24Z"
          fill="#fff"
        />
      </g>
    </Frame>
  );
}

/* ------------------------------------------------------------ bonus hunts */

/** A target on a stand, and an arrow that flies in and strikes the centre. */
function TargetArt() {
  const id = 'bh';
  return (
    <Frame id={id} className="art-target">
      <Gem id={id} className="art-orb art-orb-1" x={PAIR[0][0]} y={PAIR[0][1]} s={GEM} r={-18} />
      <Gem id={id} className="art-orb art-orb-2" x={PAIR[1][0]} y={PAIR[1][1]} s={GEM} r={18} />
      <Sparks pts={SPARKS} />

      <g className="art-stand" stroke="var(--a-edge)" strokeWidth="9" strokeLinecap="round">
        <path d="M84 138 70 178" />
        <path d="M116 138 130 178" />
      </g>

      <g className="art-rings">
        {/* Offset behind, giving the disc thickness. */}
        <ellipse cx="103" cy="100" rx="58" ry="56" fill={`url(#${id}-steel-dim)`} />
        <ellipse cx="100" cy="96" rx="58" ry="56" fill={`url(#${id}-accent)`} />
        <ellipse cx="100" cy="96" rx="43" ry="41" fill={`url(#${id}-pale)`} />
        <ellipse cx="100" cy="96" rx="28" ry="27" fill={`url(#${id}-accent)`} />
        <ellipse cx="100" cy="96" rx="13" ry="12" fill={`url(#${id}-pale)`} />
        <path
          d="M64 70a48 46 0 0 1 26-19l5 11a37 35 0 0 0-21 15Z"
          fill="#fff"
          fillOpacity="0.3"
        />
      </g>

      <circle className="art-ripple" cx="100" cy="96" r="18" stroke="#fff" strokeWidth="5" />

      <g className="art-arrow">
        <path d="M104 92 182 14" stroke="var(--a-edge)" strokeWidth="11" strokeLinecap="round" />
        <path d="M104 92 182 14" stroke="url(#bh-pale)" strokeWidth="5" strokeLinecap="round" />
        <path d="M88 106 122 90 110 70Z" fill={`url(#${id}-accent)`} />
        <path d="M110 70 122 90 105 87Z" fill="#01030c" fillOpacity="0.22" />
        <path d="M152 14h30v30Z" fill={`url(#${id}-accent)`} />
      </g>
    </Frame>
  );
}

/* ----------------------------------------------------------------- raffles */

/** A torn-off ticket, rocking on its perforation. */
function TicketArt() {
  const id = 'gv';
  return (
    <Frame id={id} className="art-ticket">
      {/* Clear of the ticket's own footprint — the first pass put them behind
          it, where a 148×84 card covers everything. */}
      <Gem id={id} className="art-orb art-orb-1" x={PAIR[0][0]} y={PAIR[0][1]} s={GEM} r={-18} />
      <Gem id={id} className="art-orb art-orb-2" x={PAIR[1][0]} y={PAIR[1][1]} s={GEM} r={18} />
      <Sparks pts={SPARKS} />

      {/*
       * The notches are cut with a mask rather than by painting two circles in
       * the card's colour over the edge — the card behind is a gradient, so a
       * matched pair of dots would only line up at one point on it.
       */}
      <mask id={`${id}-notch`}>
        <rect x="0" y="0" width="200" height="200" fill="#fff" />
        <circle cx="78" cy="70" r="9.5" fill="#000" />
        <circle cx="78" cy="142" r="9.5" fill="#000" />
      </mask>

      <g transform="rotate(-7 100 106)" mask={`url(#${id}-notch)`}>
        <g className="art-stub">
          <path d="M46 70h32v72H46a10 10 0 0 1-10-10V80a10 10 0 0 1 10-10Z" fill={`url(#${id}-accent)`} />
          <path d="M46 70h32v9H36a10 10 0 0 1 10-9Z" fill="#fff" fillOpacity="0.28" />
          <path d="M36 128h42v14H46a10 10 0 0 1-10-10Z" fill="#01030c" fillOpacity="0.16" />
        </g>

        <g className="art-card">
          <path d="M78 70h76a10 10 0 0 1 10 10v52a10 10 0 0 1-10 10H78Z" fill={`url(#${id}-steel)`} />
          <path d="M78 70h76a10 10 0 0 1 10 10v5H78Z" fill="#fff" fillOpacity="0.16" />
          <path d="M78 128h86v4a10 10 0 0 1-10 10H78Z" fill="#01030c" fillOpacity="0.2" />
          <Mark x={121} y={110} size={21} />
          <g stroke="#fff" strokeOpacity="0.34" strokeWidth="4.5" strokeLinecap="round">
            <path d="M92 124h14M114 124h14M136 124h14M158 124h4" />
          </g>
        </g>

        {/* The line it tears along. */}
        <g stroke="var(--a-edge)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="6 8">
          <path d="M78 81v50" />
        </g>
      </g>
    </Frame>
  );
}

const ART: Record<string, () => React.JSX.Element> = {
  bonuses: GiftArt,
  milestones: TiersArt,
  tournaments: SwordsArt,
  'guess-the-balance': TargetArt,
  raffles: TicketArt,
};

export function CardArt({ id }: { id: string }) {
  const Art = ART[id];
  return Art ? <Art /> : null;
}

/* ------------------------------------------------------------------ banner */

/**
 * A wide field of drifting gems, for the head of a page rather than a card.
 *
 * Same construction as the rack art — it just has no subject in the middle,
 * because on a banner the subject is the heading sitting on top of it.
 */
const BANNER: [number, number, number, number][] = [
  [60, 42, 46, -18],
  [180, 28, 34, 22],
  [318, 54, 40, -12],
  [452, 34, 30, 16],
  [576, 46, 44, -20],
  [118, 132, 36, 14],
  [262, 148, 30, -16],
  [396, 136, 38, 20],
  [530, 150, 32, -14],
];

export function GemBanner() {
  const id = 'bn';
  return (
    <svg
      className="art gem-banner"
      viewBox="0 0 640 190"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      <Defs id={id} />
      {BANNER.map(([x, y, s, r], i) => (
        <Gem
          key={i}
          id={id}
          className={`art-orb art-orb-${(i % 4) + 1}`}
          x={x}
          y={y}
          s={s}
          r={r}
        />
      ))}
      <Sparks
        pts={[
          [122, 84, 9],
          [246, 40, 8],
          [364, 108, 9],
          [498, 96, 8],
          [604, 40, 7],
          [24, 120, 7],
        ]}
      />
    </svg>
  );
}
