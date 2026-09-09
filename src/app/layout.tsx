import type { Metadata } from 'next';
import { Oxanium, Outfit } from 'next/font/google';

import { LoginButton } from '@/components/LoginButton';
import { Shell } from '@/components/Shell';
import { SiteFooter } from '@/components/SiteFooter';
import { TOTAL_PRIZE_POOL } from '@/lib/partners';
import { SITE, SOCIAL_PROFILES } from '@/lib/site';
import './globals.css';
import './home.css';
import './leaderboard.css';
import './bonuses.css';

/* Two families, and each has a reason. Oxanium is angular and hexagonal, so
   it carries the hex motif of the artwork into the type and sets every
   figure on the site — its tabular numerals are why there is no third family
   for numbers. Outfit is geometric and quiet and handles everything a person
   actually reads. */
const display = Oxanium({
  weight: ['600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-oxanium',
  display: 'swap',
});
const sans = Outfit({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Monthly Roobet leaderboard`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  creator: SITE.handle,
  publisher: SITE.handle,
  alternates: { canonical: '/' },
  icons: { icon: '/icon.png', apple: '/icon.png' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
    url: '/',
    title: `${SITE.name} — Monthly Roobet leaderboard`,
    description: SITE.tagline,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — Monthly Roobet leaderboard`,
    description: SITE.tagline,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  // Gambling-adjacent content: state the audience rather than leave it implied.
  other: { rating: 'adult' },
};

/**
 * Organization and WebSite in one graph, each referencing the other by @id.
 * That is what lets a search engine attach the social profiles to the site
 * rather than treating them as two unrelated entities.
 */
function structuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        logo: `${SITE.url}/icon.png`,
        description: SITE.description,
        sameAs: SOCIAL_PROFILES,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        publisher: { '@id': `${SITE.url}/#organization` },
        inLanguage: 'en',
      },
    ],
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <script
          type="application/ld+json"
          // Serialised from a literal we control, so there is no untrusted
          // input to escape here.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
        <Shell totalPot={TOTAL_PRIZE_POOL} account={<LoginButton />}>
          {children}
          <SiteFooter />
        </Shell>
      </body>
    </html>
  );
}
