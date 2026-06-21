import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hatid Dok',
    short_name: 'Hatid Dok',
    description: 'AI-powered prescription and lab result reader in Bisaya',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1A3AF5',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}