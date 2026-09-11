import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';
import sharp from 'sharp';

import { PRIMARY_PARTNER, TOTAL_PRIZE_POOL } from '@/lib/partners';
import { SITE } from '@/lib/site';

/**
 * The card every shared link unfurls into.
 *
 * It matters more here than on most sites: the links that carry this one get
 * pasted into Discord, Kick panels and X, all of which render a preview, and a
 * missing image turns a `summary_large_image` card into a grey stub.
 *
 * Built from the site's own artwork — the vault the hero sits in, the wordmark
 * and the mascot — so a shared link looks like the page it opens rather than a
 * generated placard. The prize pool is the reason anyone clicks, so it is the
 * largest thing on it, and it is read from `partners.ts`: raising the pool
 * changes the share card without anyone remembering to re-cut a PNG.
 *
 * **The assets are WebP and Satori cannot read WebP.** It handles PNG and
 * JPEG, so `sharp` — already a dependency, for the same reason — converts them
 * on the way in. That also lets each one be resized to the size it is actually
 * drawn at rather than shipping a 1920px backdrop into a 1200px card.
 *
 * The conversions are memoised per process. Next caches the rendered image, so
 * this runs rarely, but on a one-core VPS "rarely" is not "never" and decoding
 * three images to answer a crawler is a waste of the only core there is.
 *
 * The finished card is re-encoded as JPEG. `ImageResponse` only emits PNG, and
 * PNG on a photographic backdrop came out at 950KB — several times what the
 * same picture costs as JPEG, for a file every Discord unfurl fetches again.
 */

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';

const CYAN = '#22d3ff';

const cache = new Map<string, string>();

/**
 * One asset, converted and inlined.
 *
 * JPEG where there is no transparency to keep and PNG where there is: the
 * backdrop as a PNG is several times the size for no visible gain, and the
 * wordmark as a JPEG loses the cut-out it exists for.
 */
async function asset(
  file: string,
  width: number,
  format: 'png' | 'jpeg' = 'png',
): Promise<string> {
  const key = `${file}@${width}.${format}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const raw = await readFile(path.join(process.cwd(), 'public', file));
  const pipeline = sharp(raw).resize({ width, withoutEnlargement: true });
  const out =
    format === 'jpeg' ? await pipeline.jpeg({ quality: 78 }).toBuffer() : await pipeline.png().toBuffer();
  const uri = `data:image/${format};base64,${out.toString('base64')}`;
  cache.set(key, uri);
  return uri;
}

export default async function Image(): Promise<Response> {
  const [vault, wordmark, mascot, ace] = await Promise.all([
    asset('hero-vault.webp', 1200, 'jpeg'),
    asset('wordmark.webp', 520),
    asset('mascot.webp', 560),
    asset('prop-ace.webp', 150),
  ]);

  const png = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
        {/* eslint-disable @next/next/no-img-element -- Satori renders these itself */}
        <img src={vault} alt="" width={1200} height={676} style={{ position: 'absolute', top: -20, left: 0 }} />

        {/* The room is busy on the right, where the mascot goes, and the copy
            needs a quiet ground on the left. One gradient does both. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(100deg, rgba(3,5,18,0.96) 0%, rgba(3,5,18,0.88) 42%, rgba(3,5,18,0.35) 72%, rgba(3,5,18,0.55) 100%)',
          }}
        />

        <img
          src={mascot}
          alt=""
          width={560}
          height={379}
          style={{ position: 'absolute', right: 8, bottom: 0 }}
        />
        <img
          src={ace}
          alt=""
          width={150}
          height={187}
          style={{ position: 'absolute', right: 470, top: 52, transform: 'rotate(-16deg)' }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 0 0 72px',
            width: 700,
            color: '#fff',
          }}
        >
          <img src={wordmark} alt={SITE.name} width={420} height={138} />

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 18 }}>
            <div style={{ display: 'flex', fontSize: 104, fontWeight: 800, lineHeight: 1, color: CYAN }}>
              ${TOTAL_PRIZE_POOL.toLocaleString('en-US')}
            </div>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, lineHeight: 1 }}>monthly</div>
          </div>

          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, marginTop: 4 }}>
            {PRIMARY_PARTNER.name} wager leaderboard
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 30 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 26,
                padding: '10px 22px',
                borderRadius: 999,
                border: `2px solid ${CYAN}`,
                color: CYAN,
                letterSpacing: 2,
              }}
            >
              CODE {PRIMARY_PARTNER.code.toUpperCase()}
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: '#9fb0d8' }}>
              Ten paying places
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      'content-type': contentType,
      // Next caches the route itself; this is for whatever sits in front.
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
