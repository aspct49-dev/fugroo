import { RaffleOverlay, type RaffleDemo } from '@/components/overlay/RaffleOverlay';

/**
 * `/overlay/raffle` — add as an OBS browser source.
 *
 * `?demo=open`, `?demo=drawing` or `?demo=winner` shows sample data instead of
 * the live round, for positioning the source before a raffle is running.
 */

const DEMOS: RaffleDemo[] = ['open', 'drawing', 'winner'];

export default async function RaffleOverlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { demo } = await searchParams;
  const pick = DEMOS.find((d) => d === demo) ?? null;
  return <RaffleOverlay demo={pick} />;
}
