import Link from 'next/link';

import { auth, authConfigured } from '@/lib/auth';
import { AccountMenu } from './AccountMenu';

/**
 * The account control at the right of the top bar.
 *
 * A server component, so the signed-in state is already correct in the first
 * paint — no flash of "Log in" for someone who is logged in, and no client
 * fetch to find out.
 *
 * It carries no provider mark. There is more than one way in, and putting one
 * platform's logo on the button would promise a route that may not be the one
 * someone wants; choosing between them is what /login is for.
 *
 * With nothing configured it renders disabled and says why, rather than
 * looking live and failing on click. The site runs before the OAuth apps
 * exist, the same way the leaderboard runs before the Roobet key does.
 */
export async function LoginButton() {
  if (!authConfigured) {
    return (
      <button className="login-btn" disabled title="Sign-in is not configured yet">
        <span className="login-btn-label">Log in</span>
      </button>
    );
  }

  const session = await auth();

  if (session?.user) {
    return <AccountMenu name={session.user.name ?? 'Account'} image={session.user.image ?? null} />;
  }

  return (
    <Link className="login-btn" href="/login">
      <span className="login-btn-label">Log in</span>
    </Link>
  );
}
