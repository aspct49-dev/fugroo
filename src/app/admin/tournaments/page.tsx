import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

import { AdminTournament } from '@/components/AdminTournament';
import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { assertAdmin } from '@/lib/admin';
import { BRACKET_SIZES, normaliseBracket, type Match } from '@/lib/bracket';
import {
  createTournament,
  deleteTournament,
  getTournament,
  listTournaments,
  saveBracket,
  setTournamentStatus,
  tournamentProgress,
  type TournamentStatus,
} from '@/lib/tournaments';

/**
 * Tournaments, on its own route.
 *
 * Which bracket is being edited is a query parameter rather than component
 * state, so the editor is a link away and survives a reload — an admin running
 * an event on stream should be able to refresh the page without losing their
 * place in it.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Tournaments' };

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: selectedId } = await searchParams;
  const tournaments = await listTournaments();
  const selected = selectedId
    ? await getTournament(selectedId)
    : (tournaments.find((x) => x.status === 'live') ?? tournaments[0]);

  async function create(form: FormData) {
    'use server';
    await assertAdmin();
    const name = String(form.get('name') ?? '').trim();
    const size = Number(form.get('size'));
    const prize = String(form.get('prize') ?? '').trim();
    if (!name) return;
    await createTournament(name, size, prize);
    revalidatePath('/admin/tournaments');
    revalidatePath('/tournaments');
  }

  /**
   * Persists a bracket sent by the editor.
   *
   * Takes the whole `Match[]` rather than a FormData patch because the editor
   * is a live client component, not a form. The payload is rebuilt against the
   * stored size in `normaliseBracket` before it is written, so a malformed one
   * is refused instead of corrupting the store.
   */
  async function save(id: string, matches: Match[]) {
    'use server';
    await assertAdmin();
    const tournament = await getTournament(id);
    if (!tournament) return;
    const clean = normaliseBracket(tournament.size, matches);
    if (!clean) return;
    await saveBracket(id, clean);
    revalidatePath('/tournaments');
  }

  async function status(form: FormData) {
    'use server';
    await assertAdmin();
    await setTournamentStatus(
      String(form.get('id')),
      String(form.get('status')) as TournamentStatus,
    );
    revalidatePath('/admin/tournaments');
    revalidatePath('/tournaments');
  }

  async function remove(form: FormData) {
    'use server';
    await assertAdmin();
    await deleteTournament(String(form.get('id')));
    revalidatePath('/admin/tournaments');
    revalidatePath('/tournaments');
  }

  return (
    <>
      <h2 className="admin-group">Tournaments</h2>

      <div className="admin-panel">
        <h2 className="h-section">New bracket</h2>
        <p className="admin-note" style={{ marginTop: 10 }}>
          Brackets start as a draft. Nothing appears on the public page until it is published, so
          entrants can be filled in without a half-empty draw being on show.
        </p>
        <form action={create} className="admin-form">
          <label className="field">
            <span>Name</span>
            <input name="name" placeholder="Friday slot battle" required />
          </label>
          <label className="field">
            <span>Entrants</span>
            <select name="size" defaultValue={8}>
              {BRACKET_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} players
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prize</span>
            <input name="prize" placeholder="$250" />
          </label>
          <button className="btn btn-primary btn-sm" type="submit">
            Create
          </button>
        </form>
      </div>

      {selected && (
        <>
          {/* A draft is invisible to everyone but an admin, which is the right
              default and a genuinely confusing one — the first version of this
              said so in small grey text next to two other buttons, and the
              answer to "why is my tournament not on the site?" was buried in
              it. So an unpublished bracket now says so at full size, with the
              one button that fixes it. */}
          <div className="trn-visibility" data-status={selected.status}>
            <div>
              <h2 className="h-section">
                {selected.status === 'draft'
                  ? 'Not published yet'
                  : selected.status === 'live'
                    ? 'Live on the site'
                    : 'Finished'}
              </h2>
              <p>
                {selected.status === 'draft'
                  ? 'This bracket is a draft — nobody but you can see it. Publish it to put it on the tournaments page.'
                  : selected.status === 'live'
                    ? 'Anyone can see this bracket, and it updates as you decide each match.'
                    : 'Shown under past tournaments, with its winner.'}
                {selected.prize ? ` Prize: ${selected.prize}.` : ''}
              </p>
            </div>

            <div className="trn-visibility-acts">
              {selected.status !== 'live' && (
                <form action={status}>
                  <input type="hidden" name="id" value={selected.id} />
                  <input type="hidden" name="status" value="live" />
                  <button className="btn btn-primary btn-sm" type="submit">
                    {selected.status === 'draft' ? 'Publish now' : 'Reopen'}
                  </button>
                </form>
              )}
              {selected.status === 'live' && (
                <>
                  <Link className="btn btn-quiet btn-sm" href="/tournaments">
                    View page
                  </Link>
                  <form action={status}>
                    <input type="hidden" name="id" value={selected.id} />
                    <input type="hidden" name="status" value="draft" />
                    <button className="btn btn-quiet btn-sm" type="submit">
                      Unpublish
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Keyed on the id so switching brackets remounts the editor with the
              new one rather than carrying the previous bracket's state over. */}
          <AdminTournament key={selected.id} tournament={selected} onSave={save} />
        </>
      )}

      {tournaments.length > 0 && (
        <div className="admin-panel">
          <h2 className="h-section">All tournaments</h2>
          <div className="admin-list" style={{ marginTop: 14 }}>
            {tournaments.map((t) => {
              const p = tournamentProgress(t);
              return (
                <div className="admin-bonus" key={t.id} data-active={t.id === selected?.id}>
                  <span className="admin-bonus-game">
                    <Link href={`/admin/tournaments?t=${t.id}`}>{t.name}</Link>
                  </span>
                  <span className="admin-bonus-n">{t.size} players</span>
                  <span className="admin-bonus-bet">{t.status}</span>
                  <span className="admin-bonus-bet">
                    {p.champion ? p.champion.name : `${p.decided}/${p.total} played`}
                  </span>
                  <form action={remove}>
                    <input type="hidden" name="id" value={t.id} />
                    <ConfirmSubmit
                      className="admin-drop"
                      aria-label={`Delete ${t.name}`}
                      message={`Delete “${t.name}”? The bracket and every result in it go with it, and this cannot be undone.`}
                    >
                      ×
                    </ConfirmSubmit>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
