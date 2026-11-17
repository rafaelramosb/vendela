import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const nextParam = url.searchParams.get('next') || '/app';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/app';
  const supabase = supabaseServer();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }
  if (ok) return NextResponse.redirect(new URL(next, url.origin));
  // El enlace se abrió en otro navegador o ya se usó: la cuenta igual quedó confirmada.
  return NextResponse.redirect(new URL('/ingresar?confirmado=1', url.origin));
}
