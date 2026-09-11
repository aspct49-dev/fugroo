import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';

import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { assertAdmin } from '@/lib/admin';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER } from '@/lib/partners';
import { listProfiles, unlinkRoobet } from '@/lib/profiles';
import { roster } from '@/lib/roster';
import { PRIVATE_PAGE } from '@/lib/site';

/**
 * Every linked Roobet account, checked against the affiliate list.
 *
 * Linking now refuses a name that is not under the code, so in the ordinary
 * case there is nothing here to approve — which is why this is a review screen
 * rather than an approval queue. A queue would put a human in front of a
 * question the operator's own API has already answered, and add a wait to
 * every sign-up for it.
 *
 * What it is for is the question the API cannot answer: whether the person
 * holding this Discord account is really the person behind that Roobet name.
 * Nothing can verify that — Roobet gives us no way — so the site settles for
 * making a name unique across profiles and leaving one person able to see the
 * whole list and revoke anything that looks wrong.
 *
 * The status is read live rather than stored. A link checked in March says
 * nothing about today: people stop playing, and a name that has gone quiet
 * drops out of the list entirely.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Linked Accounts',
  ...PRIVATE_PAGE,
};

export default async function AdminAccountsPage() {
  await assertAdmin();

  const profiles = await listProfiles();

  /* One roster call for the whole table. Checking each name separately would
     be the same answer fetched once per row. */
  let players: Awaited<ReturnType<typeof roster>>['players'] | null = null;
  let rosterError: string | null = null;
  try {
    players = (await roster()).players;
  } catch (err) {
    rosterError = err instanceof Error ? err.message : 'Could not reach Roobet';
  }

  const rows = profiles.map((p) => ({
    ...p,
    player: players?.get(p.roobetUsername.toLowerCase()) ?? null,
  }));

  const underCode = rows.filter((r) => r.player).length;

  async function drop(form: FormData) {
    'use server';
    await assertAdmin();
    await unlinkRoobet(String(form.get('discordId')));
    revalidatePath('/admin/accounts');
  }

  return (
    <>
      <h2 className="admin-group">Linked accounts</h2>

      {rosterError && (
        <p className="notice" style={{ marginBottom: 16 }}>
          <span className="notice-mark" aria-hidden>
            !
          </span>
          Could not reach {PRIMARY_PARTNER.name} to check these names ({rosterError}). The links
          below are real; their status is unknown until the feed returns.
        </p>
      )}

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2 className="h-section">
            Accounts <span className="admin-count">{profiles.length}</span>
          </h2>
          {players && (
            <span className="give-conn" data-on={underCode === profiles.length}>
              {underCode} of {profiles.length} under the code
            </span>
          )}
        </div>

        {profiles.length === 0 ? (
          <p className="admin-note">
            Nobody has linked a {PRIMARY_PARTNER.name} account yet. They do it on the Profile page
            after signing in.
          </p>
        ) : (
          <div className="admin-list">
            {rows.map((r) => (
              <div className="admin-bonus" key={r.discordId}>
                <span className="admin-bonus-game">{r.roobetUsername}</span>

                <span className="admin-bonus-bet">
                  {r.player ? (
                    <b style={{ color: 'var(--hue-teal)' }}>Under the code</b>
                  ) : players ? (
                    /* Not an error and not necessarily wrong: the endpoint only
                       lists players who have wagered, so a linked account that
                       has gone quiet reads exactly like one that never played. */
                    <b style={{ color: '#ffc46b' }}>No recent play</b>
                  ) : (
                    <span style={{ color: 'var(--dim)' }}>Unknown</span>
                  )}
                </span>

                <span className="admin-bonus-bet">
                  {r.player ? `${formatMoney(r.player.weightedWagered)} weighted` : '—'}
                </span>

                <span className="admin-bonus-bet" style={{ color: 'var(--dim)' }}>
                  linked {new Date(r.linkedAt).toLocaleDateString('en-GB')}
                </span>

                <form action={drop}>
                  <input type="hidden" name="discordId" value={r.discordId} />
                  <ConfirmSubmit
                    className="admin-drop"
                    aria-label={`Unlink ${r.roobetUsername}`}
                    message={`Unlink “${r.roobetUsername}”? They can link it again themselves, and it stops counting for raffles until they do.`}
                  >
                    ×
                  </ConfirmSubmit>
                </form>
              </div>
            ))}
          </div>
        )}

        <p className="admin-note" style={{ marginTop: 16 }}>
          Linking already refuses a name that is not playing under code {PRIMARY_PARTNER.code}, so
          there is nothing here to approve. What this list is for is the thing no check can settle:
          whether the person holding the Discord account is really that {PRIMARY_PARTNER.name}{' '}
          player. A name can only be claimed once, which stops the obvious version — anything else
          is a judgement call, and unlinking is how you make it.
        </p>
      </div>
    </>
  );
}
