import type { Metadata } from 'next';

import { PRIMARY_PARTNER } from '@/lib/partners';
import { SITE, pageMeta } from '@/lib/site';

export const metadata: Metadata = pageMeta({
  title: 'Legal',
  description: `Terms, responsible gambling resources and the relationship between ${SITE.name} and ${PRIMARY_PARTNER.name}.`,
  path: '/legal',
});

export default function LegalPage() {
  return (
    <section className="section wrap">
      <h1 className="h-page">Legal</h1>

      <div className="prose" style={{ marginTop: 26 }}>
        <h2>What this site is</h2>
        <p>
          {SITE.name} is a community leaderboard run by a streamer. It is not a casino, it does not
          take deposits or bets, and it is not operated by or affiliated with {PRIMARY_PARTNER.name}{' '}
          beyond an affiliate arrangement.
        </p>

        <h2>Eligibility</h2>
        <p>
          You must be 18 or over, or the legal gambling age where you live, whichever is higher. You
          must be able to hold a {PRIMARY_PARTNER.name} account under their own terms — their
          restrictions apply, not ours.
        </p>

        <h2>Standings and prizes</h2>
        <p>
          Standings come from {PRIMARY_PARTNER.name}&rsquo;s affiliate reporting and are cached for
          up to a minute. Their figures are final. Staff accounts are excluded from the board and
          from its totals. Prizes are paid after the month closes and the figures settle.
        </p>

        <h2>Responsible gambling</h2>
        <p>
          Gambling carries real financial risk and nothing on this site should be read as suggesting
          otherwise. If it stops being entertainment, stop. Support is available at{' '}
          <a href="https://www.begambleaware.org" target="_blank" rel="noreferrer">
            BeGambleAware
          </a>
          .
        </p>
      </div>
    </section>
  );
}
