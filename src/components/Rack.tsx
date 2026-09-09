import { SECTION_CARDS } from '@/lib/sections';
import type { SectionCard } from '@/lib/types';
import { RackCard } from './RackCard';

/**
 * A rank of destination cards. One hue and one object apiece.
 *
 * `wide` swaps the grid for the two-across row under the hero, where each card
 * is a standing offer rather than one of several things running this month.
 * The label states where the card goes, so the hue and the artwork do
 * recognition rather than carry meaning on their own — nothing here is
 * reachable only by noticing a colour.
 */
export function Rack({
  cards = SECTION_CARDS,
  wide = false,
}: {
  cards?: SectionCard[];
  wide?: boolean;
}) {
  return (
    <div className="rack" data-wide={wide}>
      {cards.map((card, i) => (
        /* Each card's ambient cycle runs a little slower than the last, so a
           row of them drifts out of phase instead of pulsing in lockstep. */
        <RackCard key={card.id} card={card} beat={1 + i * 0.17} />
      ))}
    </div>
  );
}
