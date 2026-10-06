import type { MetadataRoute } from 'next';

import { pastMonths } from '@/lib/archive';
import { periodForMonth } from '@/lib/format';
import { ROUTES, SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ROUTES.map((route) => ({
    url: `${SITE.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  /* Finished boards do not change once frozen, so they are dated by the month
     they ended rather than by today. */
  const past = pastMonths(now).map((m) => ({
    url: `${SITE.url}/leaderboard/${m}`,
    lastModified: periodForMonth(m).end,
    changeFrequency: 'yearly' as const,
    priority: 0.4,
  }));

  return [...pages, ...past];
}
