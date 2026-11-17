import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vendela',
    short_name: 'Vendela',
    description: 'Ventas, inventario, pedidos y ganancias de tu negocio',
    start_url: '/app',
    display: 'standalone',
    background_color: '#f5f3f8',
    theme_color: '#b8155a',
    lang: 'es-CO',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
