import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import {
  exchangeForAccount,
  KICK_STATE_COOKIE,
  KICK_VERIFIER_COOKIE,
} from '@/lib/kick-oauth';
import { linkKick } from '@/lib/profiles';

/**
 * Where Kick sends people back to.
 *
 * Everything here is a redirect to the profile page, carrying either nothing
 * or a reason. A JSON error at the end of an OAuth round trip is a dead end
 * for the person reading it; the page they started on is where an explanation
 * belongs.
 */

export const dynamic = 'force-dynamic';

function back(message?: string): NextResponse {
  const base = process.env.AUTH_URL ?? 'http://localhost:3000';
  const url = new URL('/profile', base);
  if (message) url.searchParams.set('error', message);
  const res = NextResponse.redirect(url);
  // Single use, whatever the outcome.
  res.cookies.delete(KICK_STATE_COOKIE);
  res.cookies.delete(KICK_VERIFIER_COOKIE);
  return res;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.discordId) return back('Sign in before linking a Kick account.');

  const url = new URL(request.url);
  const denied = url.searchParams.get('error');
  if (denied) return back('Kick linking was cancelled.');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === KICK_STATE_COOKIE)?.[1];
  const verifier = request.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === KICK_VERIFIER_COOKIE)?.[1];

  if (!code || !state || !expected || !verifier) {
    return back('That link attempt expired. Press Connect and try again.');
  }
  /* The state has to be the one this browser was given. Without the check a
     code obtained elsewhere could be walked through someone else's session. */
  if (state !== expected) return back('That link attempt could not be verified. Try again.');

  const result = await exchangeForAccount(code, verifier);
  if (!result.ok) return back(result.error);

  const linked = await linkKick(session.user.discordId, result.account);
  if (!linked.ok) return back(linked.error);

  return back();
}
