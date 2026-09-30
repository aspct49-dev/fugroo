import type { Metadata } from 'next';

import { CopyCode } from '@/components/CopyCode';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER, WAGER_NOTE, WAGER_WEIGHTS, VIP_TRANSFER } from '@/lib/partners';
import { pageMeta } from '@/lib/site';

export const metadata: Metadata = pageMeta({
  title: 'How it works',
  description: `How the ${PRIMARY_PARTNER.name} leaderboard is ranked, how wagers are weighted, and how the VIP transfer works.`,
  path: '/how-it-works',
});

export default function HowItWorksPage() {
  return (
    <section className="section wrap">
      <h1 className="h-page">How It Works</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Three steps from signing up to being paid, and the two rules that decide where you land.
      </p>

      <div className="grid-3" style={{ marginTop: 34 }}>
        <Step
          n="01"
          title="Open an account"
          body={`Sign up through the ${PRIMARY_PARTNER.name} link below. A casino cannot move an existing account to a different affiliate, so this has to be a new one.`}
        />
        <Step
          n="02"
          title="Play as you normally would"
          body="Everything wagered in the calendar month counts. There is no minimum, no qualifying period and nothing to opt into."
        />
        <Step
          n="03"
          title="Prizes at month end"
          body={`The board settles when the month does, and the ${PRIMARY_PARTNER.prizeTable.length} paying places are paid out of the ${formatMoney(PRIMARY_PARTNER.prizePool)} pool.`}
        />
      </div>

      <div className="card" style={{ marginTop: 34 }}>
        <h2 className="h-section">How a wager is weighted</h2>
        <p className="lede" style={{ marginTop: 12 }}>
          {WAGER_NOTE} Every game counts for something — dice included — but not every game counts
          the same, because a game you can cycle at almost no cost would otherwise climb the board
          faster than one you actually risk money on.
        </p>
        <div style={{ marginTop: 18 }}>
          {WAGER_WEIGHTS.map((w) => (
            <div className="kv" key={w.band}>
              <span>
                {w.band} — {w.note}
              </span>
              <b>{w.weight}</b>
            </div>
          ))}
        </div>

        <p className="notice" style={{ marginTop: 18 }}>
          <span className="notice-mark" aria-hidden>
            !
          </span>
          Any abuse found by {PRIMARY_PARTNER.code} or {PRIMARY_PARTNER.name} may result in your
          prize being forfeit.
        </p>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="h-section">{VIP_TRANSFER.headline}</h2>
        <p className="lede" style={{ marginTop: 12 }}>
          {VIP_TRANSFER.requirement}. {VIP_TRANSFER.reward}.
        </p>
        <div style={{ marginTop: 18 }}>
          <div className="kv">
            <span>Requirement</span>
            <b>Registered under {PRIMARY_PARTNER.code}</b>
          </div>
          <div className="kv">
            <span>Timing</span>
            <b>{VIP_TRANSFER.cadence}</b>
          </div>
          <div className="kv">
            <span>Decided by</span>
            <b>{PRIMARY_PARTNER.name}, not by us</b>
          </div>
        </div>
        {VIP_TRANSFER.isPlaceholder && <p className="pending">Exact tiers and amounts pending</p>}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
        <a
          className="btn btn-primary"
          href={PRIMARY_PARTNER.signupUrl}
          target="_blank"
          rel="noreferrer"
        >
          Play on {PRIMARY_PARTNER.name}
        </a>
        <CopyCode code={PRIMARY_PARTNER.code} />
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="step card">
      <div className="step-n">{n}</div>
      <h3 style={{ fontSize: 17, marginTop: 10 }}>{title}</h3>
      <p style={{ color: 'var(--muted)', fontSize: 14.5, margin: '8px 0 0' }}>{body}</p>
    </div>
  );
}
