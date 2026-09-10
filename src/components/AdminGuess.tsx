import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { formatMoney } from '@/lib/format';
import { rankGuesses, type Game } from '@/lib/guesses';

/**
 * Running a guess-the-balance round.
 *
 * Three moves in order: open the round, close entries, then draw. The draw is
 * the only one that carries a figure.
 *
 * It used to be opened *against* a bonus hunt, so the final balance could be
 * pre-filled from what that hunt had returned. Bonus hunts were retired as a
 * section, so the figure is typed in — which is what it always was for a round
 * that had no hunt linked to it.
 */
export function AdminGuess({
  game,
  games,
  onCreate,
  onStatus,
  onDraw,
  onDelete,
}: {
  game: Game | undefined;
  games: Game[];
  onCreate: (form: FormData) => Promise<void>;
  onStatus: (form: FormData) => Promise<void>;
  onDraw: (form: FormData) => Promise<void>;
  onDelete: (form: FormData) => Promise<void>;
}) {
  /*
   * One shape for the list, whether the round has been drawn or not. Mapping
   * over `ranked.length ? ranked : game.guesses` produced a union of two array
   * types that TypeScript could not narrow per-item, and reaching for `place`
   * on it was the error.
   */
  const ranked = game ? rankGuesses(game) : [];
  const rows: {
    userId: string;
    username: string;
    avatar: string | null;
    value: number;
    place: number;
    offBy: number | null;
  }[] =
    ranked.length
      ? ranked.map((g) => ({ ...g, offBy: g.offBy }))
      : (game?.guesses ?? []).map((g, i) => ({ ...g, place: i + 1, offBy: null }));

  return (
    <>
      <div className="admin-panel">
        <h2 className="h-section">Open a guess round</h2>
        <form action={onCreate} className="admin-form">
          <label className="field">
            <span>Name</span>
            <input name="name" placeholder="Friday night round" required />
          </label>
          <label className="field">
            <span>Start balance</span>
            <input name="startBalance" type="number" step="0.01" min="0.01" placeholder="2000" required />
          </label>
          <label className="field">
            <span>Bonuses</span>
            <input name="numBonuses" type="number" min="0" step="1" placeholder="7" />
          </label>
          <button className="btn btn-primary btn-sm" type="submit">
            Open
          </button>
        </form>
        <p className="admin-note">
          Opening a round closes any round still taking guesses — the public page shows one at a
          time, so two open at once would mean one nobody can reach.
        </p>
      </div>

      {game && (
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2 className="h-section">{game.name}</h2>
            <div className="admin-actions">
              {(['open', 'closed'] as const).map((s) => (
                <form action={onStatus} key={s}>
                  <input type="hidden" name="gameId" value={game.id} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    className="btn btn-quiet btn-sm"
                    type="submit"
                    data-active={game.status === s}
                  >
                    {s === 'open' ? 'Entries open' : 'Close entries'}
                  </button>
                </form>
              ))}

              {/* Here as well as in the list below, because the list only
                  appears once there is more than one round — and the round
                  most likely to need deleting is the one just opened by
                  mistake, when it is the only one there is. */}
              <form action={onDelete}>
                <input type="hidden" name="gameId" value={game.id} />
                <ConfirmSubmit
                  className="btn btn-quiet btn-sm btn-drop"
                  message={`Delete “${game.name}”? Its ${game.guesses.length} ${
                    game.guesses.length === 1 ? 'guess' : 'guesses'
                  } go with it, and this cannot be undone.`}
                >
                  Delete round
                </ConfirmSubmit>
              </form>
            </div>
          </div>

          <p className="admin-note">
            {game.guesses.length} {game.guesses.length === 1 ? 'guess' : 'guesses'} in
            {game.status === 'drawn' && game.finalBalance !== null && (
              <> · settled on {formatMoney(game.finalBalance, { cents: true })}</>
            )}
          </p>

          <form action={onDraw} className="admin-form">
            <input type="hidden" name="gameId" value={game.id} />
            <label className="field">
              <span>Final balance</span>
              <input
                name="finalBalance"
                type="number"
                step="0.01"
                min="0"
                placeholder="2500.00"
                defaultValue={game.finalBalance ?? ''}
                required
              />
            </label>
            <button className="btn btn-secondary btn-sm" type="submit">
              {game.status === 'drawn' ? 'Redraw' : 'Draw winner'}
            </button>
          </form>

          {rows.length > 0 && (
            <div className="admin-list">
              {rows.map((g) => (
                <div className="admin-bonus" key={g.userId}>
                  <span className="admin-bonus-n">{g.place}</span>
                  {g.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Discord CDN avatar
                    <img className="admin-pfp" src={g.avatar} alt="" width={28} height={28} />
                  ) : (
                    <span className="admin-pfp admin-pfp-none" aria-hidden>
                      {g.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {/* The id, not just the name: paying someone means finding
                      them on Discord, and a display name is neither unique nor
                      stable between the draw and the payout. */}
                  <span className="admin-bonus-game">
                    {g.username}
                    <em className="admin-bonus-id">{g.userId}</em>
                  </span>
                  <span className="admin-bonus-bet">{formatMoney(g.value, { cents: true })}</span>
                  {g.offBy !== null && (
                    <span className="admin-bonus-bet">
                      off by {formatMoney(g.offBy, { cents: true })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {games.length > 1 && (
        <div className="admin-panel">
          <h2 className="h-section">All rounds</h2>
          <div className="admin-list" style={{ marginTop: 14 }}>
            {games.map((g) => (
              <div className="admin-bonus" key={g.id}>
                <span className="admin-bonus-game">{g.name}</span>
                <span className="admin-bonus-bet">{g.guesses.length} guesses</span>
                <span className="admin-bonus-bet">{g.status}</span>
                <form action={onDelete}>
                  <input type="hidden" name="gameId" value={g.id} />
                  <ConfirmSubmit
                    className="admin-drop"
                    aria-label={`Delete ${g.name}`}
                    message={`Delete “${g.name}”? Its ${g.guesses.length} ${
                      g.guesses.length === 1 ? 'guess' : 'guesses'
                    } go with it, and this cannot be undone.`}
                  >
                    ×
                  </ConfirmSubmit>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
