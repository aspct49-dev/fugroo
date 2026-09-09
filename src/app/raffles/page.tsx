import type { Metadata } from 'next';

import { Placeholder } from '@/components/Placeholder';
import { PRIMARY_PARTNER } from '@/lib/partners';

/**
 * Raffles — designed, not yet running.
 *
 * The machinery behind this is built and working: the admin panel reads Kick
 * chat, gates on the affiliate code and draws a winner. What is not settled is
 * how raffles run for people who are not in chat, so the on-site section stays
 * shut rather than opening a form that enters nobody into anything.
 *
 * `enterFromSite` in `lib/giveaway.ts` is what this page called and is left in
 * place, so opening the section again is a page, not a rebuild.
 */

export const metadata: Metadata = {
  title: 'Raffles',
  description: `Raffles for everyone playing on ${PRIMARY_PARTNER.name} under code ${PRIMARY_PARTNER.code}. Coming soon.`,
  alternates: { canonical: '/raffles' },
};

export default function RafflesPage() {
  return (
    <Placeholder
      id="raffles"
      body={`No raffles yet. When they start, every account playing under code ${PRIMARY_PARTNER.code} is entered from here — and they are drawn live on stream.`}
    />
  );
}
