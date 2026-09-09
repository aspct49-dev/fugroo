import type { Metadata } from 'next';

import { BrandStrips } from '@/components/BrandStrips';
import { CopyCode } from '@/components/CopyCode';
import { PageBanner } from '@/components/PageBanner';
import { ExternalIcon } from '@/components/icons';
import { formatMoney } from '@/lib/format';
import {
  PRIMARY_PARTNER,
  RANK_REWARDS,
  RANK_REWARD_TOP,
  RANK_REWARD_TOTAL,
  TIER_HUE,
} from '@/lib/partners';

export const metadata: Metadata = {
  title: 'Wager milestones',
  description: `Rank-up rewards on ${PRIMARY_PARTNER.name} under code ${PRIMARY_PARTNER.code}. Every rank you climb pays out, separately from the monthly leaderboard.`,
  alternates: { canonical: '/milestones' },
};

export default function MilestonesPage() {
  return (
    <>
      <PageBanner title="Wager milestones" />

      <section className="section wrap">
        <div className="rank-intro">
          <h2 className="h-section">Every rank you climb pays out</h2>
          <p className="lede">
            {PRIMARY_PARTNER.name} ranks you on how much you have wagered over the life of the
            account. Each rank you reach releases a reward, and they stack — these are paid on top
            of the monthly leaderboard, not instead of it.
          </p>
        </div>

        <div className="rank-stats">
          <div className="stat">
            <div className="stat-v">{RANK_REWARDS.length}</div>
            <span className="stat-k">Ranks listed</span>
          </div>
          <div className="stat">
            <div className="stat-v">{formatMoney(RANK_REWARD_TOTAL)}</div>
            <span className="stat-k">Across the ladder so far</span>
          </div>
          <div className="stat">
            <div className="stat-v">{formatMoney(RANK_REWARD_TOP)}</div>
            <span className="stat-k">Highest single rank-up</span>
          </div>
        </div>

        {/*
         * An ordered list, because the ladder is one — you cannot reach Emerald
         * without passing Gold, and that ordering is information a screen
         * reader should get rather than have to infer from the layout.
         */}
        <ol className="rank-ladder">
          {RANK_REWARDS.map((rank) => (
            <li
              className="rank"
              key={rank.id}
              style={{ ['--hue' as string]: TIER_HUE[rank.tier] }}
            >
              <div className="rank-emblem">
                {/* eslint-disable-next-line @next/next/no-img-element -- operator rank art */}
                <img src={`/rank-${rank.id}.webp`} alt="" width={312} height={240} />
              </div>
              <h3 className="rank-name">{rank.name}</h3>
              <p className="rank-reward">{formatMoney(rank.reward, { cents: true })}</p>
            </li>
          ))}
        </ol>

        <p className="pending">
          More of {PRIMARY_PARTNER.name}&rsquo;s ladder is added as the amounts are confirmed
        </p>
      </section>

      <BrandStrips only="partner" />

      <section className="section wrap">
        <div className="rank-note card">
          <h2 className="h-section">How the rank is worked out</h2>
          <p className="lede" style={{ marginTop: 12 }}>
            The rank is {PRIMARY_PARTNER.name}&rsquo;s, not ours — they set the thresholds, decide
            when a rank is reached and pay the reward. Wagers count toward it by the house edge of
            the game, the same weighting the leaderboard uses, so a low-edge game moves you up more
            slowly than a slot for the same stake.
          </p>
          <div style={{ marginTop: 18 }}>
            <div className="kv">
              <span>Requirement</span>
              <b>Registered under {PRIMARY_PARTNER.code}</b>
            </div>
            <div className="kv">
              <span>Measured on</span>
              <b>Lifetime {PRIMARY_PARTNER.metricLabel.toLowerCase()}</b>
            </div>
            <div className="kv">
              <span>Paid by</span>
              <b>{PRIMARY_PARTNER.name}, direct to your balance</b>
            </div>
            <div className="kv">
              <span>Stacks with</span>
              <b>The monthly leaderboard</b>
            </div>
          </div>

          <div className="join-actions" style={{ justifyContent: 'flex-start', marginTop: 24 }}>
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
        </div>
      </section>
    </>
  );
}
