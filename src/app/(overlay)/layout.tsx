import type { Metadata } from 'next';

import { FONT_VARIABLES } from '@/lib/fonts';
import '../globals.css';
import '../tournaments.css';
import './overlay.css';

/**
 * The root layout for stream overlays.
 *
 * A second root layout rather than a page inside the site's, because the
 * site's wraps everything in the top bar, the rail and the footer, and an OBS
 * browser source has to be nothing but the card — on a transparent page, so
 * the stream shows through everywhere else.
 *
 * The site's stylesheet is still loaded for its tokens: the overlays are the
 * same brand, and a second copy of the palette would be a second thing to keep
 * in step. `overlay.css` undoes the parts of it that paint a page.
 */

export const metadata: Metadata = {
  title: 'Overlay',
  robots: { index: false, follow: false },
};

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={FONT_VARIABLES}>
      <body className="ov-body">{children}</body>
    </html>
  );
}
