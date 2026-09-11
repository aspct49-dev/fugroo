import type { Metadata } from 'next';

import { FaDiscord } from 'react-icons/fa';

import { BrandStrips } from '@/components/BrandStrips';
import { CopyCode } from '@/components/CopyCode';
import { PageBanner } from '@/components/PageBanner';
import { ExternalIcon, PaidIcon, TrophyIcon } from '@/components/icons';
import { formatMoney } from '@/lib/format';
import {
  CLAIM_STEPS,
  PRIMARY_PARTNER,
  RANK_REWARDS,
  RANK_REWARD_TOP,
  RANK_REWARD_TOTAL,
  SOCIALS,
  TIER_HUE,
} from '@/lib/partners';
import { SITE, pageMeta } from '@/lib/site';

const CLAIM_ICON = [TrophyIcon, FaDiscord, PaidIcon];

export const metadata: Metadata = pageMeta({
  title: 'Wager milestones',
  description: `Rank-up rewards on ${PRIMARY_PARTNER.name} under code ${PRIMARY_PARTNER.code}. Every rank you climb pays out, separately from the monthly leaderboard.`,
  path: '/milestones',
});

export default function MilestonesPage() {
  return (
    <>
      <PageBanner title="Wager Milestones" />

      <section className="section wrap">
        <div className="rank-intro">
          <h2 className="h-section">Every rank you climb pays out</h2>
          <p className="lede">
            {PRIMARY_PARTNER.name} ranks you on how much you have wagered over the life of the
            account. Every rank you reach earns a reward from us — paid by {SITE.name}, not by{' '}
            {PRIMARY_PARTNER.name} — and they stack on top of the monthly leaderboard rather than
            replacing it.
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

      <section className="section wrap">
        <div className="join-head">
          <h2 className="h-section">Claiming a reward</h2>
          <p>
            These are paid by {SITE.name}, so nothing lands automatically — open a ticket and it
            gets sent.
          </p>
        </div>

        {/* Ordered, because the steps only work in sequence. */}
        <ol className="join-steps">
          {CLAIM_STEPS.map((step, i) => {
            const Icon = CLAIM_ICON[i];
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
            className="btn btn-primary claim-discord"
            href={SOCIALS.discord}
            target="_blank"
            rel="noreferrer"
          >
            <FaDiscord />
            Open a ticket in Discord
          </a>
        </div>
      </section>

      <BrandStrips only="partner" />

      <section className="section wrap">
        <div className="rank-note card">
          <h2 className="h-section">How the rank is worked out</h2>
          <p className="lede" style={{ marginTop: 12 }}>
            The rank is {PRIMARY_PARTNER.name}&rsquo;s — they set the thresholds and decide when one
            is reached. The reward attached to it is ours. Wagers count toward the rank by the house
            edge of the game, the same weighting the leaderboard uses, so a low-edge game moves you
            up more slowly than a slot for the same stake.
          </p>
          <div style={{ marginTop: 18 }}>
            <div className="kv">
              <span>Requirement</span>
              <b>Registered under {PRIMARY_PARTNER.code}</b>
            </div>
            <div className="kv">
              <span>Rank measured on</span>
              <b>Lifetime {PRIMARY_PARTNER.metricLabel.toLowerCase()}</b>
            </div>
            <div className="kv">
              <span>Rank awarded by</span>
              <b>{PRIMARY_PARTNER.name}</b>
            </div>
            <div className="kv">
              <span>Reward paid by</span>
              <b>{SITE.name}</b>
            </div>
            <div className="kv">
              <span>Claimed</span>
              <b>By ticket in the Discord</b>
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
