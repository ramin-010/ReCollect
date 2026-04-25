import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/print/', '/draw/share/', '/email/callback'],
      },
    ],
    sitemap: 'https://re-collect.in/sitemap.xml',
  };
}
