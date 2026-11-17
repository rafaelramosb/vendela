'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { effectivePlan, type Plan } from '@/lib/format';

export type Business = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  city: string;
  store_tagline: string | null;
  store_enabled: boolean;
  default_shipping: number;
  payment_key: string | null;
  plan: string;
  trial_ends_at: string;
  paid_until: string | null;
  created_at: string;
};

type Ctx = { biz: Business; plan: Plan; email: string; refresh: () => Promise<void> };
const BizCtx = createContext<Ctx | null>(null);

export function BizProvider({ initial, email, children }: { initial: Business; email: string; children: React.ReactNode }) {
  const [biz, setBiz] = useState<Business>(initial);
  const refresh = useCallback(async () => {
    const { data } = await supabaseBrowser().from('businesses').select('*').eq('id', biz.id).single();
    if (data) setBiz(data as Business);
  }, [biz.id]);
  return <BizCtx.Provider value={{ biz, plan: effectivePlan(biz), email, refresh }}>{children}</BizCtx.Provider>;
}

export function useBiz() {
  const v = useContext(BizCtx);
  if (!v) throw new Error('useBiz fuera de BizProvider');
  return v;
}
