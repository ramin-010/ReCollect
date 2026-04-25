import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ReCollect — Professional Knowledge Management',
    short_name: 'ReCollect',
    description:
      'Organize, connect, and recall your thoughts with ReCollect — your professional knowledge companion for notes, ideas, and productivity.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f13',
    theme_color: '#3b83f6',
    orientation: 'portrait-primary',
    categories: ['productivity', 'utilities', 'education'],
    icons: [
      {
        src: '/logo3.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: '/logo3.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'maskable',
      },
    ],
  };
}
