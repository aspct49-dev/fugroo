'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The admin panel's own navigation.
 *
 * The panel used to be one page with every tool stacked down it, which worked
 * while there were two and stopped working at four: the giveaway roller is
 * used live with a stream running and nobody wants to scroll past a bonus hunt
 * to reach it. One route per job means each is a bookmark, and the browser's
 * own history moves between them.
 *
 * Client-side only because it needs `usePathname` to mark the current tab. The
 * gating is not here — the layout redirects and every action re-checks the
 * session, which is what actually stops anyone.
 */

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/giveaway', label: 'Raffle Picker' },
  { href: '/admin/guess', label: 'Guess The Balance' },
  { href: '/admin/tournaments', label: 'Tournaments' },
  { href: '/admin/accounts', label: 'Linked Accounts' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-tabs" aria-label="Admin sections">
      {TABS.map((tab) => {
        // Overview is the panel root, so it only matches exactly; the others
        // stay lit on their own sub-paths.
        const active = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="admin-tab"
            data-active={active}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
