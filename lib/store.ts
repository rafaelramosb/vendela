import { cache } from 'react';
import { supabasePublic } from './supabase/server';

export type SVariant = { id: string; size: string; color: string; stock: number };
export type SProduct = {
  id: string; name: string; category: string; price: number; description: string | null;
  images: string[]; is_new: boolean; stock: number; variants: SVariant[];
};
export type Store = {
  name: string; slug: string; phone: string | null; city?: string; tagline?: string | null; about?: string | null;
  logo?: string | null; cover?: string | null; brand_color?: string | null; instagram?: string | null; tiktok?: string | null;
  shipping?: number; enabled: boolean; payment_key_set?: boolean; products?: SProduct[];
};

export const getStore = cache(async (slug: string): Promise<Store | null> => {
  const { data } = await supabasePublic().rpc('get_store', { p_slug: slug });
  return (data as Store) || null;
});

/** Texto blanco o tinta según qué tan claro es el color de marca. */
export function brandVars(hex?: string | null): Record<string, string> {
  const c = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex! : '#b8155a';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return { '--brand': c, '--brand-ink': L > 0.45 ? '#141414' : '#ffffff' };
}
