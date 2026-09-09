import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';

/**
 * Discord sign-in.
 *
 * The whole thing is gated on the credentials being present. Auth.js throws at
 * import time if a provider is configured without them, which on a server
 * component would take the entire page down — so with no credentials the
 * provider list is simply empty, every route still renders, and the login
 * button stays disabled. That is the same shape as the Roobet provider: the
 * site runs without secrets, it just does less.
 *
 * Sessions are JWT-only for now, which needs no database. Adding one is a
 * change to `session.strategy` plus an adapter; nothing above this line moves.
 *
 * `identify` is the only scope requested. It returns the id, username and
 * avatar and nothing else — no email, no server list. Asking for more than the
 * feature needs is what makes a consent screen look alarming, and the id is
 * what a Roobet account would be linked against anyway.
 */
const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;

/** True once both halves of the OAuth credential are set. */
export const authConfigured = Boolean(clientId && clientSecret);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: authConfigured
    ? [
        Discord({
          clientId,
          clientSecret,
          authorization: { params: { scope: 'identify' } },
        }),
      ]
    : [],
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
