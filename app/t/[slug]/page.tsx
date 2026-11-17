import type { Metadata } from 'next';
import { getStore } from '@/lib/store';
import { Catalog } from '@/components/store/Catalog';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await getStore(params.slug);
  if (!s) return { title: 'Tienda no encontrada' };
  const image = s.cover || s.products?.find((p) => p.images[0])?.images[0] || s.logo || undefined;
  const description = s.tagline || `Catálogo de ${s.name}. Elige y pide por WhatsApp.`;
  return {
    title: { absolute: s.name },
    description,
    openGraph: { title: s.name, description, images: image ? [image] : undefined, type: 'website' },
  };
}

export default function StoreHome() {
  return <Catalog />;
}
