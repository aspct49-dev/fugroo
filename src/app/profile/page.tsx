import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { PageBanner } from '@/components/PageBanner';
import { ExternalIcon } from '@/components/icons';
import { auth } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { getProfile, linkRoobet, unlinkRoobet } from '@/lib/profiles';
import { checkRoobet } from '@/lib/roster';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.discordId) redirect('/login');

  const discordId = session.user.discordId;
  const [profile, params] = await Promise.all([getProfile(discordId), searchParams]);

  // Only checked when there is something to check — an unlinked account should
  // not cost a call to Roobet on every page load.
  const check = profile ? await checkRoobet(profile.roobetUsername) : null;

  async function link(form: FormData) {
    'use server';
    const s = await auth();
    if (!s?.user?.discordId) return;
    const result = await linkRoobet(s.user.discordId, String(form.get('roobet') ?? ''));
    revalidatePath('/profile');
    if (!result.ok) redirect(`/profile?error=${encodeURIComponent(result.error)}`);
  }

  async function unlink() {
    'use server';
    const s = await auth();
    if (!s?.user?.discordId) return;
    await unlinkRoobet(s.user.discordId);
    revalidatePath('/profile');
  }

  return (
    <>
      <PageBanner title="My account" />

      <section className="section wrap">
        <div className="acct-grid">
          <article className="acct-card">
            <h2 className="h-section">Discord</h2>
            <div className="acct-who">
              <span className="acct-avatar">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote Discord CDN avatar
                  <img src={session.user.image} alt="" width={44} height={44} />
                ) : (
                  <span className="account-initial">
                    {(session.user.name ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <div>
                <b>{session.user.name}</b>
                <span className="acct-sub">Signed in</span>
              </div>
            </div>
          </article>

          <article className="acct-card">
            <h2 className="h-section">{PRIMARY_PARTNER.name} account</h2>

            {profile ? (
              <>
                <div className="acct-linked" data-ok={check?.found}>
                  <b>{profile.roobetUsername}</b>
                  {check?.error ? (
                    <span className="acct-state acct-warn">
                      Could not check right now — {check.error}
                    </span>
                  ) : check?.found ? (
                    <span className="acct-state acct-ok">
                      Under code {PRIMARY_PARTNER.code} ·{' '}
                      {formatMoney(check.player?.weightedWagered ?? 0)} wagered
                    </span>
                  ) : (
                    <span className="acct-state acct-warn">
                      Not showing under the code yet
                    </span>
                  )}
                </div>

                {!check?.found && !check?.error && (
                  <p className="acct-note">
                    {PRIMARY_PARTNER.name} only lists players who have placed a bet. If you have
                    just signed up under <b>{PRIMARY_PARTNER.code}</b>, play a hand and check back
                    — it is not a spelling problem.
                  </p>
                )}

                <form action={unlink} style={{ marginTop: 16 }}>
                  <button className="btn btn-quiet btn-sm" type="submit">
                    Unlink
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="acct-note">
                  Link the {PRIMARY_PARTNER.name} username you play under so raffles and rank
                  rewards know who you are. It has to be an account registered under code{' '}
                  <b>{PRIMARY_PARTNER.code}</b>.
                </p>

                {params.error && (
                  <p className="notice" style={{ marginTop: 14 }}>
                    <span className="notice-mark" aria-hidden>
                      !
                    </span>
                    {params.error}
                  </p>
                )}

                <form action={link} className="admin-form" style={{ marginTop: 6 }}>
                  <label className="field">
                    <span>{PRIMARY_PARTNER.name} username</span>
                    <input name="roobet" placeholder="yourname" required autoComplete="off" />
                  </label>
                  <button className="btn btn-primary btn-sm" type="submit">
                    Link account
                  </button>
                </form>

                <a
                  className="acct-link"
                  href={PRIMARY_PARTNER.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  No account yet? Sign up under the code
                  <ExternalIcon />
                </a>
              </>
            )}
          </article>
        </div>
      </section>
    </>
  );
}
