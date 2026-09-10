import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

import { PageBanner } from '@/components/PageBanner';
import { TrophyIcon } from '@/components/icons';
import { auth } from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { activeGame, rankGuesses, submitGuess, winnerOf } from '@/lib/guesses';

// Guesses land while the page is open on someone else's screen, so the count
// and the standings are read fresh every time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guess the balance',
  description: 'Call the final balance of the hunt running on stream. Closest guess wins.',
  alternates: { canonical: '/guess-the-balance' },
};

export default async function GuessPage() {
  const [game, session] = await Promise.all([activeGame(), auth()]);
  const me = session?.user;
  const mine = me?.discordId
    ? (game?.guesses.find((g) => g.userId === me.discordId) ?? null)
    : null;

  async function guess(form: FormData) {
    'use server';
    const s = await auth();
    // Re-read the session here rather than trusting anything the form carried:
    // a hidden field naming another account would otherwise guess as them.
    if (!s?.user?.discordId) return;
    const g = await activeGame();
    if (!g) return;
    const value = Number(form.get('value'));
    if (!Number.isFinite(value) || value < 0) return;
    await submitGuess(
      g.id,
      {
        userId: s.user.discordId,
        username: s.user.name ?? 'Player',
        avatar: s.user.image ?? null,
      },
      value,
    );
    revalidatePath('/guess-the-balance');
  }

  return (
    <>
      <PageBanner title="Guess the balance" />

      <section className="section wrap">
        {!game ? (
          <div className="hunt-empty card">
            <h2 className="h-section">No round open</h2>
            <p className="lede" style={{ marginTop: 12 }}>
              When a hunt is opened on stream, a round goes up here. Call the balance it finishes
              on — the closest guess takes it.
            </p>
          </div>
        ) : (
          <GameCard game={game} mine={mine} signedIn={Boolean(me)} action={guess} />
        )}
      </section>
    </>
  );
}

function GameCard({
  game,
  mine,
  signedIn,
  action,
}: {
  game: NonNullable<Awaited<ReturnType<typeof activeGame>>>;
  mine: { value: number } | null;
  signedIn: boolean;
  action: (form: FormData) => Promise<void>;
}) {
  const ranked = rankGuesses(game);
  const winner = winnerOf(game);

  return (
    <div className="gtb">
      <header className="gtb-head">
        <div>
          <p className="hunt-status" data-status={game.status === 'open' ? 'opening' : game.status}>
            {game.status === 'open' && 'Entries open'}
            {game.status === 'closed' && 'Entries closed'}
            {game.status === 'drawn' && 'Settled'}
          </p>
          <h2 className="hunt-name">{game.name}</h2>
        </div>
        <div className="gtb-anchor">
          <div>
            <span className="hunt-k">Start balance</span>
            <b>{formatMoney(game.startBalance)}</b>
          </div>
          {game.numBonuses > 0 && (
            <div>
              <span className="hunt-k">Bonuses</span>
              <b>{game.numBonuses}</b>
            </div>
          )}
        </div>
      </header>

      {game.status === 'drawn' && winner && (
        <div className="gtb-result">
          <span className="gtb-trophy" aria-hidden>
            <TrophyIcon />
          </span>

          {/* The avatar and the Discord id together are what let the streamer
              find this person to pay them — a username can be changed between
              the draw and the payout, and two accounts can share a display
              name. The id cannot be changed and is unique. */}
          <div className="gtb-winner-who">
            {winner.avatar && (
              // eslint-disable-next-line @next/next/no-img-element -- remote Discord CDN avatar
              <img className="gtb-winner-pfp" src={winner.avatar} alt="" width={52} height={52} />
            )}
            <div>
              <p className="gtb-winner">{winner.username} won</p>
              <p className="gtb-winner-id">
                Discord ID <code>{winner.userId}</code>
              </p>
            </div>
          </div>
          <div className="gtb-result-grid">
            <div>
              <span className="hunt-k">Final balance</span>
              <b>{formatMoney(game.finalBalance ?? 0, { cents: true })}</b>
            </div>
            <div>
              <span className="hunt-k">Winning guess</span>
              <b>{formatMoney(winner.value, { cents: true })}</b>
            </div>
            <div>
              <span className="hunt-k">Off by</span>
              <b>{formatMoney(winner.offBy, { cents: true })}</b>
            </div>
          </div>
        </div>
      )}

      {game.status === 'open' && (
        <div className="gtb-entry">
          {signedIn ? (
            <>
              {mine && (
                <p className="gtb-mine">
                  Your guess is <b>{formatMoney(mine.value, { cents: true })}</b>. Sending another
                  replaces it.
                </p>
              )}
              <form action={action} className="gtb-form">
                <label className="field">
                  <span>{mine ? 'Change your guess' : 'Your guess'}</span>
                  <input
                    name="value"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="2500.00"
                    required
                  />
                </label>
                <button className="btn btn-primary btn-sm" type="submit">
                  {mine ? 'Update guess' : 'Submit guess'}
                </button>
              </form>
            </>
          ) : (
            <div className="gtb-signin">
              <p>One guess per account, so we need to know who you are.</p>
              <Link className="btn btn-primary btn-sm" href="/login">
                Log in to guess
              </Link>
            </div>
          )}
          <p className="gtb-count">
            {game.guesses.length} {game.guesses.length === 1 ? 'guess' : 'guesses'} in
          </p>
        </div>
      )}

      {game.status === 'closed' && (
        <div className="gtb-entry">
          <p className="gtb-waiting">
            Entries are closed with {game.guesses.length}{' '}
            {game.guesses.length === 1 ? 'guess' : 'guesses'} in. Waiting on the final balance.
          </p>
          {mine && (
            <p className="gtb-mine">
              Your guess was <b>{formatMoney(mine.value, { cents: true })}</b>.
            </p>
          )}
        </div>
      )}

      {/* Only worth showing once there is a result to sort against — before the
          draw the order would be arbitrary and would read as a ranking. */}
      {ranked.length > 0 && (
        <div className="gtb-table">
          <div className="gtb-row gtb-row-head" role="presentation">
            <span>#</span>
            <span>Player</span>
            <span>Guess</span>
            <span>Off by</span>
          </div>
          {ranked.slice(0, 15).map((g) => (
            <div className="gtb-row" key={g.userId} data-win={g.place === 1}>
              <span className="hunt-n">{g.place}</span>
              <span className="gtb-player">
                <span className="gtb-avatar">
                  {g.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Discord CDN avatar
                    <img src={g.avatar} alt="" width={26} height={26} />
                  ) : (
                    <span className="account-initial">{g.username.slice(0, 1).toUpperCase()}</span>
                  )}
                </span>
                {g.username}
              </span>
              <span className="hunt-bet">{formatMoney(g.value, { cents: true })}</span>
              <span className="hunt-pay">{formatMoney(g.offBy, { cents: true })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
