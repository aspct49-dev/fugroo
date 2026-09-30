import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalDoc } from '@/components/LegalDoc';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { SITE, pageMeta } from '@/lib/site';

/**
 * The terms.
 *
 * Written for the person reading it rather than for a filing cabinet: what
 * this site is, who may take part, how a standing is arrived at, and when a
 * prize can be withheld. Every clause here describes something the site
 * actually does — there is no clause about arbitration venues or licensed
 * content, because there is no arbitration and no licensed content.
 */

export const metadata: Metadata = pageMeta({
  title: 'Terms of Service',
  description: `The rules for taking part in the ${SITE.name} leaderboard, raffles and rewards, and the relationship between ${SITE.name} and ${PRIMARY_PARTNER.name}.`,
  path: '/terms',
});

const P = PRIMARY_PARTNER.name;

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Service"
      updated="20 September 2026"
      intro={`The rules for taking part in anything run on this site. Using ${SITE.name} means you accept them.`}
    >
      <h2>What this site is</h2>
      <p>
        {SITE.name} is a community site run by a streamer for people who play at {P} under the code{' '}
        <strong>{PRIMARY_PARTNER.code}</strong>. It is <strong>not a casino</strong>. It takes no
        deposits, holds no funds, accepts no bets and runs no games of chance for money. Everything
        here is built on top of an affiliate arrangement with {P}; we are not owned, operated or
        endorsed by them, and nothing on this site is an offer from {P}.
      </p>
      <p>
        Your gambling account, your balance and your withdrawals are entirely between you and {P},
        under {P}&rsquo;s own terms. We cannot see, change, credit or recover any of it.
      </p>

      <h2>Who can take part</h2>
      <ul>
        <li>
          You must be 18, or the legal gambling age where you live if that is higher, and you must
          be allowed to hold a {P} account under {P}&rsquo;s own rules.
        </li>
        <li>
          Your {P} account must be registered under the code {PRIMARY_PARTNER.code}. A casino cannot
          move an existing account to a different affiliate, so an account opened elsewhere will not
          appear on the board no matter what you link here.
        </li>
        <li>
          If you have self-excluded from gambling anywhere, or you are using a blocking tool, please
          do not take part. Nothing here is worth breaking that for.
        </li>
        <li>
          Staff, and anyone helping run the site or the stream, are excluded from the board, its
          totals and its prizes.
        </li>
      </ul>

      <h2>Your account here</h2>
      <p>
        Signing in uses Discord. You are responsible for what happens under your account, and for
        keeping the Discord account behind it secure. Linking a {P} username is a{' '}
        <strong>claim</strong>, not proof — we can only check that the name appears in our affiliate
        list — so one {P} username can be linked to one Discord account and no other. Claiming a
        name that is not yours, or running more than one account to enter something twice, forfeits
        anything it won.
      </p>

      <h2>How standings are worked out</h2>
      <p>
        Standings come from {P}&rsquo;s affiliate reporting, which we read and display. We do not
        calculate the figures and cannot adjust them. They are cached for up to a minute, so what
        you see can be slightly behind.
      </p>
      <p>
        Wagers are weighted by {P} according to the game&rsquo;s RTP, and the board ranks on the
        weighted figure. This means the number here will not always match the total in your {P}{' '}
        account. The bands are published on the{' '}
        <Link href="/leaderboard">leaderboard</Link> and on{' '}
        <Link href="/how-it-works">How It Works</Link>, and they are {P}&rsquo;s rules, not ours — if they
        change theirs, the board follows.
      </p>
      <p>
        Where the site and {P}&rsquo;s own reporting disagree, {P}&rsquo;s figures decide the
        outcome. A display error on this site does not create a prize.
      </p>

      <h2>Prizes and rewards</h2>
      <ul>
        <li>
          Leaderboard prizes are paid out of our own pocket after the month closes and the figures
          settle. They do not come from your {P} balance and are not a {P} promotion.
        </li>
        <li>
          Rank rewards, raffles, guess-the-balance rounds and tournaments are run the same way:
          ours to pay, ours to decide, and announced on the relevant page.
        </li>
        <li>
          To be paid you need to be reachable — a ticket in the Discord with the {P} username on the
          board. If a winner cannot be reached within <strong>30 days</strong> of the result, the
          prize can be forfeited.
        </li>
        <li>
          A prize can be withheld or reversed where an entry broke these terms, where {P} reverses
          or voids the wagering behind it, or where the play was not genuine — bonus abuse,
          chargebacks, multi-accounting, or figures inflated by a bug.
        </li>
      </ul>

      <h2>Raffles and rounds</h2>
      <p>
        Chat raffles draw at random from the entries collected while the round is open, and an entry
        may require a linked account under the code. One entry per person: entering under several
        accounts removes all of them. Guess-the-balance rounds are decided by the closest guess to
        the figure the hunt actually finishes on, and one guess is kept per account. Rounds can be
        cancelled and redrawn if something goes wrong while they are running.
      </p>

      <h2>VIP transfer applications</h2>
      <p>
        A VIP transfer application is passed to a person to read. It does not approve anything and
        is not a promise of a tier, a bonus or a rate. {P} decides what, if anything, to offer, and
        may ask for more than you sent. Screenshots you send have to be of your own account and
        unedited; an altered one ends the application and any standing you have here.
      </p>

      <h2>Fair use</h2>
      <p>
        Do not script, scrape or automate this site, flood its forms, try to reach admin pages you
        have no business on, or abuse the people running it. Any of that ends your access. We may
        remove an account or an entry, with or without notice, where it is being used this way.
      </p>

      <h2>Promotions can change</h2>
      <p>
        Prize pools, milestones, rewards and the sections offering them can change or end. The
        current version of a page is the one that applies. Where a change affects a month already
        running, we will not reduce what was on offer part-way through it.
      </p>

      <h2>No guarantees about the site itself</h2>
      <p>
        The site is provided as it is. Standings can be delayed or wrong while a feed is down, pages
        can be unavailable, and rounds can be disrupted. We are not liable for losses that follow
        from that, and in no case for money lost gambling at {P} or anywhere else — that risk is
        entirely yours.
      </p>

      <h2>Responsible gambling</h2>
      <p>
        Gambling costs money and carries real financial risk. Nothing on this site should be read as
        suggesting otherwise, and no leaderboard position is worth chasing with money you need. If
        it has stopped being entertainment, stop, and use the operator&rsquo;s deposit limits,
        time-outs and self-exclusion tools. Free, confidential help is available at{' '}
        <a href="https://www.begambleaware.org" target="_blank" rel="noreferrer">
          BeGambleAware
        </a>{' '}
        and{' '}
        <a href="https://www.gamblingtherapy.org" target="_blank" rel="noreferrer">
          Gambling Therapy
        </a>
        .
      </p>

      <h2>Changes to these terms</h2>
      <p>
        These terms can be updated. The date at the top is when they last changed, and continuing to
        use the site after that means the updated version applies.
      </p>
    </LegalDoc>
  );
}
