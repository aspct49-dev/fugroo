import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalDoc } from '@/components/LegalDoc';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { SITE, pageMeta } from '@/lib/site';

/**
 * The privacy policy.
 *
 * Kept honest by being specific: it names the fields that are actually written
 * to disk, and says where the two things that look like data collection — the
 * VIP transfer upload and the anti-spam ledger — do not keep anything. A
 * policy that lists categories instead of fields is one nobody can check, and
 * one that quietly goes stale the first time the code changes.
 *
 * If the storage in `lib/profiles.ts`, `lib/giveaway.ts`, `lib/guesses.ts` or
 * `lib/vip-transfer.ts` gains a field, it belongs on this page too.
 */

export const metadata: Metadata = pageMeta({
  title: 'Privacy Policy',
  description: `What ${SITE.name} collects when you sign in, link an account or enter a round, why it is kept, and how to have it removed.`,
  path: '/privacy',
});

const P = PRIMARY_PARTNER.name;

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      updated="20 September 2026"
      intro={`What this site keeps about you, why it keeps it, and how to have it removed. It is a short list, and this page names all of it.`}
    >
      <h2>The short version</h2>
      <p>
        You can read every page here without signing in and without an account. Signing in gives us
        your Discord id and handle, and nothing else. We do not ask for your email, your name or
        your address, we run no analytics or advertising trackers, and we sell nothing to anybody.
      </p>

      <h2>What is collected, and when</h2>
      <ul>
        <li>
          <strong>Signing in with Discord.</strong> We ask Discord only for your basic identity, so
          we receive your Discord id, username and avatar. We do not ask for your email address and
          are not given it.
        </li>
        <li>
          <strong>Linking a {P} username.</strong> The username you type, and the time you linked
          it, stored against your Discord id. We check it against our affiliate list; we never see
          your {P} password, balance, deposits or documents.
        </li>
        <li>
          <strong>Connecting Kick.</strong> Optional, and only needed for chat raffles. Kick&rsquo;s
          sign-in gives us your Kick user id and username, which is what lets a message in chat be
          matched to your entry.
        </li>
        <li>
          <strong>Entering a round.</strong> A raffle entry keeps the Kick id and name the message
          came from; a guess keeps your Discord id, handle, avatar, the number you guessed and when.
          Tournament entries work the same way.
        </li>
        <li>
          <strong>Technical data.</strong> Like any website, ours sees the IP address and browser
          of each request. It is used to keep forms from being flooded and to keep the site running,
          and it is not built into a profile of you.
        </li>
      </ul>

      <h2>VIP transfer applications</h2>
      <p>
        <strong>The application itself is not stored on this site.</strong> What you type and the
        screenshots you attach are posted straight into a private Discord channel for a person to
        read, and the request ends there. The only thing written down is a{' '}
        <strong>one-way hash</strong> of your Discord id or address with a timestamp, so the form
        cannot be sent thirty times over; it cannot be turned back into you, holds nothing you
        typed, and is deleted after 24 hours.
      </p>
      <p>
        Once an application is in Discord it lives under Discord&rsquo;s terms and is visible to the
        people who review it. Send only what is needed to show your tier, and crop out anything else
        on the screen.
      </p>

      <h2>What is shown publicly</h2>
      <p>
        The leaderboard shows {P} usernames and their weighted wagered figures, as {P} reports them
        to us — that is the point of a public board, and it comes from {P} whether or not the player
        has an account here. Winners of raffles, guesses and tournaments are shown by the name the
        entry came in under. Your Discord id is never shown, and neither is anything you have not
        put on the board by playing.
      </p>

      <h2>Cookies</h2>
      <p>
        Two kinds, both necessary, neither used for tracking:
      </p>
      <ul>
        <li>
          A <strong>sign-in cookie</strong> that keeps you logged in. Signing out removes it.
        </li>
        <li>
          Two <strong>short-lived cookies</strong> used while connecting Kick, to make sure the
          reply to that sign-in is the one we asked for. They expire within minutes.
        </li>
      </ul>
      <p>
        There are no analytics, advertising or social tracking cookies on this site, and no
        third-party scripts that set any.
      </p>

      <h2>Who else is involved</h2>
      <ul>
        <li>
          <strong>Discord</strong> — sign-in, and the channel VIP transfer applications are posted
          into.
        </li>
        <li>
          <strong>Kick</strong> — optional account connection, and the public chat a raffle reads.
        </li>
        <li>
          <strong>{P}</strong> — the affiliate reporting the board is built from. We read figures
          from them; we do not send them anything about you.
        </li>
        <li>
          <strong>Our hosting and the network in front of it</strong> — the server the site runs on
          and the service that shields it, both of which handle requests on our behalf.
        </li>
      </ul>
      <p>
        Each of those has its own privacy policy for what it does with your data on its own side.
        Nobody else receives anything, and none of it is sold, rented or used for advertising.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Your linked accounts are kept until you unlink them or ask us to delete them. Rounds —
        entries, guesses, winners — are kept as the record of what happened, so results can be
        checked afterwards. The anti-spam ledger clears itself every 24 hours. Nothing is archived
        anywhere else.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Unlink at any time.</strong> Your{' '}
          <Link href="/profile">profile page</Link> removes a linked {P} or Kick account yourself, without
          asking anyone.
        </li>
        <li>
          <strong>Ask for a copy or a deletion.</strong> Message us and we will tell you what is
          held against your Discord id, or delete it. It is a small amount of data and this is a
          manual job, not a form.
        </li>
        <li>
          <strong>The board is a separate matter.</strong> Your {P} username appears there because
          of your play under the code, so removing it is a question for {P}&rsquo;s own affiliate
          reporting, not for us.
        </li>
      </ul>

      <h2>Under 18s</h2>
      <p>
        This site is for adults, and it is not directed at anyone under 18. If you believe a minor
        has signed in here, tell us and the account will be removed.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If what the site collects changes, this page changes with it and the date at the top is
        updated.
      </p>
    </LegalDoc>
  );
}
