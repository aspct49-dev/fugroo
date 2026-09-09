import { formatMoney } from '@/lib/format';
import { huntStats, type Hunt } from '@/lib/hunts';

/**
 * A hunt in progress: the numbers that decide whether it is going well, then
 * every bonus in the order it went in.
 *
 * The two figures that matter sit together and are the point of the whole
 * page. **Break-even** is the multiple the hunt has to average to return the
 * start balance; **running** is what the opened bonuses have actually
 * averaged. One above the other tells you, at a glance, whether it is winning
 * — which is the only question anyone watching is asking.
 */
export function HuntBoard({ hunt }: { hunt: Hunt }) {
  const s = huntStats(hunt);
  const beating = s.opened > 0 && s.runningX >= s.breakEvenX;
  const done = hunt.status === 'settled';

  return (
    <div className="hunt">
      <header className="hunt-head">
        <div>
          <p className="hunt-status" data-status={hunt.status}>
            {hunt.status === 'collecting' && 'Collecting bonuses'}
            {hunt.status === 'opening' && 'Opening'}
            {hunt.status === 'settled' && 'Settled'}
          </p>
          <h2 className="hunt-name">{hunt.name}</h2>
        </div>
        <div className="hunt-start">
          <span className="hunt-k">Start balance</span>
          <b>{formatMoney(hunt.startBalance)}</b>
        </div>
      </header>

      <div className="hunt-stats">
        <div className="hunt-stat">
          <span className="hunt-k">Bonuses</span>
          <b className="hunt-v">
            {s.opened}
            <span className="hunt-of">/{s.count}</span>
          </b>
        </div>
        <div className="hunt-stat">
          <span className="hunt-k">Average bet</span>
          <b className="hunt-v">{formatMoney(s.averageBet, { cents: true })}</b>
        </div>
        <div className="hunt-stat">
          <span className="hunt-k">Break-even</span>
          <b className="hunt-v">{s.breakEvenX.toFixed(2)}×</b>
        </div>
        {/* The one that answers the question. */}
        <div className="hunt-stat hunt-stat-key" data-beating={beating}>
          <span className="hunt-k">Running at</span>
          <b className="hunt-v">{s.opened ? `${s.runningX.toFixed(2)}×` : '—'}</b>
        </div>
      </div>

      {done && (
        <p className="hunt-result" data-up={s.profit >= 0}>
          Returned {formatMoney(s.returned)} on {formatMoney(hunt.startBalance)} —{' '}
          <b>
            {s.profit >= 0 ? '+' : '−'}
            {formatMoney(Math.abs(s.profit))}
          </b>
        </p>
      )}

      {hunt.bonuses.length > 0 ? (
        <div className="hunt-table">
          <div className="hunt-row hunt-row-head" role="presentation">
            <span>#</span>
            <span>Game</span>
            <span>Bet</span>
            <span>Payout</span>
            <span>X</span>
          </div>

          {hunt.bonuses.map((b, i) => {
            const x = b.payout === null ? null : b.payout / b.bet;
            return (
              <div className="hunt-row" key={b.id} data-open={b.payout === null}>
                <span className="hunt-n">{i + 1}</span>
                <span className="hunt-game">{b.game}</span>
                <span className="hunt-bet">{formatMoney(b.bet, { cents: true })}</span>
                <span className="hunt-pay">
                  {b.payout === null ? '—' : formatMoney(b.payout, { cents: true })}
                </span>
                <span
                  className="hunt-x"
                  data-big={x !== null && x >= s.breakEvenX}
                  data-zero={x === 0}
                >
                  {x === null ? '' : `${x.toFixed(2)}×`}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="hunt-none">Bonuses appear here as they go in.</p>
      )}
    </div>
  );
}
