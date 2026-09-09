import Link from 'next/link';

import { giveawayState } from '@/lib/giveaway';
import { activeGame } from '@/lib/guesses';
import { activeTournament, listTournaments, tournamentProgress } from '@/lib/tournaments';

/**
 * The panel's front page.
 *
 * Not a dashboard — a table of contents that happens to say what each tool is
 * currently doing, so "is the giveaway still open?" is answered without
 * opening it. Every figure here is one line of state; anything that needs
 * explaining belongs on the tool's own page.
 */

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const [game, tournament, tournaments] = await Promise.all([
    activeGame(),
    activeTournament(),
    listTournaments(),
  ]);
  const give = giveawayState();
  const progress = tournament ? tournamentProgress(tournament) : null;

  const cards = [
    {
      href: '/admin/giveaway',
      title: 'Giveaway picker',
      state: give.connected
        ? give.open
          ? `Open · ${give.entryCount} entries`
          : `Connected · ${give.entryCount} entries held`
        : 'Not connected',
      live: give.connected,
    },
    {
      href: '/admin/guess',
      title: 'Guess the balance',
      state: game ? `${game.name} · ${game.status} · ${game.guesses.length} guesses` : 'No round',
      live: game?.status === 'open',
    },
    {
      href: '/admin/tournaments',
      title: 'Tournaments',
      state: tournament
        ? `${tournament.name} · ${tournament.status} · ${progress?.decided}/${progress?.total} played`
        : tournaments.length
          ? `${tournaments.length} drafts`
          : 'No tournaments',
      live: tournament?.status === 'live',
    },
  ];

  return (
    <div className="admin-cards">
      {cards.map((card) => (
        <Link className="admin-card" key={card.href} href={card.href} data-live={card.live}>
          <h2>{card.title}</h2>
          <p>{card.state}</p>
        </Link>
      ))}
    </div>
  );
}
