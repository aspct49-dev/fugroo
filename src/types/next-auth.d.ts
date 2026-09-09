import type { DefaultSession } from 'next-auth';

/**
 * The Discord id, carried onto the session and the token.
 *
 * A Discord username can be changed at any time, so it is no use as a key. The
 * numeric id is stable, and it is what any future link between a player here
 * and a Roobet account has to be stored against.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      discordId?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId?: string;
  }
}
