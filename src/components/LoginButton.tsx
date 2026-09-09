'use client';

import { FaDiscord } from 'react-icons/fa';

/**
 * The account control at the right of the top bar.
 *
 * PLACEHOLDER until Discord OAuth is wired. It renders disabled and says so
 * rather than looking live and doing nothing when clicked — a login button
 * that silently fails is worse than one that admits it is not ready yet.
 *
 * Turning it on is a two-line change: swap the button for one that calls the
 * sign-in route, and read the session for the signed-in state. The markup and
 * the styling below already cover both.
 */
export function LoginButton() {
  const ready = false;

  if (!ready) {
    return (
      <button className="login-btn" disabled title="Discord login is not wired up yet">
        <FaDiscord aria-hidden />
        <span className="login-btn-label">Log in</span>
      </button>
    );
  }

  return (
    <a className="login-btn" href="/api/auth/signin/discord">
      <FaDiscord aria-hidden />
      <span className="login-btn-label">Log in</span>
    </a>
  );
}
