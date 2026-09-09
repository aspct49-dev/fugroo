import type { Metadata } from 'next';

import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = {
  title: 'Giveaways',
  alternates: { canonical: '/giveaways' },
};

export default function Page() {
  return (
    <Placeholder
      id="giveaways"
      body="Draws for everyone playing under the code, run live on stream. Entry rules and the first draw date go here once they are set."
    />
  );
}
