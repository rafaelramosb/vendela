import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: ['/', '/t/'], disallow: ['/app', '/api', '/bienvenida'] }] };
}
