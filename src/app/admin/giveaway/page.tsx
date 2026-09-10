import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';

import { AdminGiveaway, type GiveawayView } from '@/components/AdminGiveaway';
import { assertAdmin } from '@/lib/admin';
import {
  clearMisses,
  closeGiveaway,
  forgetChannel,
  giveawayState,
  ingest,
  lookupChannel,
  openGiveaway,
  reset as resetGiveaway,
  roll,
  type Entry,
  type IncomingMessage,
} from '@/lib/giveaway';

/**
 * The raffle picker, on its own route.
 *
 * This is the one panel used with a stream running, which is the whole reason
 * the admin area was split: it needs to be one click away and hold still,
 * rather than sitting below whatever else was on the page.
 *
 * The chat connection is not here. It runs in the browser — `lib/kick-client`
 * — and posts what it hears to `gIngest`. Everything that decides anything is
 * still on this side of the line: the eligibility gate and the draw.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Raffle Picker' };

/** The state the panel starts from, before its own polling takes over. */
async function view(): Promise<GiveawayView> {
  const g = await giveawayState();
  return {
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
    slug: g.slug,
    live: g.live,
    avatar: g.avatar,
  };
}

export default async function AdminGiveawayPage() {
  const give = await view();

  /* Returns the outcome rather than swallowing it. A failed lookup used to be
     indistinguishable from a button nobody pressed. */
  async function gLookup(form: FormData): Promise<{ ok: boolean; error?: string }> {
    'use server';
    await assertAdmin();
    const result = await lookupChannel(String(form.get('channel') ?? ''));
    if (!result.ok) console.error('[raffle] channel lookup failed:', result.error);
    revalidatePath('/admin/giveaway');
    return result;
  }

  async function gForget() {
    'use server';
    await assertAdmin();
    await forgetChannel();
    revalidatePath('/admin/giveaway');
    revalidatePath('/raffles');
  }

  /**
   * Takes the messages the browser matched on the keyword.
   *
   * Deliberately does not revalidate: this fires every second or so while a
   * round is collecting, and re-rendering the page on each batch would fight
   * the panel's own polling for no gain.
   */
  async function gIngest(messages: IncomingMessage[]): Promise<void> {
    'use server';
    await assertAdmin();
    await ingest(messages);
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
    await closeGiveaway();
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
    const winner = await roll();
    revalidatePath('/raffles');
    return winner;
  }

  async function gReset() {
    'use server';
    await assertAdmin();
    await resetGiveaway();
    revalidatePath('/admin/giveaway');
    revalidatePath('/raffles');
  }

  async function gClearMisses() {
    'use server';
    await assertAdmin();
    await clearMisses();
    revalidatePath('/admin/giveaway');
  }

  return (
    <AdminGiveaway
      initial={give}
      onLookup={gLookup}
      onForget={gForget}
      onIngest={gIngest}
      onOpen={gOpen}
      onClose={gClose}
      onRoll={gRoll}
      onReset={gReset}
      onClearMisses={gClearMisses}
    />
  );
}
