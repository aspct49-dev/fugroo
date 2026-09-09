import { BrandStrips } from '@/components/BrandStrips';
import { Hero } from '@/components/Hero';
import { Promo } from '@/components/Promo';
import { Rack } from '@/components/Rack';
import { FEATURE_CARDS, SECTION_CARDS } from '@/lib/sections';
import { getLeaderboard } from '@/lib/services/leaderboard';

// Standings are the reason people come back; a minute of cache is plenty.
export const revalidate = 60;

export default async function HomePage() {
  const board = await getLeaderboard('roobet');

  return (
    <>
      <Hero />

      {/* Standing offers, then the two ways in, then what is running this
          month, and the board last. Someone arriving cold reads it in that
          order: what do I get, where do I sign up, what else is on, and what
          am I competing for. */}
      <section className="section wrap">
        <Rack cards={FEATURE_CARDS} wide />
      </section>

      <BrandStrips />

      <section className="section wrap">
        <Rack cards={SECTION_CARDS} />
      </section>

      {/* Last thing before the footer. Someone who has read the whole page is
          the person most likely to act on the pot. */}
      <Promo board={board} />
    </>
  );
}
