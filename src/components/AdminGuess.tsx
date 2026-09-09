import { formatMoney } from '@/lib/format';
import { rankGuesses, type Game } from '@/lib/guesses';
import { huntStats, type Hunt } from '@/lib/hunts';

/**
 * Running a guess-the-balance round.
 *
 * Three moves in order: open it against a hunt, close entries, then draw. The
 * draw is the only one that carries a figure, and where the round was opened
 * against a hunt the field is pre-filled with what that hunt has actually
 * returned — the number is already known, so making someone read it off
 * another page and retype it is just an opportunity to fat-finger it.
 */
export function AdminGuess({
  game,
  games,
  hunts,
  onCreate,
  onStatus,
  onDraw,
  onDelete,
}: {
  game: Game | undefined;
  games: Game[];
  hunts: Hunt[];
  onCreate: (form: FormData) => Promise<void>;
  onStatus: (form: FormData) => Promise<void>;
  onDraw: (form: FormData) => Promise<void>;
  onDelete: (form: FormData) => Promise<void>;
}) {
  const linked = game?.huntId ? hunts.find((h) => h.id === game.huntId) : undefined;
  const suggested = linked ? huntStats(linked).returned : undefined;
  /*
   * One shape for the list, whether the round has been drawn or not. Mapping
   * over `ranked.length ? ranked : game.guesses` produced a union of two array
   * types that TypeScript could not narrow per-item, and reaching for `place`
   * on it was the error.
   */
  const ranked = game ? rankGuesses(game) : [];
  const rows: { userId: string; username: string; value: number; place: number; offBy: number | null }[] =
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
            <input name="name" placeholder="Friday night hunt" required />
          </label>
          <label className="field">
            <span>Start balance</span>
            <input name="startBalance" type="number" step="0.01" min="0.01" placeholder="2000" required />
          </label>
          <label className="field">
            <span>Bonuses</span>
            <input name="numBonuses" type="number" min="0" step="1" placeholder="7" />
          </label>
          <label className="field">
            <span>Link to hunt</span>
            <select name="huntId" defaultValue="">
              <option value="">None</option>
              {hunts.map((h) => (
                <option value={h.id} key={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary btn-sm" type="submit">
            Open
          </button>
        </form>
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
              <span>
                Final balance
                {suggested !== undefined && <> · hunt returned {formatMoney(suggested)}</>}
              </span>
              <input
                name="finalBalance"
                type="number"
                step="0.01"
                min="0"
                placeholder="2500.00"
                defaultValue={game.finalBalance ?? suggested ?? ''}
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
                  <span className="admin-bonus-game">{g.username}</span>
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
                  <button className="admin-drop" type="submit" aria-label={`Delete ${g.name}`}>
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
