import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';

import { AdminGuess } from '@/components/AdminGuess';
import { assertAdmin } from '@/lib/admin';
import { PRIVATE_PAGE } from '@/lib/site';
import { activeGame, createGame, deleteGame, drawGame, listGames, setGameStatus } from '@/lib/guesses';

/**
 * Guess the balance, on its own route.
 *
 * Standalone since bonus hunts were retired: a round is opened with its own
 * starting balance and settled with the figure the admin types in.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guess The Balance',
  ...PRIVATE_PAGE,
};

export default async function AdminGuessPage() {
  const [games, game] = await Promise.all([listGames(), activeGame()]);

  async function openGame(form: FormData) {
    'use server';
    await assertAdmin();
    const name = String(form.get('name') ?? '').trim();
    const start = Number(form.get('startBalance'));
    const bonuses = Number(form.get('numBonuses') || 0);
    const huntId = String(form.get('huntId') ?? '') || null;
    if (!name || !Number.isFinite(start) || start <= 0) return;
    await createGame(name, start, Number.isFinite(bonuses) ? bonuses : 0, huntId);
    revalidatePath('/admin/guess');
    revalidatePath('/guess-the-balance');
  }

  async function gameStatus(form: FormData) {
    'use server';
    await assertAdmin();
    const status = String(form.get('status')) as 'open' | 'closed';
    await setGameStatus(String(form.get('gameId')), status);
    revalidatePath('/admin/guess');
    revalidatePath('/guess-the-balance');
  }

  async function draw(form: FormData) {
    'use server';
    await assertAdmin();
    const final = Number(form.get('finalBalance'));
    if (!Number.isFinite(final) || final < 0) return;
    await drawGame(String(form.get('gameId')), final);
    revalidatePath('/admin/guess');
    revalidatePath('/guess-the-balance');
  }

  async function dropGame(form: FormData) {
    'use server';
    await assertAdmin();
    await deleteGame(String(form.get('gameId')));
    revalidatePath('/admin/guess');
    revalidatePath('/guess-the-balance');
  }

  return (
    <>
      <h2 className="admin-group">Guess the balance</h2>

      <AdminGuess
        game={game}
        games={games}
        onCreate={openGame}
        onStatus={gameStatus}
        onDraw={draw}
        onDelete={dropGame}
      />
    </>
  );
}
