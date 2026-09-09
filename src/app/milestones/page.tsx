import type { Metadata } from 'next';

import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = {
  title: 'Wager milestones',
  alternates: { canonical: '/milestones' },
};

export default function Page() {
  return (
    <Placeholder
      id="milestones"
      body="Rewards that unlock as your lifetime wagered under the code climbs, separately from the monthly board. Tiers and amounts to follow."
    />
  );
}
