import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin';
import { giveawayState } from '@/lib/giveaway';

/**
 * The round's current state, for the panel to poll.
 *
 * The panel is a server-rendered page, so without this it only learns about
 * new entries when something makes it re-render. That is fine for a static
 * page and useless for a raffle: entries arrive from chat while the admin sits
 * watching the count, and a count that only moves when you click something is
 * a count nobody trusts.
 *
 * It polls even though the browser is the thing reading chat, because the
 * browser only ever sees its own view: what it heard, not what the gate
 * allowed. The entry list is the server's answer, and this is how the panel
 * asks for it.
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

  const g = await giveawayState();
  return NextResponse.json(
    {
      open: g.open,
      keyword: g.keyword,
      channel: g.channel,
      slug: g.slug,
      chatroomId: g.chatroomId,
      live: g.live,
      avatar: g.avatar,
      entries: g.entries,
      misses: g.misses,
      winner: g.winner,
      entryCount: g.entryCount,
      missCount: g.missCount,
      gates: g.gates,
    },
    // A poll response that gets cached is a poll that stops working.
    { headers: { 'cache-control': 'no-store' } },
  );
}
