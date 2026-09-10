import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { giveawayState } from '@/lib/giveaway';

/**
 * The giveaway's current state, for the panel to poll.
 *
 * The panel is a server-rendered page, so without this it only learns about
 * new entries when something makes it re-render. That is fine for a bonus hunt
 * and useless for a giveaway: entries arrive from chat while the admin sits
 * watching the count, and a count that only moves when you click something is
 * a count nobody trusts.
 *
 * Admin-gated like everything else under `/admin`, and for the same reason —
 * the entry list carries the Roobet names the code gate matched on, which is
 * nobody else's business. The route being under `/api/admin` is naming, not
 * enforcement; the check below is the enforcement.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const { admin } = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const g = giveawayState();
  return NextResponse.json(
    {
      connected: g.connected,
      open: g.open,
      keyword: g.keyword,
      channel: g.channel,
      slug: g.slug,
      chatroomId: g.chatroomId,
      live: g.live,
      avatar: g.avatar,
      winnerMessages: g.winnerMessages,
      entries: g.entries,
      misses: g.misses,
      winner: g.winner,
      entryCount: g.entryCount,
      missCount: g.missCount,
      gates: g.gates,
      ephemeral: g.ephemeral,
    },
    // A poll response that gets cached is a poll that stops working.
    { headers: { 'cache-control': 'no-store' } },
  );
}
