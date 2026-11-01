import Link from 'next/link';
import { revalidatePath } from 'next/cache';

import { ConfirmSubmit } from '@/components/ConfirmSubmit';
import { assertAdmin } from '@/lib/admin';
import { boardStatus, setBoardPaused } from '@/lib/board-status';
import { formatMoney } from '@/lib/format';
import { giveawayState } from '@/lib/giveaway';
import { activeGame } from '@/lib/guesses';
import { listProfiles } from '@/lib/profiles';
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
  // Before any read. See `admin/layout.tsx` — its redirect does not stop a
  // page rendering, so every admin page gates itself.
  await assertAdmin();

  const [game, tournament, tournaments, board, under, linked] = await Promise.all([
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
    // How many linked accounts are actually playing under the code, so the
    // overview says whether anything needs looking at.
    Promise.all([listProfiles(), roster().catch(() => null)])
      .then(([profiles, r]) => ({
        total: profiles.length,
        underCode: r
          ? profiles.filter((p) => r.players.has(p.roobetUsername.toLowerCase())).length
          : 0,
      }))
      .catch(() => null),
  ]);
  const [give, status] = await Promise.all([giveawayState(), boardStatus()]);
  const progress = tournament ? tournamentProgress(tournament) : null;

  /**
   * Pauses or resumes the leaderboard.
   *
   * Takes the state to set rather than flipping whatever is current: a
   * double-click, or two admins pressing at once, would otherwise cancel each
   * other out and leave the board in the state nobody asked for.
   *
   * Revalidates the whole layout because the change shows on every page — the
   * nav badge is in the shell — and the leaderboard and home pages are cached
   * for a minute, which would otherwise keep advertising a prize after the
   * board was switched off.
   */
  async function setPause(form: FormData) {
    'use server';
    await assertAdmin();
    await setBoardPaused(form.get('paused') === '1');
    revalidatePath('/', 'layout');
  }

  const cards = [
    {
      href: '/leaderboard',
      title: 'Roobet Leaderboard',
      // The feed's own state first, because that is the thing that can be
      // broken. The counts after it only mean something once it is live.
      state: status.paused
        ? 'Paused · switched off, no prizes on offer'
        : board.error
          ? `Feed error: ${board.error}`
          : `Live · ${board.stats.players} on the board · ${formatMoney(board.stats.totalWagered)} wagered${
              under === null ? '' : ` · ${under} under the code all-time`
            }`,
      live: !status.paused && !board.error,
    },
    {
      href: '/admin/giveaway',
      title: 'Raffle Picker',
      /* No "connected" here any more, and that is not an omission. The chat
         socket lives in whichever browser has the picker open, so this page
         cannot know whether anyone is listening — only what the round says. */
      state: give.open
        ? `Collecting · ${give.entryCount} entries`
        : give.entryCount > 0
          ? `${give.entryCount} entries held`
          : 'No round',
      live: give.open,
    },
    {
      href: '/admin/accounts',
      title: 'Linked Accounts',
      state:
        linked === null
          ? 'Could not check'
          : linked.total === 0
            ? 'None linked'
            : `${linked.underCode} of ${linked.total} under the code`,
      live: linked !== null && linked.total > 0 && linked.underCode === linked.total,
    },
    {
      href: '/admin/guess',
      title: 'Guess The Balance',
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

  const since = status.since
    ? new Date(status.since).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC'
    : null;

  return (
    <>
      <form className="admin-switch" action={setPause} data-paused={status.paused || undefined}>
        <input type="hidden" name="paused" value={status.paused ? '0' : '1'} />
        <div className="admin-switch-text">
          <b>Leaderboard {status.paused ? 'paused' : 'running'}</b>
          <span>
            {status.paused
              ? `Switched off${since ? ` since ${since}` : ''}. No prizes are on offer and the site says so.`
              : 'Live on the site, with the prize pool on offer.'}
          </span>
        </div>
        <ConfirmSubmit
          className={`btn btn-sm ${status.paused ? 'btn-primary' : 'btn-secondary'}`}
          message={
            status.paused
              ? 'Resume the leaderboard? It goes live on the site straight away, counting this whole month.'
              : 'Pause the leaderboard? The site will say it is paused and stop showing the prize pool, straight away.'
          }
        >
          {status.paused ? 'Resume Leaderboard' : 'Pause Leaderboard'}
        </ConfirmSubmit>
      </form>

      <div className="admin-cards">
        {cards.map((card) => (
          <Link className="admin-card" key={card.href} href={card.href} data-live={card.live}>
            <h2>{card.title}</h2>
            <p>{card.state}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
