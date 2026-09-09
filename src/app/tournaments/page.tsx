import type { Metadata } from 'next';

import { Bracket } from '@/components/Bracket';
import { PageBanner } from '@/components/PageBanner';
import { PRIMARY_PARTNER } from '@/lib/partners';
import {
  activeTournament,
  publicTournaments,
  tournamentProgress,
  type Tournament,
} from '@/lib/tournaments';

/**
 * Tournaments, as everyone else sees them.
 *
 * Read-only, and the same `Bracket` component the admin edits — so what is on
 * screen here is the bracket, not a second rendering of it that could disagree.
 *
 * The empty state says there is no tournament running rather than showing an
 * empty draw. The same rule as the leaderboard: a bracket full of blank names
 * reads as a real event nobody entered.
 */

// A bracket moves match by match while an event runs on stream, so nothing
// here is cached — a stale round is worse than a slow page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tournaments',
  description: `Head-to-head slot tournaments for the ${PRIMARY_PARTNER.name} community, run live on stream.`,
  alternates: { canonical: '/tournaments' },
};

export default async function TournamentsPage() {
  const [featured, all] = await Promise.all([activeTournament(), publicTournaments()]);
  const past = all.filter((t) => t.id !== featured?.id);

  return (
    <>
      <PageBanner title="Tournaments" />

      <section className="section wrap">
        {featured ? (
          <article className="trn">
            <header className="trn-head">
              <div>
                <h2 className="h-section">{featured.name}</h2>
                <p className="trn-meta">
                  {featured.size} players
                  {featured.prize ? ` · ${featured.prize}` : ''}
                  {' · '}
                  {featured.status === 'live' ? 'Running now' : 'Finished'}
                </p>
              </div>
              <TrophyLine tournament={featured} />
            </header>

            <Bracket matches={featured.matches} />
          </article>
        ) : (
          <div className="hunt-empty card">
            <h2 className="h-section">No tournament running</h2>
            <p className="lede" style={{ marginTop: 12 }}>
              Tournaments are head-to-head slot battles run live on stream — two players, one slot
              each, highest multiple advances. When a bracket goes up it appears here and fills in
              round by round as the matches are played.
            </p>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="section wrap">
          <div className="section-head">
            <h2 className="h-section">Past tournaments</h2>
            <p>{past.length} finished</p>
          </div>

          <div className="trn-history">
            {past.map((t) => {
              const p = tournamentProgress(t);
              return (
                <article className="trn-past" key={t.id}>
                  <div className="trn-past-head">
                    <h3>{t.name}</h3>
                    <span className="trn-past-date">
                      {new Date(t.completedAt ?? t.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="trn-past-grid">
                    <div>
                      <span className="hunt-k">Players</span>
                      <b>{t.size}</b>
                    </div>
                    <div>
                      <span className="hunt-k">Prize</span>
                      <b>{t.prize || '—'}</b>
                    </div>
                    <div>
                      <span className="hunt-k">Winner</span>
                      <b>{p.champion?.name ?? 'Unfinished'}</b>
                    </div>
                    <div>
                      <span className="hunt-k">Winning slot</span>
                      <b>{p.champion?.slot || '—'}</b>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

/** The champion line, or nothing at all while the bracket is still running. */
function TrophyLine({ tournament }: { tournament: Tournament }) {
  const { champion, decided, total } = tournamentProgress(tournament);

  if (!champion) {
    return (
      <p className="trn-progress">
        {decided} of {total} matches played
      </p>
    );
  }

  return (
    <p className="trn-champ">
      <span>Winner</span>
      <b>{champion.name}</b>
      {champion.slot && <i>{champion.slot}</i>}
    </p>
  );
}
