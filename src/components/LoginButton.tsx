import { FaDiscord } from 'react-icons/fa';

import { auth, authConfigured } from '@/lib/auth';
import { AccountMenu } from './AccountMenu';

/**
 * The account control at the right of the top bar.
 *
 * A server component, so the signed-in state is already correct in the first
 * paint — no flash of "Log in" for someone who is logged in, and no client
 * fetch to find out.
 *
 * Three states, and the first one matters: with no Discord credentials in the
 * environment the button renders disabled and says why, rather than looking
 * live and failing on click. That keeps the site running and honest before the
 * OAuth app exists, the same way the leaderboard runs before the Roobet key
 * does.
 */
export async function LoginButton() {
  if (!authConfigured) {
    return (
      <button className="login-btn" disabled title="Discord login is not configured yet">
        <FaDiscord aria-hidden />
        <span className="login-btn-label">Log in</span>
      </button>
    );
  }

  const session = await auth();

  if (session?.user) {
    return <AccountMenu name={session.user.name ?? 'Account'} image={session.user.image ?? null} />;
  }

  return (
    <form
      action={async () => {
        'use server';
        const { signIn } = await import('@/lib/auth');
        await signIn('discord');
      }}
    >
      <button className="login-btn" type="submit">
        <FaDiscord aria-hidden />
        <span className="login-btn-label">Log in</span>
      </button>
    </form>
  );
}
