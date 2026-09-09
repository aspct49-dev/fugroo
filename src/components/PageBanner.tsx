import { GemBanner } from './CardArt';
import { SITE } from '@/lib/site';

/**
 * The head of a section page: the wordmark over a drifting field of gems, with
 * the page's own name under it.
 *
 * The mark is the artwork, so the h1 wraps it and the page name sits beneath —
 * which is also why the heading text is a plain element rather than a second
 * logo lockup competing with the first.
 */
export function PageBanner({ title }: { title: string }) {
  return (
    <section className="section wrap">
      <header className="page-banner">
        <GemBanner />
        <div className="page-banner-copy">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand wordmark */}
          <img className="page-banner-mark" src="/wordmark.webp" alt={SITE.name} />
          <h1 className="page-banner-title">{title}</h1>
        </div>
      </header>
    </section>
  );
}
