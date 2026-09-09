import type { Metadata } from 'next';
import Link from 'next/link';

import { CopyCode } from '@/components/CopyCode';
import { PageBanner } from '@/components/PageBanner';
import { Promo } from '@/components/Promo';
import { ExternalIcon, TagIcon, TrophyIcon, UserPlusIcon } from '@/components/icons';
import { JOIN_STEPS, OFFERS, PRIMARY_PARTNER } from '@/lib/partners';
import { getLeaderboard } from '@/lib/services/leaderboard';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Bonus offers',
  description: `Every offer available on ${PRIMARY_PARTNER.name} under code ${PRIMARY_PARTNER.code}, and the three steps to claim them.`,
  alternates: { canonical: '/bonuses' },
};

const STEP_ICON = [UserPlusIcon, TagIcon, TrophyIcon];

export default async function BonusesPage() {
  const board = await getLeaderboard('roobet');

  return (
    <>
      <PageBanner title="Bonuses" />

      <section className="section wrap">
        <div className="offer-grid">
          {OFFERS.map((offer) => {
            const external = offer.href.startsWith('http');
            return (
              <article className="offer" key={offer.id} style={{ ['--hue' as string]: offer.hue }}>
                <div className="offer-head">
                  {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
                  <img src={PRIMARY_PARTNER.logo} alt={PRIMARY_PARTNER.name} />
                  <h2>{offer.title}</h2>
                </div>

                <p className="offer-body">{offer.body}</p>

                {offer.pending ? (
                  <p className="pending">Tiers and amounts are set by {PRIMARY_PARTNER.name}</p>
                ) : (
                  <div className="offer-code">
                    <CopyCode code={PRIMARY_PARTNER.code} />
                  </div>
                )}

                {external ? (
                  <a className="offer-btn" href={offer.href} target="_blank" rel="noreferrer">
                    {offer.cta}
                    <ExternalIcon />
                  </a>
                ) : (
                  <Link className="offer-btn" href={offer.href}>
                    {offer.cta}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <Promo board={board} />

      <section className="section wrap">
        <div className="join-head">
          <h2 className="h-section">
            Want to join {PRIMARY_PARTNER.name}? Use code{' '}
            <span className="join-code">{PRIMARY_PARTNER.code}</span>
          </h2>
          <p>Three steps and you are on the board.</p>
        </div>

        {/* An ordered list, because it is one: the steps only work in order,
            and a screen reader should be told that rather than shown three
            unrelated cards. */}
        <ol className="join-steps">
          {JOIN_STEPS.map((step, i) => {
            const Icon = STEP_ICON[i];
            return (
              <li className="join-step" key={step.n}>
                <p className="join-step-tag">
                  <Icon />
                  Step {step.n}
                </p>
                <h3>{step.title}</h3>
                <p className="join-step-body">{step.body}</p>
              </li>
            );
          })}
        </ol>

        <div className="join-actions">
          <a
            className="btn btn-primary"
            href={PRIMARY_PARTNER.signupUrl}
            target="_blank"
            rel="noreferrer"
          >
            Play on {PRIMARY_PARTNER.name}
            <ExternalIcon />
          </a>
          <CopyCode code={PRIMARY_PARTNER.code} />
        </div>
      </section>
    </>
  );
}
