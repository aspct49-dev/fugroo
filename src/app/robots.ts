import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // Neither is any use to a crawler, and /admin should not be advertised.
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/login'] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
