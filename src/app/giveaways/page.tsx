import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { SiKick } from 'react-icons/si';

import { PageBanner } from '@/components/PageBanner';
import { TrophyIcon } from '@/components/icons';
import { auth } from '@/lib/auth';
import { enterFromSite, giveawayState } from '@/lib/giveaway';
import { formatMoney } from '@/lib/format';
import { PRIMARY_PARTNER, SOCIALS } from '@/lib/partners';
import { getProfile } from '@/lib/profiles';

// Entries land while the page is open on someone else's screen.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Giveaways',
  description: 'Live chat giveaways for everyone playing under the code.',
  alternates: { canonical: '/giveaways' },
};

export default async function GiveawaysPage() {
  const g = giveawayState();
  const session = await auth();
  const discordId = session?.user?.discordId;
  const profile = discordId ? await getProfile(discordId) : undefined;
  const entered = discordId ? g.entries.some((e) => e.userId === discordId) : false;

  async function enter() {
    'use server';
    const s = await auth();
    if (!s?.user?.discordId) return;
    const p = await getProfile(s.user.discordId);
    await enterFromSite(
      s.user.name ?? 'Player',
      s.user.discordId,
      p?.roobetUsername ?? null,
    );
    revalidatePath('/giveaways');
  }

  return (
    <>
      <PageBanner title="Giveaways" />

      <section className="section wrap">
        {g.winner ? (
          <div className="gtb-result">
            <span className="gtb-trophy" aria-hidden>
              <TrophyIcon />
            </span>
            <p className="gtb-winner">{g.winner.username} won</p>
            <p className="acct-sub" style={{ marginTop: 8 }}>
              Drawn from {g.entryCount} {g.entryCount === 1 ? 'entry' : 'entries'}
            </p>
          </div>
        ) : g.open ? (
          <div className="give">
            <header className="hunt-head">
              <div>
                <p className="hunt-status" data-status="opening">
                  Entries open
                </p>
                <h2 className="hunt-name">
                  Type <span className="give-key">{g.keyword}</span> in chat
                </h2>
              </div>
              <div className="hunt-start">
                <span className="hunt-k">Entries</span>
                <b>{g.entryCount}</b>
              </div>
            </header>

            <div className="give-ways">
              <a className="give-way" href={SOCIALS.kick} target="_blank" rel="noreferrer">
                <span className="give-way-icon" style={{ ['--brand' as string]: '#53fc18' }}>
                  <SiKick aria-hidden />
                </span>
                <span>
                  <b>In the stream chat</b>
                  <span>
                    Type {g.keyword} on Kick. Your entry is picked up automatically.
                  </span>
                </span>
              </a>

              {/* The same round, entered from here — someone on the site should
                  not have to open Kick to take part. */}
              <div className="give-way">
                <span className="give-way-icon" style={{ ['--brand' as string]: 'var(--cyan)' }}>
                  <TrophyIcon />
                </span>
                <span>
                  <b>Right here</b>
                  {!discordId ? (
                    <span>
                      <Link href="/login">Log in</Link> to enter from the site.
                    </span>
                  ) : g.gates.requireCode && !profile ? (
                    <span>
                      <Link href="/profile">Link your {PRIMARY_PARTNER.name} account</Link> to
                      enter.
                    </span>
                  ) : entered ? (
                    <span>You are in. Good luck.</span>
                  ) : (
                    <form action={enter}>
                      <button className="btn btn-primary btn-sm" type="submit">
                        Enter giveaway
                      </button>
                    </form>
                  )}
                </span>
              </div>
            </div>

            {g.gates.requireCode && (
              <p className="give-gate">
                Open to players under code <b>{PRIMARY_PARTNER.code}</b>
                {g.gates.minWagered > 0 && <> who have wagered {formatMoney(g.gates.minWagered)}+</>}
                . Link your account on <Link href="/profile">your profile</Link> so we can check.
              </p>
            )}
          </div>
        ) : (
          <div className="hunt-empty card">
            <h2 className="h-section">No giveaway running</h2>
            <p className="lede" style={{ marginTop: 12 }}>
              Giveaways run live on stream. When one opens, the keyword appears here and in chat —
              type it and you are in.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
              <a className="btn btn-primary" href={SOCIALS.kick} target="_blank" rel="noreferrer">
                Watch on Kick
              </a>
              <Link className="btn btn-quiet" href="/profile">
                Link your account
              </Link>
            </div>
          </div>
        )}

        {g.entries.length > 0 && (
          <div className="give-entries">
            <div className="section-head">
              <h2 className="h-section">In the draw</h2>
              <p>
                {g.entryCount} {g.entryCount === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <div className="give-list">
              {g.entries.map((e) => (
                <span className="give-chip" key={e.userId} data-win={g.winner?.userId === e.userId}>
                  {e.username}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
