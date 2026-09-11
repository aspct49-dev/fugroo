import { ImageResponse } from 'next/og';

import { PRIMARY_PARTNER, TOTAL_PRIZE_POOL } from '@/lib/partners';
import { SITE } from '@/lib/site';

/**
 * The card every shared link unfurls into.
 *
 * There was no `og:image` at all before this, which matters more here than on
 * most sites: the links that carry this one are pasted into Discord, Kick
 * panels and X, all of which render a preview, and a missing image turns a
 * `summary_large_image` card into a grey stub. The prize pool is the reason
 * anyone clicks, so it is the biggest thing on it.
 *
 * Drawn rather than exported, for the same reason the card artwork is: the
 * figure comes from `partners.ts`, so raising the pool changes the share card
 * without anyone remembering to re-cut a PNG.
 *
 * Placed at the app root, so every route inherits it. A route that wants its
 * own can add its own `opengraph-image` file; none currently do.
 *
 * No custom font is loaded on purpose. Fetching one at render time puts a
 * network call between a crawler and a preview, and the display face here is
 * doing a job — big, bold, legible at thumbnail size — that the built-in does
 * well enough.
 */

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const NAVY = '#05071a';
const HULL = '#0b1030';
const CYAN = '#22d3ff';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 84px',
          background: `linear-gradient(145deg, ${HULL} 0%, ${NAVY} 62%)`,
          color: '#fff',
          position: 'relative',
        }}
      >
        {/* The same lobe of light that sits behind the card artwork, so the
            share card and the site look like one thing. */}
        <div
          style={{
            position: 'absolute',
            top: -190,
            right: -150,
            width: 700,
            height: 700,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(34,211,255,0.28) 0%, rgba(34,211,255,0) 68%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26 }}>
          <div style={{ width: 14, height: 44, background: CYAN, borderRadius: 3 }} />
          <div
            style={{
              fontSize: 30,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: '#8fa0c8',
            }}
          >
            {SITE.name}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
          <div
            style={{ display: 'flex', fontSize: 152, fontWeight: 800, lineHeight: 1, color: CYAN }}
          >
            ${TOTAL_PRIZE_POOL.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>monthly</div>
        </div>

        <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, marginTop: 6 }}>
          {PRIMARY_PARTNER.name} wager leaderboard
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 40 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              padding: '12px 26px',
              borderRadius: 999,
              border: `2px solid ${CYAN}`,
              color: CYAN,
              letterSpacing: 2,
            }}
          >
            CODE {PRIMARY_PARTNER.code.toUpperCase()}
          </div>
          <div style={{ fontSize: 28, color: '#8fa0c8' }}>Ten paying places, every month</div>
        </div>
      </div>
    ),
    size,
  );
}
