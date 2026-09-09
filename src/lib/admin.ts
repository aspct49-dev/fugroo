import { auth } from './auth';

/**
 * Who can run the site.
 *
 * Matched on the Discord handle, case-insensitively, because that is what we
 * have to go on today. A handle is not a good key — Discord lets anyone change
 * theirs, and if `aspectdzns_` were ever released someone else could claim it
 * and inherit the panel. So `ADMIN_DISCORD_IDS` is checked first and wins: the
 * numeric id cannot be changed or taken. Set it once you have logged in and
 * the id is known, and the handle list stops mattering.
 *
 * The ids come from the environment rather than the source so the list can be
 * changed on the server without a deploy, and so a fork of the repo does not
 * ship somebody's account as an administrator.
 */
const ADMIN_HANDLES = ['aspectdzns_'];

function adminIds(): string[] {
  return (process.env.ADMIN_DISCORD_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminIdentity(id?: string | null, handle?: string | null): boolean {
  if (id && adminIds().includes(id)) return true;
  if (!handle) return false;
  return ADMIN_HANDLES.some((h) => h.toLowerCase() === handle.toLowerCase());
}

/**
 * The session's admin state, resolved on the server.
 *
 * Every admin route calls this rather than trusting anything sent from the
 * browser. A hidden nav item is a courtesy, not a control.
 */
export async function requireAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user) return { session: null, admin: false as const };
  return {
    session,
    admin: isAdminIdentity(user.discordId, user.name),
  };
}
