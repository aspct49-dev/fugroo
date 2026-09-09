import type { Metadata } from 'next';

import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = {
  title: 'Bonus hunts',
  alternates: { canonical: '/bonus-hunts' },
};

export default function Page() {
  return (
    <Placeholder
      id="bonus-hunts"
      body="Live hunt boards while a hunt is running, and the full results once it settles. Wiring up next."
    />
  );
}
