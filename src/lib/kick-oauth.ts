import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

import { SITE } from './site';

/**
 * Linking a Kick account, through Kick's own OAuth.
 *
 * A raffle entry arrives from chat carrying a Kick identity and nothing else,
 * so the eligibility gate needs a way from that to a Roobet account. Asking
 * people to type their Kick handle would do it, and is what this replaced —
 * but a typed handle is a claim, and the obvious abuse is typing someone
 * else's. Sending them to kick.com and taking the answer from the token means
 * the only person who can link an account is whoever can log into it.
 *
 * Kick is OAuth 2.1, so PKCE is not optional. The verifier is generated here,
 * parked in a cookie, and sent back at the token exchange to prove the code
 * was redeemed by whoever started the flow.
 *
 * The app is created at kick.com/settings/developer, with
 * `<site>/api/kick/callback` registered as the redirect URI. Scope is
 * `user:read` — the name and id of the account authorising, and nothing else.
 * Asking for more than the feature needs is what makes a consent screen look
 * alarming.
 */

const AUTHORIZE = 'https://id.kick.com/oauth/authorize';
const TOKEN = 'https://id.kick.com/oauth/token';
const USERS = 'https://api.kick.com/public/v1/users';

export const KICK_STATE_COOKIE = 'kick_oauth_state';
export const KICK_VERIFIER_COOKIE = 'kick_oauth_verifier';

const clientId = process.env.KICK_CLIENT_ID;
const clientSecret = process.env.KICK_CLIENT_SECRET;

/** Whether linking is offered at all. Absent credentials hide the button
 *  rather than producing one that fails when pressed. */
export const kickOAuthConfigured = Boolean(clientId && clientSecret);

/**
 * Where Kick sends people back to.
 *
 * Built from the site's own origin rather than the request, for the same
 * reason `AUTH_URL` is pinned: behind a proxy Next reports its own binding,
 * so anything derived from the request would send people to localhost. This
 * value has to match what is registered on the Kick app exactly.
 */
export function kickRedirectUri(): string {
  const base = process.env.AUTH_URL ?? SITE.url;
  return `${base.replace(/\/+$/, '')}/api/kick/callback`;
}

const b64u = (buf: Buffer) => buf.toString('base64url');

/** A fresh PKCE pair. 64 characters, inside the spec's 43–128. */
export function makePkce(): { verifier: string; challenge: string } {
  const verifier = b64u(randomBytes(48));
  const challenge = b64u(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function authorizeUrl(state: string, challenge: string): string {
  const u = new URL(AUTHORIZE);
  u.searchParams.set('client_id', clientId ?? '');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', kickRedirectUri());
  u.searchParams.set('scope', 'user:read');
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', challenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

/* Kick fronts its API with Cloudflare, which is choosier about clients than it
   is about credentials. The channel lookup in `kick.ts` needs the same header
   to get an answer at all. */
const UA = 'Mozilla/5.0';

export interface KickAccount {
  /** Kick's numeric user id, as a string. The same id a chat message carries
   *  as `sender.id`, which is the whole reason to store it. */
  id: string;
  username: string;
}

/**
 * Swaps the code for a token and asks who it belongs to.
 *
 * Returns the account or a reason. Nothing here throws: every failure is
 * something the person is going to read on their profile page, and "Kick would
 * not say who you are" is more use to them than a stack trace.
 */
export async function exchangeForAccount(
  code: string,
  verifier: string,
): Promise<{ ok: true; account: KickAccount } | { ok: false; error: string }> {
  if (!clientId || !clientSecret) {
    return { ok: false, error: 'Kick linking is not configured on this site.' };
  }

  let accessToken: string;
  try {
    const res = await fetch(TOKEN, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': UA,
        accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: kickRedirectUri(),
        code_verifier: verifier,
      }),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as { access_token?: string } | null;
    if (!res.ok || !body?.access_token) {
      console.error('[kick] token exchange failed:', res.status);
      return { ok: false, error: 'Kick would not issue a token. Try connecting again.' };
    }
    accessToken = body.access_token;
  } catch (err) {
    console.error('[kick] token exchange threw:', err);
    return { ok: false, error: 'Could not reach Kick. Try again in a moment.' };
  }

  try {
    const res = await fetch(USERS, {
      headers: { authorization: `Bearer ${accessToken}`, 'user-agent': UA, accept: 'application/json' },
      cache: 'no-store',
    });
    // The endpoint answers with the token's own user as a one-element list.
    const body = (await res.json().catch(() => null)) as {
      data?: { user_id?: number; name?: string }[] | { user_id?: number; name?: string };
    } | null;
    const me = Array.isArray(body?.data) ? body?.data[0] : body?.data;
    if (!res.ok || !me?.user_id) {
      console.error('[kick] user lookup failed:', res.status);
      return { ok: false, error: 'Kick would not say who you are. Try connecting again.' };
    }
    return {
      ok: true,
      account: { id: String(me.user_id), username: me.name ?? `kick-${me.user_id}` },
    };
  } catch (err) {
    console.error('[kick] user lookup threw:', err);
    return { ok: false, error: 'Could not reach Kick. Try again in a moment.' };
  }
}
