import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { AdminGuess } from '@/components/AdminGuess';
import { HuntBoard } from '@/components/HuntBoard';
import { requireAdmin } from '@/lib/admin';
import { formatMoney } from '@/lib/format';
import {
  activeGame,
  createGame,
  deleteGame,
  drawGame,
  listGames,
  setGameStatus,
} from '@/lib/guesses';
import {
  addBonus,
  createHunt,
  deleteHunt,
  listHunts,
  removeBonus,
  setPayout,
  setStatus,
} from '@/lib/hunts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

/**
 * The panel.
 *
 * Every action is a server action that re-checks `requireAdmin` before it
 * touches anything. Hiding the nav item and redirecting off the page are
 * conveniences; the check inside each action is the actual control, because
 * a form post does not care what the browser was showing.
 */
async function guard() {
  const { admin } = await requireAdmin();
  if (!admin) throw new Error('Forbidden');
}

export default async function AdminPage() {
  const { session, admin } = await requireAdmin();

  // Not signed in and not an admin are different problems with different fixes.
  if (!session) redirect('/login');
  if (!admin) redirect('/');

  const [hunts, games, game] = await Promise.all([listHunts(), listGames(), activeGame()]);
  const current = hunts.find((h) => h.status !== 'settled') ?? hunts[0];

  async function create(form: FormData) {
    'use server';
    await guard();
    const name = String(form.get('name') ?? '').trim();
    const start = Number(form.get('startBalance'));
    if (!name || !Number.isFinite(start) || start <= 0) return;
    await createHunt(name, start);
    revalidatePath('/admin');
    revalidatePath('/bonus-hunts');
  }

  async function addOne(form: FormData) {
    'use server';
    await guard();
    const huntId = String(form.get('huntId'));
    const game = String(form.get('game') ?? '').trim();
    const bet = Number(form.get('bet'));
    if (!huntId || !game || !Number.isFinite(bet) || bet <= 0) return;
    await addBonus(huntId, game, bet);
    revalidatePath('/admin');
    revalidatePath('/bonus-hunts');
  }

  async function record(form: FormData) {
    'use server';
    await guard();
    const raw = String(form.get('payout') ?? '').trim();
    // Blank clears the result and puts the bonus back to unopened; 0 is a real
    // payout and must not be treated the same way.
    const payout = raw === '' ? null : Number(raw);
    if (payout !== null && !Number.isFinite(payout)) return;
    await setPayout(String(form.get('huntId')), String(form.get('bonusId')), payout);
    revalidatePath('/admin');
    revalidatePath('/bonus-hunts');
  }

  async function drop(form: FormData) {
    'use server';
    await guard();
    await removeBonus(String(form.get('huntId')), String(form.get('bonusId')));
    revalidatePath('/admin');
    revalidatePath('/bonus-hunts');
  }

  async function move(form: FormData) {
    'use server';
    await guard();
    const status = String(form.get('status')) as 'collecting' | 'opening' | 'settled';
    await setStatus(String(form.get('huntId')), status);
    revalidatePath('/admin');
    revalidatePath('/bonus-hunts');
  }

  async function remove(form: FormData) {
    'use server';
    await guard();
    await deleteHunt(String(form.get('huntId')));
    revalidatePath('/admin');
    revalidatePath('/bonus-hunts');
  }

  /* --------------------------------------------------- guess the balance */

  async function openGame(form: FormData) {
    'use server';
    await guard();
    const name = String(form.get('name') ?? '').trim();
    const start = Number(form.get('startBalance'));
    const bonuses = Number(form.get('numBonuses') || 0);
    const huntId = String(form.get('huntId') ?? '') || null;
    if (!name || !Number.isFinite(start) || start <= 0) return;
    await createGame(name, start, Number.isFinite(bonuses) ? bonuses : 0, huntId);
    revalidatePath('/admin');
    revalidatePath('/guess-the-balance');
  }

  async function gameStatus(form: FormData) {
    'use server';
    await guard();
    const status = String(form.get('status')) as 'open' | 'closed';
    await setGameStatus(String(form.get('gameId')), status);
    revalidatePath('/admin');
    revalidatePath('/guess-the-balance');
  }

  async function draw(form: FormData) {
    'use server';
    await guard();
    const final = Number(form.get('finalBalance'));
    if (!Number.isFinite(final) || final < 0) return;
    await drawGame(String(form.get('gameId')), final);
    revalidatePath('/admin');
    revalidatePath('/guess-the-balance');
  }

  async function dropGame(form: FormData) {
    'use server';
    await guard();
    await deleteGame(String(form.get('gameId')));
    revalidatePath('/admin');
    revalidatePath('/guess-the-balance');
  }

  return (
    <section className="section wrap">
      <header className="admin-head">
        <div>
          <h1 className="h-page">Admin</h1>
          <p className="lede" style={{ marginTop: 10 }}>
            Signed in as {session.user?.name}. Everything here is live the moment it is saved.
          </p>
        </div>
      </header>

      <h2 className="admin-group">Guess the balance</h2>

      <AdminGuess
        game={game}
        games={games}
        hunts={hunts}
        onCreate={openGame}
        onStatus={gameStatus}
        onDraw={draw}
        onDelete={dropGame}
      />

      <h2 className="admin-group">Bonus hunts</h2>

      <div className="admin-panel">
        <h2 className="h-section">Start a hunt</h2>
        <form action={create} className="admin-form">
          <label className="field">
            <span>Name</span>
            <input name="name" placeholder="Friday night hunt" required />
          </label>
          <label className="field">
            <span>Start balance</span>
            <input name="startBalance" type="number" step="0.01" min="0.01" placeholder="2000" required />
          </label>
          <button className="btn btn-primary btn-sm" type="submit">
            Create
          </button>
        </form>
      </div>

      {current && (
        <>
          <div className="admin-panel">
            <div className="admin-panel-head">
              <h2 className="h-section">{current.name}</h2>
              <div className="admin-actions">
                {(['collecting', 'opening', 'settled'] as const).map((s) => (
                  <form action={move} key={s}>
                    <input type="hidden" name="huntId" value={current.id} />
                    <input type="hidden" name="status" value={s} />
                    <button
                      className="btn btn-quiet btn-sm"
                      type="submit"
                      data-active={current.status === s}
                    >
                      {s === 'collecting' ? 'Collecting' : s === 'opening' ? 'Opening' : 'Settle'}
                    </button>
                  </form>
                ))}
              </div>
            </div>

            <form action={addOne} className="admin-form">
              <input type="hidden" name="huntId" value={current.id} />
              <label className="field">
                <span>Game</span>
                <input name="game" placeholder="Sweet Bonanza" required />
              </label>
              <label className="field">
                <span>Bet</span>
                <input name="bet" type="number" step="0.01" min="0.01" placeholder="4.00" required />
              </label>
              <button className="btn btn-secondary btn-sm" type="submit">
                Add bonus
              </button>
            </form>

            {current.bonuses.length > 0 && (
              <div className="admin-list">
                {current.bonuses.map((b, i) => (
                  <div className="admin-bonus" key={b.id}>
                    <span className="admin-bonus-n">{i + 1}</span>
                    <span className="admin-bonus-game">{b.game}</span>
                    <span className="admin-bonus-bet">{formatMoney(b.bet, { cents: true })}</span>

                    <form action={record} className="admin-bonus-pay">
                      <input type="hidden" name="huntId" value={current.id} />
                      <input type="hidden" name="bonusId" value={b.id} />
                      <input
                        name="payout"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="payout"
                        defaultValue={b.payout ?? ''}
                        aria-label={`Payout for ${b.game}`}
                      />
                      <button className="btn btn-quiet btn-sm" type="submit">
                        Save
                      </button>
                    </form>

                    <form action={drop}>
                      <input type="hidden" name="huntId" value={current.id} />
                      <input type="hidden" name="bonusId" value={b.id} />
                      <button className="admin-drop" type="submit" aria-label={`Remove ${b.game}`}>
                        ×
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-panel">
            <h2 className="h-section">What players see</h2>
            <div style={{ marginTop: 16 }}>
              <HuntBoard hunt={current} />
            </div>
          </div>
        </>
      )}

      {hunts.length > 1 && (
        <div className="admin-panel">
          <h2 className="h-section">All hunts</h2>
          <div className="admin-list" style={{ marginTop: 14 }}>
            {hunts.map((h) => (
              <div className="admin-bonus" key={h.id}>
                <span className="admin-bonus-game">{h.name}</span>
                <span className="admin-bonus-bet">{formatMoney(h.startBalance)}</span>
                <span className="admin-bonus-n">{h.bonuses.length} bonuses</span>
                <span className="admin-bonus-bet">{h.status}</span>
                <form action={remove}>
                  <input type="hidden" name="huntId" value={h.id} />
                  <button className="admin-drop" type="submit" aria-label={`Delete ${h.name}`}>
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
