import { NextResponse, type NextRequest } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function pick(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Evento de Wompi: SHA256(valores de signature.properties + timestamp + secreto de eventos) */
export async function POST(req: NextRequest) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  const admin = supabaseAdmin();
  if (!secret || !admin) return NextResponse.json({ error: 'not configured' }, { status: 503 });

  const event = await req.json().catch(() => null);
  const props: string[] = event?.signature?.properties;
  const given = String(event?.signature?.checksum || req.headers.get('x-event-checksum') || '').toLowerCase();
  if (!event || !Array.isArray(props) || !event.timestamp || !given) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const concatenated = props.map((p) => String(pick(event.data, p) ?? '')).join('') + String(event.timestamp) + secret;
  const expected = createHash('sha256').update(concatenated).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  if (event.event === 'transaction.updated') {
    const tx = event.data?.transaction;
    if (tx?.reference?.startsWith('VDL-')) {
      const { data, error } = await admin.rpc('apply_subscription_payment', {
        p_reference: tx.reference,
        p_tx_id: String(tx.id),
        p_status: String(tx.status),
        p_amount_in_cents: Number(tx.amount_in_cents),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, result: data });
    }
  }
  return NextResponse.json({ ok: true });
}
