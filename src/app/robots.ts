import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    /*
     * None of these is any use to a crawler. `/profile` is one person's own
     * page and was missing from this list; `/api` answers only to a signed-in
     * admin and has no business in an index either way.
     *
     * The pages also carry `robots: noindex` themselves — this file keeps them
     * from being fetched, that keeps them from being listed if they are found
     * some other way. Neither alone is enough.
     */
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/login', '/profile', '/api'] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
