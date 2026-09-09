import 'server-only';

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
