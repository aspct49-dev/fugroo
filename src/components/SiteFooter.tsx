import Link from 'next/link';

import { PRIMARY_PARTNER } from '@/lib/partners';
import { SITE } from '@/lib/site';
import { SOCIAL_LINKS } from './socials';

/**
 * The foot of every page: who this is, what it is not, and where to go next.
 *
 * Three bands. The mark and the small print on the left, two short columns of
 * links beside it, and a rule with the year and the policies under all of it.
 * The links are a convenience rather than the way around the site — the rail
 * is on every page — so this lists the five destinations people actually come
 * back for instead of repeating the nav in full. A footer that reprints
 * everything is the one nobody reads.
 *
 * The responsible-gambling line sits with the disclaimer rather than in the
 * bottom rule, because those two sentences are the same point made twice: this
 * is not a casino, and what it points at costs real money.
 */

/** The five worth a second entry point. The rail carries the rest. */
const EXPLORE = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/bonuses', label: 'Bonus Offers' },
  { href: '/milestones', label: 'Wager Milestones' },
  { href: '/vip-transfer', label: 'VIP Transfer' },
  { href: '/how-it-works', label: 'How It Works' },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
            <img className="footer-wordmark" src="/wordmark.webp" alt={SITE.name} width={190} />

            <div className="footer-marks">
              <span className="age">18+</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- GambleAware mark */}
              <img
                className="footer-aware"
                src="/gambleaware.png"
                alt="GambleAware"
                width={163}
                height={24}
              />
            </div>

            <p className="footer-note">
              We take no responsibility for losses at any casino linked or promoted here. You are
              responsible for your own bets. {SITE.name} is a community leaderboard for{' '}
              {PRIMARY_PARTNER.name} players under the code {PRIMARY_PARTNER.code} — not a casino,
              and not operated by {PRIMARY_PARTNER.name}.
            </p>
          </div>

          <nav className="footer-col" aria-label="Explore">
            <h4>Explore</h4>
            {EXPLORE.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>

          <nav className="footer-col" aria-label="Social media">
            <h4>Social Media</h4>
            {SOCIAL_LINKS.map(({ key, name, href, Icon, brand }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                style={{ ['--brand' as string]: brand }}
              >
                <Icon aria-hidden focusable="false" />
                {name}
              </a>
            ))}
          </nav>
        </div>

        <div className="footer-legal">
          <span>
            © {year} {SITE.name} — All rights reserved.
          </span>
          <nav className="footer-policies" aria-label="Policies">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
