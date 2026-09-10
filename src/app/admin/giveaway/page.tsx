import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';

import { AdminGiveaway, type GiveawayView } from '@/components/AdminGiveaway';
import { assertAdmin } from '@/lib/admin';
import {
  clearMisses,
  closeGiveaway,
  connect,
  disconnect,
  giveawayState,
  openGiveaway,
  reset as resetGiveaway,
  roll,
  type Entry,
} from '@/lib/giveaway';

/**
 * The giveaway roller, on its own route.
 *
 * This is the one panel used with a stream running, which is the whole reason
 * the admin area was split: it needs to be one click away and hold still,
 * rather than sitting below whatever else was on the page.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Raffle Picker' };

/** The server state the panel starts from, before its own polling takes over. */
function view(): GiveawayView {
  const g = giveawayState();
  return {
    connected: g.connected,
    open: g.open,
    keyword: g.keyword,
    channel: g.channel,
    chatroomId: g.chatroomId,
    entries: g.entries,
    misses: g.misses,
    winner: g.winner,
    entryCount: g.entryCount,
    missCount: g.missCount,
    gates: g.gates,
    ephemeral: g.ephemeral,
    slug: g.slug,
    live: g.live,
    avatar: g.avatar,
    winnerMessages: g.winnerMessages,
  };
}

export default async function AdminGiveawayPage() {
  const give = view();

  /* Returns the outcome rather than swallowing it. `connect()` has always
     reported why it failed — a channel that does not exist, a socket that
     would not open — and this threw the answer away, so a failed Connect was
     indistinguishable from one nobody had pressed. */
  async function gConnect(form: FormData): Promise<{ ok: boolean; error?: string }> {
    'use server';
    await assertAdmin();
    const result = await connect(String(form.get('channel') ?? ''));
    if (!result.ok) console.error('[giveaway] connect failed:', result.error);
    revalidatePath('/admin/giveaway');
    return result;
  }

  async function gDisconnect() {
    'use server';
    await assertAdmin();
    disconnect();
    revalidatePath('/admin/giveaway');
    revalidatePath('/raffles');
  }

  async function gOpen(form: FormData) {
    'use server';
    await assertAdmin();
    const min = Number(form.get('minWagered') || 0);
    await openGiveaway(String(form.get('keyword') ?? '!enter'), {
      requireCode: form.get('requireCode') === 'on',
      minWagered: Number.isFinite(min) && min > 0 ? min : 0,
    });
    revalidatePath('/admin/giveaway');
    revalidatePath('/raffles');
  }

  async function gClose() {
    'use server';
    await assertAdmin();
    closeGiveaway();
    revalidatePath('/admin/giveaway');
    revalidatePath('/raffles');
  }

  /**
   * Draws the winner and returns it.
   *
   * Returns rather than only revalidating, because the panel's reel has to
   * know which name to stop on. Note that `/admin/giveaway` is deliberately
   * *not* revalidated: re-rendering this page mid-spin would push the winner
   * into the markup and give the result away before the reel lands. The panel
   * polls, so it catches up on its own a moment later.
   */
  async function gRoll(): Promise<Entry | null> {
    'use server';
    await assertAdmin();
    const winner = roll();
    revalidatePath('/raffles');
    return winner;
  }

  async function gReset() {
    'use server';
    await assertAdmin();
    resetGiveaway();
    revalidatePath('/admin/giveaway');
    revalidatePath('/raffles');
  }

  async function gClearMisses() {
    'use server';
    await assertAdmin();
    clearMisses();
    revalidatePath('/admin/giveaway');
  }

  return (
    <AdminGiveaway
      initial={give}
      onConnect={gConnect}
      onDisconnect={gDisconnect}
      onOpen={gOpen}
      onClose={gClose}
      onRoll={gRoll}
      onReset={gReset}
      onClearMisses={gClearMisses}
    />
  );
}
