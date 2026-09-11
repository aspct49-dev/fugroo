import type { Metadata } from 'next';

import { PageBanner } from '@/components/PageBanner';
import { VipTransferForm } from '@/components/VipTransferForm';
import { auth } from '@/lib/auth';
import { PRIMARY_PARTNER, VIP_TRANSFER } from '@/lib/partners';
import { getProfile } from '@/lib/profiles';
import { pageMeta } from '@/lib/site';

/**
 * Applying to have a VIP level matched.
 *
 * The site has described this offer since it was built and never gave anyone a
 * way to take it up — `/how-it-works` explained the idea and stopped. This is
 * the form, and it goes to the Discord where it is actually read.
 *
 * Open to people who are not signed in, deliberately. Someone arriving from a
 * stream with a VIP level elsewhere is exactly who this is for, and making
 * them create an account first is a step between them and the thing they came
 * to do. Signing in only saves typing: the Roobet name comes from their
 * profile and the Discord handle from the session.
 */

// Reads the session to prefill, so there is nothing to cache.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMeta({
  title: 'VIP Transfer',
  description: `Already a VIP somewhere else? Apply to have your level matched on ${PRIMARY_PARTNER.name} under code ${PRIMARY_PARTNER.code}.`,
  path: '/vip-transfer',
});

export default async function VipTransferPage() {
  const session = await auth();
  const profile = session?.user?.discordId ? await getProfile(session.user.discordId) : undefined;

  return (
    <>
      <PageBanner title="VIP Transfer" />

      <section className="section wrap">
        <div className="vip-grid">
          <article className="vip-intro">
            <h2 className="h-section">What this is</h2>
            <p className="lede" style={{ marginTop: 12 }}>
              {VIP_TRANSFER.requirement}. {VIP_TRANSFER.reward}.
            </p>

            <div className="kv" style={{ marginTop: 20 }}>
              <span>Reviewed</span>
              <b>{VIP_TRANSFER.cadence}</b>
            </div>
            <div className="kv">
              <span>Decided by</span>
              <b>{PRIMARY_PARTNER.name}</b>
            </div>
            <div className="kv">
              <span>Costs</span>
              <b>Nothing</b>
            </div>

            <h3 className="h-section" style={{ marginTop: 26, fontSize: 16 }}>
              What to send
            </h3>
            <p className="acct-note" style={{ marginTop: 8 }}>
              Screenshots from the casino you play at now: your last 30 days, and your lifetime
              wagered on the same account. They are what {PRIMARY_PARTNER.name} reviews, so make
              sure the figures and the username are both readable.
            </p>

            {VIP_TRANSFER.isPlaceholder && (
              <p className="pending" style={{ marginTop: 18 }}>
                Exact tiers and amounts are set by {PRIMARY_PARTNER.name}, not here
              </p>
            )}

            <p className="acct-note" style={{ marginTop: 18 }}>
              Applications go to the review channel in Discord. Nothing you send is stored on this
              site.
            </p>
          </article>

          <article className="vip-card">
            <h2 className="h-section">Apply</h2>
            <VipTransferForm
              roobetName={profile?.roobetUsername ?? ''}
              discord={session?.user?.name ?? null}
            />
          </article>
        </div>
      </section>
    </>
  );
}
