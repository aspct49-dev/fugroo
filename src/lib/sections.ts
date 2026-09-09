import type { SectionCard } from './types';

/**
 * The destinations on the home page, in two ranks.
 *
 * Each card owns a hue, and that hue is its identity — it drives the label
 * bar, the bloom behind the art and the lit border, so someone finds Raffles
 * again by colour before they read the label. Five hues across five cards, all
 * reading as neon on navy: a system rather than a swatch book.
 *
 * The artwork is drawn in `CardArt`, keyed on the card's `id`, so nothing here
 * points at a file. `motion` is optional and layers over the drawing on hover
 * if a video or Rive file is ever supplied.
 */

/** The two wide cards under the hero. These are the standing offers. */
export const FEATURE_CARDS: SectionCard[] = [
  {
    id: 'bonuses',
    label: 'Bonus offers',
    href: '/bonuses',
    hue: 'var(--hue-cyan)',
    blurb: 'Every offer available on Roobet under the code.',
  },
  {
    id: 'milestones',
    label: 'Wager milestones',
    href: '/milestones',
    hue: 'var(--hue-violet)',
    blurb: 'We pay out every rank you climb. Claimed in the Discord.',
  },
];

/** The three below the leaderboard. These are the things that come and go. */
export const SECTION_CARDS: SectionCard[] = [
  {
    id: 'tournaments',
    label: 'Tournaments',
    href: '/tournaments',
    hue: 'var(--hue-amber)',
    blurb: 'Head-to-head events run on stream.',
  },
  {
    id: 'guess-the-balance',
    label: 'Guess the balance',
    href: '/guess-the-balance',
    hue: 'var(--hue-blue)',
    blurb: 'Call the final balance. Closest guess takes it.',
  },
  {
    id: 'raffles',
    label: 'Raffles',
    href: '/raffles',
    hue: 'var(--hue-teal)',
    blurb: 'Draws for everyone playing under the code.',
  },
];

/** Everything with a card, for the pages that need to look one up. */
export const ALL_CARDS: SectionCard[] = [...FEATURE_CARDS, ...SECTION_CARDS];

export function getSection(id: string): SectionCard | undefined {
  return ALL_CARDS.find((s) => s.id === id);
}
