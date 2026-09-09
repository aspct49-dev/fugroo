import { SiKick } from 'react-icons/si';

import { PRIMARY_PARTNER, SOCIALS } from '@/lib/partners';

/**
 * The two brand rows: mark on the left, one line of copy in the middle, the
 * way in on the right.
 *
 * Each call to action carries its own platform's colour rather than the site
 * accent. That is the convention in this category and it reads correctly —
 * the button belongs to Kick or to Roobet, not to us — so cyan stays reserved
 * for the things this site actually owns.
 *
 * `only` renders a single row. The leaderboard page restates the way in right
 * under the prizes, and putting the Kick row there too would be advertising
 * the stream to someone who is mid-decision about signing up.
 */
export function BrandStrips({ only }: { only?: 'kick' | 'partner' } = {}) {
  return (
    <section className="section wrap">
      <div className="strip-list">
        {only !== 'partner' && (
        <div
          className="strip"
          style={{ ['--brand' as string]: '#53fc18', ['--brand-deep' as string]: '#2f9c0c' }}
        >
          <span className="strip-mark">
            <SiKick aria-hidden focusable="false" />
          </span>
          <p className="strip-msg">
            <span className="strip-dot" />
            Watch me <b>live</b> for bonus hunts, raffles and more
          </p>
          <a className="strip-btn" href={SOCIALS.kick} target="_blank" rel="noreferrer">
            Watch live
          </a>
        </div>
        )}

        {only !== 'kick' && (
        <div
          className="strip"
          style={{ ['--brand' as string]: '#e0b83a', ['--brand-deep' as string]: '#9b7c17' }}
        >
          <span className="strip-mark strip-mark-img">
            {/* eslint-disable-next-line @next/next/no-img-element -- operator brand mark */}
            <img src={PRIMARY_PARTNER.logo} alt={PRIMARY_PARTNER.name} />
          </span>
          <p className="strip-msg">
            Register using code <b>{PRIMARY_PARTNER.code}</b> to get on the board and claim rewards
          </p>
          <a
            className="strip-btn"
            href={PRIMARY_PARTNER.signupUrl}
            target="_blank"
            rel="noreferrer"
          >
            Claim bonus
          </a>
        </div>
        )}
      </div>
    </section>
  );
}
