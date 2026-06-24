import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MedPal',
    short_name: 'MedPal',
    description: 'AI-powered prescription and lab result reader',
    start_url: '/',
    scope: '/',
    orientation: 'portrait-primary',
    icons: [
      {
        "src": "/icons/favicon-48x48.png",
        "sizes": "48x48",
        "type": "image/png"
      },
      {
        "src": "/icons/favicon-64x64.png",
        "sizes": "64x64",
        "type": "image/png"
      },
      {
        "src": "/icons/favicon-72x72.png",
        "sizes": "72x72",
        "type": "image/png"
      },
      {
        "src": "/icons/favicon-96x96.png",
        "sizes": "96x96",
        "type": "image/png"
      },
      {
        "src": "/icons/favicon-128x128.png",
        "sizes": "128x128",
        "type": "image/png"
      },
      {
        "src": "/icons/favicon-144x144.png",
        "sizes": "144x144",
        "type": "image/png"
      },
      {
        "src": "/icons/icon-192.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/icons/icon-384.png",
        "sizes": "384x384",
        "type": "image/png"
      },
      {
        "src": "/icons/icon-512.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ],
    theme_color: "#004cff",
    background_color: "#ffffff",
    display: "standalone"
  }
}