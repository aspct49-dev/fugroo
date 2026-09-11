import type { Metadata } from 'next';

import { SOCIALS } from './partners';

/**
 * Canonical site identity. Everything SEO-facing reads from here so the domain,
 * the name and the description are stated once.
 *
 * The URL comes from the environment because canonical tags, the sitemap and
 * Open Graph images all need an absolute origin, and it differs between local,
 * preview and production. Vercel injects VERCEL_PROJECT_PRODUCTION_URL on every
 * deploy, so production works with no configuration; set NEXT_PUBLIC_SITE_URL
 * once a custom domain is attached.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

export const SITE = {
  name: 'Fugroo',
  /** Used where the streamer rather than the site is meant. */
  handle: 'Fugroo',
  url: resolveSiteUrl(),
  description:
    'Monthly Roobet wager leaderboards. Play under code Fugroo, climb the board, and take a share of the $1,000 monthly prize pool.',
  /** Short form for Open Graph, where long descriptions get truncated. */
  tagline: 'Monthly Roobet wager leaderboards. Code FUGROO.',
  locale: 'en_GB',
} as const;

/** Every page, in the order they appear in the nav. Drives the sitemap. */
export const ROUTES = [
  { path: '/', priority: 1, changeFrequency: 'daily' as const },
  { path: '/leaderboard', priority: 0.9, changeFrequency: 'hourly' as const },
  { path: '/bonuses', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/milestones', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/vip-transfer', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/tournaments', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/raffles', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/guess-the-balance', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/how-it-works', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/legal', priority: 0.3, changeFrequency: 'yearly' as const },
];

/**
 * One page's metadata, with its social tags built from the same strings.
 *
 * Worth a helper rather than nine hand-written blocks, because Next does not
 * fill `openGraph.title` in from `title` once a parent has set one — measured,
 * not assumed. Every page was inheriting the *home page's* og:title,
 * og:description and og:url, so a link to the leaderboard shared in Discord
 * looked exactly like a link to the front page. Anything that has to be said
 * twice to be right is worth saying once here instead.
 *
 * The image has to be named here, which is the opposite of what the docs led
 * me to expect: a root `opengraph-image.tsx` is inherited only while a route
 * says nothing about `openGraph` at all. Declare the object to fix og:title,
 * and the inherited image goes with it — measured, after every page but the
 * home page came back with no card.
 */
/** The generated card at the app root. Resolved against `metadataBase`. */
const OG_IMAGE = '/opengraph-image';

export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** Route path, leading slash, no trailing slash. */
  path: string;
}): Metadata {
  const full = `${title} — ${SITE.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      locale: SITE.locale,
      url: path,
      title: full,
      description,
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: full, description, images: [OG_IMAGE] },
  };
}

/** Pages that exist for one signed-in person and nobody else. */
export const PRIVATE_PAGE: Metadata = {
  robots: { index: false, follow: false },
};

export const SOCIAL_PROFILES = [
  SOCIALS.kick,
  SOCIALS.youtube,
  SOCIALS.x,
  SOCIALS.instagram,
];
