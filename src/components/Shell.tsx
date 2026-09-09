'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PRIMARY_PARTNER, SOCIALS } from '@/lib/partners';
import { formatMoney } from '@/lib/format';
import { SOCIAL_LINKS } from './socials';

/**
 * Sidebar on desktop, drawer below 1024px.
 *
 * Every entry leads to something. A nav that lists nine destinations and
 * renders "nothing here yet" on six of them costs more than the features it
 * advertises, so this grows as the sections land rather than ahead of them.
 */

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/leaderboard', label: 'Leaderboard', showPot: true },
  { href: '/bonuses', label: 'Bonus offers' },
  { href: '/milestones', label: 'Wager milestones' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/bonus-hunts', label: 'Bonus hunts' },
  { href: '/giveaways', label: 'Giveaways' },
  { href: '/guess-the-balance', label: 'Guess the balance' },
  { href: '/how-it-works', label: 'How it works' },
];

export function Shell({ totalPot, children }: { totalPot: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="shell">
      <div className="shell-grid">
        <aside className="sidebar" data-open={open} id="sidebar">
          <Link href="/" className="brand" aria-label="Fugroo home">
            {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
            <img
              className="brand-wordmark"
              src="/wordmark.webp"
              alt="Fugroo"
              width={168}
              height={55}
            />
          </Link>

          <nav className="nav">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item"
                data-active={pathname === item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
                {item.showPot && <span className="nav-badge">{formatMoney(totalPot)}</span>}
              </Link>
            ))}
          </nav>

          <div className="side-divider" />

          <div className="side-foot">
            <LiveChip />

            <a
              className="side-link side-link-brand"
              href={PRIMARY_PARTNER.signupUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Play on ${PRIMARY_PARTNER.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
              <img src={PRIMARY_PARTNER.logo} alt="" aria-hidden />
            </a>

            {SOCIAL_LINKS.map(({ key, href, cta, Icon, brand }) => (
              <a
                key={key}
                className="side-link"
                href={href}
                target="_blank"
                rel="noreferrer"
                style={{ ['--brand' as string]: brand }}
              >
                <Icon aria-hidden focusable="false" />
                {cta}
              </a>
            ))}
          </div>
        </aside>

        {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden />}

        <div className="main">
          <header className="topbar">
            <button
              className="burger"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="sidebar"
            >
              <span />
              <span />
              <span />
            </button>
            <Link href="/" className="brand" style={{ padding: 0, flex: 1 }} aria-label="Fugroo home">
              {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
              <img className="brand-wordmark" src="/wordmark.webp" alt="Fugroo" height={30} />
            </Link>
            <a
              className="btn btn-primary btn-sm"
              href={PRIMARY_PARTNER.signupUrl}
              target="_blank"
              rel="noreferrer"
            >
              Play
            </a>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * PLACEHOLDER: fixed offline until Kick credentials are supplied, at which
 * point this reads the channel's real state. Cyan is the site's one signal
 * colour, so an always-on chip would spend it on nothing.
 */
function LiveChip() {
  const isLive = false;
  return (
    <a className="live-chip" data-live={isLive} href={SOCIALS.kick} target="_blank" rel="noreferrer">
      <span className="live-dot" />
      {isLive ? 'Live on Kick' : 'Offline'}
    </a>
  );
}
