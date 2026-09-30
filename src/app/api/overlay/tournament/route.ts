import { NextResponse } from 'next/server';

import { tournamentOverlay } from '@/lib/overlay';

/**
 * The featured bracket for the stream overlay. Public, like the tournaments
 * page it mirrors — drafts are excluded in `activeTournament`.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await tournamentOverlay(), {
    headers: { 'cache-control': 'no-store' },
  });
}
