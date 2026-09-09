import type { Metadata } from 'next';

import { Placeholder } from '@/components/Placeholder';

export const metadata: Metadata = {
  title: 'Guess the balance',
  alternates: { canonical: '/guess-the-balance' },
};

export default function Page() {
  return (
    <Placeholder
      id="guess-the-balance"
      body="Call the closing balance at the end of a session. Closest guess takes the prize. Entry rules to follow."
    />
  );
}
