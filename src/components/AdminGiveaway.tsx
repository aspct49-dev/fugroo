import { formatMoney } from '@/lib/format';
import type { giveawayState } from '@/lib/giveaway';
import { PRIMARY_PARTNER } from '@/lib/partners';

/**
 * Running a chat giveaway.
 *
 * Connect to the channel, open a round with a keyword and whatever gates
 * apply, then roll. The gates are enforced on the server as each message
 * arrives — these switches decide what is checked, not whether it is checked.
 *
 * The "not eligible" list under the entries is the point of the whole panel on
 * stream: it turns "why am I not in the list?" from a guess into an answer.
 */
export function AdminGiveaway({
  g,
  onConnect,
  onDisconnect,
  onOpen,
  onClose,
  onRoll,
  onReset,
  onClearMisses,
}: {
  g: ReturnType<typeof giveawayState>;
  onConnect: (form: FormData) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onOpen: (form: FormData) => Promise<void>;
  onClose: () => Promise<void>;
  onRoll: () => Promise<void>;
  onReset: () => Promise<void>;
  onClearMisses: () => Promise<void>;
}) {
  return (
    <>
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2 className="h-section">Kick chat</h2>
          <p className="hunt-status" data-status={g.connected ? 'opening' : 'settled'}>
            {g.connected ? `Connected · chatroom ${g.chatroomId}` : 'Not connected'}
          </p>
        </div>

        <form action={onConnect} className="admin-form">
          <label className="field">
            <span>Channel</span>
            <input name="channel" defaultValue={g.channel} placeholder="fugroo" />
          </label>
          <button className="btn btn-primary btn-sm" type="submit">
            {g.connected ? 'Reconnect' : 'Connect'}
          </button>
        </form>

        {g.connected && (
          <form action={onDisconnect} style={{ marginTop: 12 }}>
            <button className="btn btn-quiet btn-sm" type="submit">
              Disconnect
            </button>
          </form>
        )}

        <p className="admin-note" style={{ marginTop: 14 }}>
          Reading chat needs no Kick credentials — the feed is public. The connection lives in this
          server process, so a redeploy mid-giveaway drops it and the entries with it.
        </p>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2 className="h-section">The round</h2>
          <p className="hunt-status" data-status={g.open ? 'opening' : 'settled'}>
            {g.open ? 'Entries open' : g.winner ? 'Drawn' : 'Closed'}
          </p>
        </div>

        <form action={onOpen} className="admin-form">
          <label className="field">
            <span>Keyword</span>
            <input name="keyword" defaultValue={g.keyword} placeholder="!enter" />
          </label>
          <label className="field field-check">
            <input
              type="checkbox"
              name="requireCode"
              defaultChecked={g.gates.requireCode}
              id="requireCode"
            />
            <label htmlFor="requireCode">Under code {PRIMARY_PARTNER.code}</label>
          </label>
          <label className="field">
            <span>Minimum wagered</span>
            <input
              name="minWagered"
              type="number"
              min="0"
              step="1"
              defaultValue={g.gates.minWagered || ''}
              placeholder="0"
            />
          </label>
          <button className="btn btn-primary btn-sm" type="submit">
            Open entries
          </button>
        </form>

        <div className="admin-actions" style={{ marginTop: 16 }}>
          <form action={onClose}>
            <button className="btn btn-quiet btn-sm" type="submit" disabled={!g.open}>
              Close entries
            </button>
          </form>
          <form action={onRoll}>
            <button className="btn btn-secondary btn-sm" type="submit" disabled={g.entryCount === 0}>
              Roll winner
            </button>
          </form>
          <form action={onReset}>
            <button className="btn btn-quiet btn-sm" type="submit">
              Reset
            </button>
          </form>
        </div>

        {g.winner && (
          <p className="admin-winner">
            Winner: <b>{g.winner.username}</b>
            {g.winner.roobet && <> · {g.winner.roobet} on {PRIMARY_PARTNER.name}</>}
          </p>
        )}
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h2 className="h-section">
            Entries <span className="admin-count">{g.entryCount}</span>
          </h2>
        </div>
        {g.entries.length ? (
          <div className="give-list">
            {g.entries.map((e) => (
              <span className="give-chip" key={e.userId} data-win={g.winner?.userId === e.userId}>
                {e.username}
                {e.roobet && <em>{e.roobet}</em>}
              </span>
            ))}
          </div>
        ) : (
          <p className="admin-note">Nobody yet.</p>
        )}
      </div>

      {g.misses.length > 0 && (
        <div className="admin-panel">
          <div className="admin-panel-head">
            <h2 className="h-section">
              Not eligible <span className="admin-count">{g.missCount}</span>
            </h2>
            <form action={onClearMisses}>
              <button className="btn btn-quiet btn-sm" type="submit">
                Clear
              </button>
            </form>
          </div>
          <div className="admin-list">
            {g.misses.map((m) => (
              <div className="admin-bonus" key={m.username}>
                <span className="admin-bonus-game">{m.username}</span>
                <span className="admin-bonus-bet">{m.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {g.gates.requireCode && g.gates.minWagered > 0 && (
        <p className="admin-note">
          Gate: under the code, {formatMoney(g.gates.minWagered)}+ wagered.
        </p>
      )}
    </>
  );
}
