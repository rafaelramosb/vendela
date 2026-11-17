import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStore } from '@/lib/store';
import { ProductView } from '@/components/store/ProductView';
import { money } from '@/lib/format';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string; id: string } }): Promise<Metadata> {
  const s = await getStore(params.slug);
  const p = s?.products?.find((x) => x.id === params.id);
  if (!s || !p) return { title: 'Producto no disponible' };
  const description = `${money(p.price)} · ${p.description || `Disponible en ${s.name}`}`;
  return {
    title: { absolute: `${p.name} · ${s.name}` },
    description,
    openGraph: { title: `${p.name} · ${money(p.price)}`, description, images: p.images[0] ? [p.images[0]] : undefined },
  };
}

export default async function ProductPage({ params }: { params: { slug: string; id: string } }) {
  const s = await getStore(params.slug);
  const p = s?.products?.find((x) => x.id === params.id);
  if (!p) notFound();
  return <ProductView product={p} />;
}
