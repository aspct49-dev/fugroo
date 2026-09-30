import { NextResponse } from 'next/server';

import { raffleOverlay } from '@/lib/overlay';

/**
 * Raffle state for the stream overlay.
 *
 * Public on purpose: an OBS browser source has no session, so this cannot be
 * gated the way `/api/admin/giveaway` is. What makes that safe is what it
 * returns — see `raffleOverlay`, which builds its reply from nothing rather
 * than trimming the admin view.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await raffleOverlay(), {
    headers: { 'cache-control': 'no-store' },
  });
}
