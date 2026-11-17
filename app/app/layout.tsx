import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { BizProvider, type Business } from '@/components/BizProvider';
import { AppChrome } from '@/components/AppChrome';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/ingresar');
  const { data: member } = await supabase
    .from('business_members')
    .select('business_id, businesses(*)')
    .eq('user_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  const biz = (member as any)?.businesses as Business | undefined;
  if (!biz) redirect('/bienvenida');
  return (
    <ToastProvider>
      <BizProvider initial={biz} email={user.email || ''}>
        <AppChrome>{children}</AppChrome>
      </BizProvider>
    </ToastProvider>
  );
}
