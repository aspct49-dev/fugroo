import Link from 'next/link';

import { formatMoney } from '@/lib/format';
import { giveawayState } from '@/lib/giveaway';
import { activeGame } from '@/lib/guesses';
import { roster } from '@/lib/roster';
import { getLeaderboard } from '@/lib/services/leaderboard';
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
  const [game, tournament, tournaments, board, under] = await Promise.all([
    activeGame(),
    activeTournament(),
    listTournaments(),
    getLeaderboard('roobet'),
    // How many accounts are under the code *at all*, not just this month. A
    // month with nobody on the board and a month with nobody under the code
    // are different problems, and only this number tells them apart.
    roster()
      .then((r) => r.players.size)
      .catch(() => null),
  ]);
  const give = giveawayState();
  const progress = tournament ? tournamentProgress(tournament) : null;

  const cards = [
    {
      href: '/leaderboard',
      title: 'Roobet leaderboard',
      // The feed's own state first, because that is the thing that can be
      // broken. The counts after it only mean something once it is live.
      state: board.error
        ? `Feed error: ${board.error}`
        : `Live · ${board.stats.players} on the board · ${formatMoney(board.stats.totalWagered)} wagered${
            under === null ? '' : ` · ${under} under the code all-time`
          }`,
      live: !board.error,
    },
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
