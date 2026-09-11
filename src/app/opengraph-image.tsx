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

        {/* Heavier on the left than the artwork wants, because the copy has to
            win there. The right stays open for the mascot. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(100deg, rgba(3,5,18,0.97) 0%, rgba(3,5,18,0.93) 46%, rgba(3,5,18,0.42) 74%, rgba(3,5,18,0.62) 100%)',
          }}
        />

        <img
          src={mascot}
          alt=""
          width={540}
          height={366}
          style={{ position: 'absolute', right: 4, bottom: 0 }}
        />
        <img
          src={ace}
          alt=""
          width={132}
          height={165}
          style={{ position: 'absolute', right: 452, top: 44, transform: 'rotate(-16deg)' }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 0 0 76px',
            width: 700,
            color: '#fff',
          }}
        >
          {/* Says whose board this is before it says what is on it. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: CYAN }} />
            <div
              style={{
                display: 'flex',
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: 5,
                color: '#8fa0c8',
              }}
            >
              {PRIMARY_PARTNER.name.toUpperCase()} PARTNER
            </div>
          </div>

          <img src={wordmark} alt={SITE.name} width={400} height={131} style={{ marginTop: 20 }} />

          {/* Two lines rather than one wrapped paragraph: Satori's wrapping is
              not worth trusting with the only sentence on the card. */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 26 }}>
            <div style={{ display: 'flex', fontSize: 46, fontWeight: 800, color: CYAN, lineHeight: 1 }}>
              ${TOTAL_PRIZE_POOL.toLocaleString('en-US')}
            </div>
            <div style={{ display: 'flex', fontSize: 33, fontWeight: 600, lineHeight: 1 }}>
              in monthly prizes,
            </div>
          </div>
          {/* Kept short enough to hold one line at this width. The longer
              version wrapped onto a third line with one word on it. */}
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 600, marginTop: 10, color: '#dbe4ff' }}>
            ten paying places, plus rank rewards.
          </div>

          <div style={{ display: 'flex', marginTop: 34 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 27,
                fontWeight: 800,
                letterSpacing: 3,
                padding: '15px 34px',
                borderRadius: 999,
                background: CYAN,
                color: '#04223a',
              }}
            >
              CODE {PRIMARY_PARTNER.code.toUpperCase()}
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
