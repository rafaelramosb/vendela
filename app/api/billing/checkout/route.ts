import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const pub = process.env.WOMPI_PUBLIC_KEY;
  const integrity = process.env.WOMPI_INTEGRITY_SECRET;
  if (!pub || !integrity) {
    return NextResponse.json(
      { error: 'El pago en línea aún no está activo. Escríbenos por WhatsApp y te activamos el plan.' },
      { status: 503 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const months = Number(body?.months);
  if (![1, 3, 12].includes(months)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inicia sesión de nuevo' }, { status: 401 });
  const { data: member } = await supabase.from('business_members').select('business_id').eq('user_id', user.id).limit(1).maybeSingle();
  if (!member) return NextResponse.json({ error: 'No encontramos tu negocio' }, { status: 404 });

  const { data, error } = await supabase.rpc('start_subscription_payment', { p_business: member.business_id, p_months: months });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { reference, amount_in_cents } = data as { reference: string; amount_in_cents: number };

  // Firma de integridad de Wompi: SHA256(referencia + monto en centavos + moneda + secreto de integridad)
  const signature = createHash('sha256').update(`${reference}${amount_in_cents}COP${integrity}`).digest('hex');
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const url = new URL('https://checkout.wompi.co/p/');
  url.searchParams.set('public-key', pub);
  url.searchParams.set('currency', 'COP');
  url.searchParams.set('amount-in-cents', String(amount_in_cents));
  url.searchParams.set('reference', reference);
  url.searchParams.set('signature:integrity', signature);
  url.searchParams.set('redirect-url', `${origin}/app/plan?pago=1`);
  if (user.email) url.searchParams.set('customer-data:email', user.email);
  return NextResponse.json({ url: url.toString() });
}
