import Link from 'next/link';

import { getSection } from '@/lib/sections';
import { CardArt } from './CardArt';

/**
 * A section that is designed but not yet running.
 *
 * It states plainly what the section will be and offers the two things that
 * are live right now, rather than dressing an empty page up as a countdown to
 * something unspecified. An empty screen is an invitation to act, so this one
 * ends with somewhere to go.
 */
export function Placeholder({ id, body }: { id: string; body: string }) {
  const section = getSection(id);
  if (!section) return null;

  return (
    <section className="section wrap">
      <div className="hold" style={{ ['--hue' as string]: section.hue }}>
        <span className="hold-bloom" aria-hidden />

        <div className="hold-art" aria-hidden>
          <CardArt id={section.id} />
        </div>

        <div className="hold-copy">
          <span className="hold-tag">Not open yet</span>
          <h1 className="h-page">{section.label}</h1>
          <p className="lede" style={{ marginTop: 14 }}>
            {body}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
            <Link className="btn btn-primary" href="/leaderboard">
              View leaderboard
            </Link>
            <Link className="btn btn-quiet" href="/">
              Back home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
