import Link from 'next/link';

import { PRIMARY_PARTNER } from '@/lib/partners';
import { SITE } from '@/lib/site';
import { SOCIAL_LINKS } from './socials';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
            <img className="brand-wordmark" src="/wordmark.webp" alt="Fugroo" width={150} />
            <p className="footer-note">
              A community leaderboard for {PRIMARY_PARTNER.name} players signed up under the code{' '}
              {PRIMARY_PARTNER.code}. Not a casino, and not operated by {PRIMARY_PARTNER.name}.
            </p>
          </div>

          <div>
            <h4>Site</h4>
            <nav>
              <Link href="/leaderboard">Leaderboard</Link>
              <Link href="/bonuses">Bonus offers</Link>
              <Link href="/milestones">Wager milestones</Link>
              <Link href="/tournaments">Tournaments</Link>
              <Link href="/guess-the-balance">Guess the balance</Link>
              <Link href="/giveaways">Giveaways</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/legal">Legal</Link>
            </nav>
          </div>

          <div>
            <h4>Follow</h4>
            <nav>
              {SOCIAL_LINKS.map(({ key, name, href }) => (
                <a key={key} href={href} target="_blank" rel="noreferrer">
                  {name}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="footer-legal">
          <span>
            © {year} {SITE.name}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="age">18+</span>
            Gambling carries real financial risk. Play only what you can afford to lose.
          </span>
        </div>
      </div>
    </footer>
  );
}
