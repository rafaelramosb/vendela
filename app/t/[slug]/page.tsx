import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabasePublic } from '@/lib/supabase/server';
import { ToastProvider } from '@/components/Toast';
import { StoreClient } from './StoreClient';

export const revalidate = 0;

async function getStore(slug: string) {
  const { data } = await supabasePublic().rpc('get_store', { p_slug: slug });
  return data as any;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await getStore(params.slug);
  if (!s) return { title: 'Tienda no encontrada' };
  return { title: s.name, description: s.tagline || `Catálogo de ${s.name}. Pide por WhatsApp.`, robots: { index: true } };
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const store = await getStore(params.slug);
  if (!store) notFound();
  return (
    <ToastProvider>
      <StoreClient store={store} />
    </ToastProvider>
  );
}
