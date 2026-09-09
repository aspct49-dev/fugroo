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
  { path: '/tournaments', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/bonus-hunts', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/giveaways', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/guess-the-balance', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/how-it-works', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/legal', priority: 0.3, changeFrequency: 'yearly' as const },
];

export const SOCIAL_PROFILES = [
  SOCIALS.kick,
  SOCIALS.youtube,
  SOCIALS.x,
  SOCIALS.instagram,
];
