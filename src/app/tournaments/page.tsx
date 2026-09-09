import type { Metadata } from 'next';

import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = {
  title: 'Tournaments',
  alternates: { canonical: '/tournaments' },
};

export default function Page() {
  return (
    <Placeholder
      id="tournaments"
      body="Head-to-head events run live, with their own prize pools separate from the monthly board. Format and schedule to follow."
    />
  );
}
