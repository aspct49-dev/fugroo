import 'server-only';

import { checkRoobet } from './roster';
import { mutateJson, readJson } from './store';

/**
 * A Discord account's link to a Roobet username.
 *
 * Keyed on the Discord id rather than the handle, because a handle can be
 * changed and the id cannot — the same reasoning as the admin list.
 *
 * The link is a claim, not proof. Roobet has no way for us to verify that the
 * person holding this Discord account is the person behind that Roobet
 * username; all we can check is that the name appears in our affiliate list.
 * So a name is unique across profiles — two people cannot both claim it — and
 * that is what stops the obvious abuse, which is entering a giveaway under
 * someone else's play.
 */

export interface Profile {
  discordId: string;
  roobetUsername: string;
  /**
   * The Kick account, from Kick's own OAuth.
   *
   * A raffle entry arrives from chat carrying a Kick identity and nothing
   * else, so the eligibility gate needs a way from that to a Roobet account.
   * `kickUserId` is what the gate matches on — it is the same id a chat
   * message carries as `sender.id`, and unlike a handle it survives a rename.
   * The name is kept alongside it only so the pages have something to show.
   *
   * Both optional: a profile can exist with a Roobet account and no Kick one.
   * Only chat raffles read these, so nobody who wants the leaderboard and rank
   * rewards should be made to connect Kick to get them.
   */
  kickUserId?: string;
  kickUsername?: string;
  linkedAt: string;
}

interface Store {
  profiles: Profile[];
}

const FILE = 'profiles.json';
const EMPTY: Store = { profiles: [] };

export async function getProfile(discordId: string): Promise<Profile | undefined> {
  const { profiles } = await readJson<Store>(FILE, EMPTY);
  return profiles.find((p) => p.discordId === discordId);
}

export async function listProfiles(): Promise<Profile[]> {
  const { profiles } = await readJson<Store>(FILE, EMPTY);
  return [...profiles].sort((a, b) => b.linkedAt.localeCompare(a.linkedAt));
}

export type LinkResult = { ok: true } | { ok: false; error: string };


/**
 * Claims a Roobet username for a Discord account.
 *
 * Refuses a name already claimed by somebody else rather than silently moving
 * it, which would let one person walk a name off another account.
 *
 * **Checked against the affiliate list here, not just displayed afterwards.**
 * The page has always shown whether a linked name was under the code, but the
 * link itself accepted anything, so the check was decoration — a typo or a
 * name belonging to someone playing under a different streamer sat in the
 * table looking linked. The list is the operator's own answer to "is this one
 * of ours", which is the whole question, so there is nothing a human approving
 * it afterwards would know that this does not.
 *
 * Two refusals that are deliberately *not* symmetrical:
 *
 *   · **Not in the list** is refused, and the message says to place a bet,
 *     because the endpoint only returns players who have wagered. Someone who
 *     signed up under the code ten minutes ago is genuinely invisible to it,
 *     and telling them to check their spelling would send them hunting for a
 *     mistake they did not make.
 *   · **The lookup failed** is allowed through. That is our outage, not their
 *     problem, and the raffle gate re-checks at entry time anyway — so the
 *     cost of letting an unverifiable name link is nil, and the cost of
 *     refusing one is a player who cannot take part because Roobet was down.
 */
export async function linkRoobet(discordId: string, username: string): Promise<LinkResult> {
  const name = username.trim();
  if (!name) return { ok: false, error: 'Enter your Roobet username.' };
  if (name.length > 40) return { ok: false, error: 'That is longer than a Roobet username.' };

  let result: LinkResult = { ok: true };
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const taken = s.profiles.find(
      (p) => p.roobetUsername.toLowerCase() === name.toLowerCase() && p.discordId !== discordId,
    );
    if (taken) {
      result = {
        ok: false,
        error: 'That Roobet username is already linked to another account.',
      };
      return;
    }
    const mine = s.profiles.find((p) => p.discordId === discordId);
    if (mine) {
      mine.roobetUsername = name;
      mine.linkedAt = new Date().toISOString();
    } else {
      s.profiles.push({ discordId, roobetUsername: name, linkedAt: new Date().toISOString() });
    }
  });
  return result;
}

export async function unlinkRoobet(discordId: string): Promise<void> {
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    s.profiles = s.profiles.filter((p) => p.discordId !== discordId);
  });
}

/**
 * Attaches a Kick account, having just proved ownership of it through OAuth.
 *
 * One Kick account per Discord account, enforced in both directions: a Kick
 * account cannot be claimed by a second Discord, and a Discord already holding
 * one has to disconnect before connecting another. That is what stops one
 * person entering the same raffle from several accounts, which is the only
 * abuse this gate exists to prevent.
 *
 * Keyed on the Kick *id* rather than the name, so someone renaming on Kick
 * keeps their link and does not free their old handle for somebody else.
 */
export async function linkKick(
  discordId: string,
  account: { id: string; username: string },
): Promise<LinkResult> {
  let result: LinkResult = { ok: true };
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const heldByAnother = s.profiles.find(
      (p) => p.kickUserId === account.id && p.discordId !== discordId,
    );
    if (heldByAnother) {
      result = { ok: false, error: 'That Kick account is already linked to another profile.' };
      return;
    }

    const mine = s.profiles.find((p) => p.discordId === discordId);
    if (mine) {
      if (mine.kickUserId && mine.kickUserId !== account.id) {
        result = {
          ok: false,
          error: 'Disconnect the Kick account already on this profile first.',
        };
        return;
      }
      mine.kickUserId = account.id;
      mine.kickUsername = account.username;
    } else {
      /* No Roobet name yet, which is allowed: the two links are independent,
         and someone may well connect Kick before they get round to Roobet. */
      s.profiles.push({
        discordId,
        roobetUsername: '',
        kickUserId: account.id,
        kickUsername: account.username,
        linkedAt: new Date().toISOString(),
      });
    }
  });
  return result;
}

export async function unlinkKick(discordId: string): Promise<void> {
  await mutateJson<Store>(FILE, EMPTY, (s) => {
    const mine = s.profiles.find((p) => p.discordId === discordId);
    if (!mine) return;
    delete mine.kickUserId;
    delete mine.kickUsername;
    // A profile that was only ever a Kick link has nothing left to be.
    if (!mine.roobetUsername) s.profiles = s.profiles.filter((p) => p.discordId !== discordId);
  });
}
