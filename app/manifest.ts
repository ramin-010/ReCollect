import type { MetadataRoute } from 'next';

/**
 * The installable app (ALWAYS_ON_SPEC 6.2, 6.7): Recollect's name, the page colours of theme v2,
 * the monochrome mark (public/icons, drawn by scratchpad/scripts/make-icons.js), and a share target
 * so a link or text shared from another app becomes a capture (/share).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Recollect',
    short_name: 'Recollect',
    description: 'Keep what you are learning alive: today’s reviews, your notes and your plan, on your laptop and phone.',
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
