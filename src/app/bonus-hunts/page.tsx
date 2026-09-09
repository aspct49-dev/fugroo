import type { Metadata } from 'next';

import { PageBanner } from '@/components/PageBanner';
import { HuntBoard } from '@/components/HuntBoard';
import { formatMoney } from '@/lib/format';
import { activeHunt, huntStats, listHunts } from '@/lib/hunts';
import { PRIMARY_PARTNER } from '@/lib/partners';

// The board moves while a hunt is being opened on stream, so nothing here is
// cached — a stale bonus count is worse than a slow page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bonus hunts',
  description: `Live bonus hunt boards and results from ${PRIMARY_PARTNER.name}.`,
  alternates: { canonical: '/bonus-hunts' },
};

export default async function BonusHuntsPage() {
  const [current, all] = await Promise.all([activeHunt(), listHunts()]);
  const past = all.filter((h) => h.id !== current?.id && h.status === 'settled');

  return (
    <>
      <PageBanner title="Bonus hunts" />

      <section className="section wrap">
        {current ? (
          <HuntBoard hunt={current} />
        ) : (
          <div className="hunt-empty card">
            <h2 className="h-section">No hunt running</h2>
            <p className="lede" style={{ marginTop: 12 }}>
              When a hunt starts on stream the board appears here — every bonus as it goes in, the
              multiple it has to average to break even, and what it is actually running at.
            </p>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="section wrap">
          <div className="section-head">
            <h2 className="h-section">Past hunts</h2>
            <p>{past.length} settled</p>
          </div>

          <div className="hunt-history">
            {past.map((hunt) => {
              const s = huntStats(hunt);
              const up = s.profit >= 0;
              return (
                <article className="hunt-past" key={hunt.id} data-up={up}>
                  <div className="hunt-past-head">
                    <h3>{hunt.name}</h3>
                    <span className="hunt-past-date">
                      {new Date(hunt.settledAt ?? hunt.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="hunt-past-grid">
                    <div>
                      <span className="hunt-k">Start</span>
                      <b>{formatMoney(hunt.startBalance)}</b>
                    </div>
                    <div>
                      <span className="hunt-k">Bonuses</span>
                      <b>{s.count}</b>
                    </div>
                    <div>
                      <span className="hunt-k">Returned</span>
                      <b>{formatMoney(s.returned)}</b>
                    </div>
                    <div>
                      <span className="hunt-k">Result</span>
                      <b className="hunt-profit">
                        {up ? '+' : '−'}
                        {formatMoney(Math.abs(s.profit))}
                      </b>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
