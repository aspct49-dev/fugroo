import { TournamentOverlay } from '@/components/overlay/TournamentOverlay';

/**
 * `/overlay/tournament` — add as an OBS browser source.
 *
 * `?view=stage` is the narrow side panel; the default is the full bracket.
 * `?demo=1` shows a sample eight-player draw, for positioning the source
 * before a tournament is published.
 */

export default async function TournamentOverlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { view, demo } = await searchParams;
  return <TournamentOverlay view={view === 'stage' ? 'stage' : 'bracket'} demo={demo === '1'} />;
}
