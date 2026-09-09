import Link from 'next/link';

import { formatMoney } from '@/lib/format';
import { SITE } from '@/lib/site';
import type { Leaderboard } from '@/lib/types';
import { Podium } from './Podium';
import { PromoDecor } from './PromoDecor';

/**
 * The leaderboard advert.
 *
 * The plate, both blooms and the hex wash are CSS, and so is the podium inside
 * it, so the prize figure and the three names stay live text rather than baked
 * into a banner.
 *
 * The top three come from the same board the leaderboard page renders, so the
 * two can never disagree.
 */
export function Promo({ board }: { board: Leaderboard }) {
  return (
    <section className="section wrap">
      <div className="promo">
        <PromoDecor />

        <div className="promo-inner">
          <div className="promo-copy">
            {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
            <img className="promo-mark" src="/wordmark.webp" alt={SITE.name} />

            <p className="promo-label">Total prizes</p>
            <span className="promo-pot">{formatMoney(board.prizePool)}</span>

            <Link className="btn btn-primary" href="/leaderboard">
              View leaderboard
            </Link>
          </div>

          <Podium board={board} />
        </div>
      </div>
    </section>
  );
}
