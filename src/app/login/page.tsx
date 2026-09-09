import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FaDiscord, FaGoogle } from 'react-icons/fa';

import { auth, discordConfigured, googleConfigured, signIn } from '@/lib/auth';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Log in',
  description: `Sign in to ${SITE.name} with Discord or Google.`,
  alternates: { canonical: '/login' },
  // A sign-in form has nothing to offer a search engine.
  robots: { index: false, follow: false },
};

/**
 * The way in.
 *
 * One card, one choice: Discord for the people already in the server, Google
 * for everyone else. Both land in the same account — the provider is how you
 * prove who you are, not what kind of account you get.
 *
 * A provider whose credentials are missing is not rendered at all, rather than
 * shown and failing on click. If neither is wired the page says so plainly
 * instead of presenting a form that cannot work.
 */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/');

  const anyReady = discordConfigured || googleConfigured;

  return (
    <section className="section wrap">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
        <img className="login-mark" src="/wordmark.webp" alt={SITE.name} />

        <h1 className="login-title">Log in</h1>
        <p className="login-lede">
          Sign in to track your place on the board, claim rank rewards and enter raffles. Playing
          under code <b>{PRIMARY_PARTNER.code}</b> is what puts you on the leaderboard; this is how
          we know it is you.
        </p>

        {anyReady ? (
          <div className="login-providers">
            {discordConfigured && (
              <form
                action={async () => {
                  'use server';
                  await signIn('discord', { redirectTo: '/' });
                }}
              >
                <button className="provider-btn provider-discord" type="submit">
                  <FaDiscord aria-hidden />
                  Continue with Discord
                </button>
              </form>
            )}

            {googleConfigured && (
              <form
                action={async () => {
                  'use server';
                  await signIn('google', { redirectTo: '/' });
                }}
              >
                <button className="provider-btn provider-google" type="submit">
                  <FaGoogle aria-hidden />
                  Continue with Google
                </button>
              </form>
            )}
          </div>
        ) : (
          <p className="notice login-notice">
            <span className="notice-mark" aria-hidden>
              !
            </span>
            Sign-in is not switched on yet. Nothing else on the site needs an account, so everything
            works in the meantime.
          </p>
        )}

        <p className="login-foot">
          You must be 18 or over. We only ever read your name and avatar — never anything you do on{' '}
          {PRIMARY_PARTNER.name}.
        </p>
      </div>
    </section>
  );
}
