import type { Metadata } from 'next';

import { CopyUrl } from '@/components/CopyUrl';
import { assertAdmin } from '@/lib/admin';
import { PRIVATE_PAGE, SITE } from '@/lib/site';

/**
 * The stream overlays, and how to put them in OBS.
 *
 * The overlays themselves are public pages — an OBS browser source has no
 * session — so nothing here is secret. This is the one place that lists them,
 * with the size each was designed at and a demo link to position it by, so
 * setting up a scene does not start with guessing a URL.
 */

export const metadata: Metadata = {
  title: 'Stream Overlays',
  ...PRIVATE_PAGE,
};

const OVERLAYS = [
  {
    id: 'raffle',
    title: 'Raffle card',
    path: '/overlay/raffle',
    size: '500 × 230',
    body: 'Shows the keyword and a live entry count while a round is open, spins through the entrants when you draw, and lands on the winner at the same moment the picker does. Invisible when there is no round.',
    demos: [
      { label: 'Open', q: '?demo=open' },
      { label: 'Drawing', q: '?demo=drawing' },
      { label: 'Winner', q: '?demo=winner' },
    ],
  },
  {
    id: 'bracket',
    title: 'Tournament bracket',
    path: '/overlay/tournament',
    size: '1920 × 1080',
    body: 'The whole draw with the stage named above it and the match being played lit up. It scales itself to fit, so any size works — a full-screen scene or a smaller box.',
    demos: [{ label: 'Demo', q: '?demo=1' }],
  },
  {
    id: 'stage',
    title: 'Tournament stage panel',
    path: '/overlay/tournament?view=stage',
    size: '420 × 760',
    body: 'A narrow side panel: the stage, the road through the rounds, and this round’s matches with the live one marked. Turns into the champion card when the final is decided.',
    demos: [{ label: 'Demo', q: '&demo=1' }],
  },
];

export default async function AdminOverlaysPage() {
  /* Checked here as well as in the layout. The layout and the page render in
     parallel, so the layout's redirect does not stop this from streaming —
     measured: without this line, a signed-out request carried the whole page
     in its HTML next to the redirect. Nothing on it is secret, but every admin
     page gates itself, and this one should not be the exception. */
  await assertAdmin();

  return (
    <div className="ovl">
      <div className="card">
        <h2 className="h-section">Adding one to OBS</h2>
        <ol className="ovl-steps">
          <li>
            In your scene, <b>Sources → + → Browser</b>.
          </li>
          <li>
            Paste the URL, and set <b>Width</b> and <b>Height</b> to the size given below.
          </li>
          <li>
            Leave the custom CSS as OBS fills it in — the pages are already transparent.
          </li>
          <li>
            Use the demo link to position it, then swap to the plain URL for the stream.
          </li>
        </ol>
        <p className="acct-note">
          They update on their own every second and a half — nothing to refresh. A tournament only
          appears once it is published; drafts stay off stream.
        </p>
      </div>

      <div className="ovl-list">
        {OVERLAYS.map((o) => (
          <article key={o.id} className="card ovl-item">
            <header className="ovl-item-head">
              <h2 className="h-section">{o.title}</h2>
              <span className="ovl-size">{o.size}</span>
            </header>
            <p className="ovl-body">{o.body}</p>

            <CopyUrl url={`${SITE.url}${o.path}`} label={`${o.title} URL`} />

            <p className="ovl-demos">
              Preview:{' '}
              {o.demos.map((d, i) => (
                <span key={d.label}>
                  {i > 0 && ' · '}
                  <a href={`${o.path}${d.q}`} target="_blank" rel="noreferrer">
                    {d.label}
                  </a>
                </span>
              ))}
              {' · '}
              <a href={o.path} target="_blank" rel="noreferrer">
                Live
              </a>
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
