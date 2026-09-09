import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';
import Google from 'next-auth/providers/google';

/**
 * Sign-in, over Discord and Google.
 *
 * Each provider is gated independently on its own credentials. Auth.js throws
 * at import time if a provider is configured without them, which on a server
 * component would take the entire page down — so a provider whose secrets are
 * missing is simply not in the list, every route still renders, and the login
 * page offers whatever is actually wired. That is the same shape as the Roobet
 * provider: the site runs without secrets, it just does less.
 *
 * Sessions are JWT-only for now, which needs no database. Adding one is a
 * change to `session.strategy` plus an adapter; nothing above this line moves.
 *
 * Scopes are kept to the minimum each provider needs. Discord is asked only
 * for `identify` — id, username, avatar, no email and no server list. Google
 * returns the email, which is the point of offering it. Asking for more than
 * the feature needs is what makes a consent screen look alarming.
 */
const discordId = process.env.DISCORD_CLIENT_ID;
const discordSecret = process.env.DISCORD_CLIENT_SECRET;
const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

export const discordConfigured = Boolean(discordId && discordSecret);
export const googleConfigured = Boolean(googleId && googleSecret);

/** Whether there is any way in at all. */
export const authConfigured = discordConfigured || googleConfigured;

/** What the login page offers, in the order it shows them. */
export const PROVIDERS = [
  { id: 'discord', name: 'Discord', ready: discordConfigured },
  { id: 'google', name: 'Google', ready: googleConfigured },
] as const;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    ...(discordConfigured
      ? [
          Discord({
            clientId: discordId,
            clientSecret: discordSecret,
            authorization: { params: { scope: 'identify' } },
          }),
        ]
      : []),
    ...(googleConfigured
      ? [Google({ clientId: googleId, clientSecret: googleSecret })]
      : []),
  ],
  /* Our own page, so signing in looks like the rest of the site and can offer
     both providers side by side rather than Auth.js's default list. */
  pages: { signIn: '/login' },
  /*
   * Behind a reverse proxy the request arrives with the proxy's host, not the
   * site's, and Auth.js refuses to build a callback URL from a host it has not
   * been told to trust — every /api/auth/* route 500s with UntrustedHost until
   * it is. Self-hosting on a VPS means we own the proxy, so the host is ours to
   * trust; AUTH_URL pins the canonical origin on top of that, and is what the
   * callback is actually built from in production.
   */
  trustHost: true,
  session: { strategy: 'jwt' },
  callbacks: {
    /**
     * Carry the Discord id onto the token. It is the only stable handle a
     * Discord account has — usernames change — so anything that later links a
     * player to a Roobet account has to key on this.
     */
    jwt({ token, profile }) {
      if (profile?.id) token.discordId = String(profile.id);
      return token;
    },
    session({ session, token }) {
      if (token.discordId) session.user.discordId = String(token.discordId);
      return session;
    },
  },
});
