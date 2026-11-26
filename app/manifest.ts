import type { MetadataRoute } from 'next';

/**
 * The installable app (ALWAYS_ON_SPEC 6.2, 6.7): Kaaga's name, the page colours of theme v2,
 * the Kaaga app icon (public/icons, from the logo set: KAAGA_REBRAND_PLAN), and a share target
 * so a link or text shared from another app becomes a capture (/share).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Kaaga',
    short_name: 'Kaaga',
    description: 'One memory for all your AIs: what you learn, build and plan, brought back at the right moment.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
    orientation: 'portrait',
    categories: ['productivity', 'education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    share_target: {
      action: '/share',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
  } as MetadataRoute.Manifest;
}
