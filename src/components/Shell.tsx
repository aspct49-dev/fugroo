'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PRIMARY_PARTNER, SOCIALS } from '@/lib/partners';
import { formatMoney } from '@/lib/format';
import { SOCIAL_LINKS } from './socials';

/**
 * A full-width bar across the top, and the nav in a rail beneath it — sidebar
 * on desktop, drawer below 1024px.
 *
 * The wordmark lives in the bar rather than at the head of the rail, so it
 * stays put when the rail slides away on a phone, and the account control has
 * somewhere to sit opposite it. That pairing is the reason for the bar: a mark
 * on one end and who you are on the other.
 *
 * Every nav entry leads to something. A nav that lists nine destinations and
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
  { href: '/giveaways', label: 'Giveaways', soon: true },
  { href: '/guess-the-balance', label: 'Guess the balance' },
  { href: '/how-it-works', label: 'How it works' },
];

/**
 * `account` is passed in rather than imported, because the shell is a client
 * component (it owns the drawer state) and the account control is a server one
 * that reads the session. Passing it as a slot keeps the session off the
 * client bundle entirely.
 */
export function Shell({
  totalPot,
  account,
  isAdmin = false,
  children,
}: {
  totalPot: number;
  account: React.ReactNode;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="shell">
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

        <Link href="/" className="brand" aria-label="Fugroo home">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
          <img className="brand-wordmark" src="/wordmark.webp" alt="Fugroo" />
        </Link>

        <div className="topbar-end">
          <a
            className="btn btn-secondary btn-sm topbar-play"
            href={PRIMARY_PARTNER.signupUrl}
            target="_blank"
            rel="noreferrer"
          >
            Play on {PRIMARY_PARTNER.name}
          </a>
          {account}
        </div>
      </header>

      <div className="shell-grid">
        <aside className="sidebar" data-open={open} id="sidebar">
          <nav className="nav">
            {/* Hiding this is a courtesy, not a control — /admin re-checks the
                session itself, and so does every action on it. */}
            {(isAdmin ? [...NAV, { href: '/admin', label: 'Admin', admin: true }] : NAV).map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-item"
                  data-admin={'admin' in item || undefined}
                  data-active={pathname === item.href}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {item.label}
                  {'showPot' in item && item.showPot && (
                    <span className="nav-badge">{formatMoney(totalPot)}</span>
                  )}
                  {'soon' in item && item.soon && <span className="nav-soon">Soon</span>}
                </Link>
              ),
            )}
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

        <div className="main">{children}</div>
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
