'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { uploadImage, removeImage } from '@/lib/images';
import { useBiz } from '@/components/BizProvider';
import { useToast } from '@/components/Toast';
import { errorText, toInt } from '@/lib/format';

const BRAND_COLORS = ['#b8155a', '#1d1a2b', '#c2410c', '#0f766e', '#1d4ed8', '#7c3aed', '#a16207', '#be123c', '#3f6212', '#9d174d'];
const handle = (s: string) => s.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, '').replace(/\/.*$/, '');

export default function Tienda() {
  const { biz, plan, refresh } = useBiz();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState(biz.brand_color || '#b8155a');
  const [logo, setLogo] = useState(biz.logo_url);
  const [cover, setCover] = useState(biz.cover_url);
  const [uploading, setUploading] = useState<'' | 'logo' | 'cover'>('');
  const logoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/t/${biz.slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado. Pégalo en tu bio de TikTok e Instagram.');
    } catch {
      toast('Tu navegador no dejó copiar', 'error');
    }
  }
  async function pickImage(kind: 'logo' | 'cover', files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setUploading(kind);
    try {
      const u = await uploadImage(biz.id, f, kind === 'logo' ? 512 : 1800);
      const { error } = await supabaseBrowser().from('businesses').update(kind === 'logo' ? { logo_url: u } : { cover_url: u }).eq('id', biz.id);
      if (error) throw error;
      removeImage(kind === 'logo' ? logo : cover);
      kind === 'logo' ? setLogo(u) : setCover(u);
      await refresh();
      toast(kind === 'logo' ? 'Logo actualizado' : 'Portada actualizada');
    } catch (e: any) {
      toast(errorText(e), 'error');
    }
    setUploading('');
  }
  async function clearImage(kind: 'logo' | 'cover') {
    const { error } = await supabaseBrowser().from('businesses').update(kind === 'logo' ? { logo_url: null } : { cover_url: null }).eq('id', biz.id);
    if (error) return toast(errorText(error), 'error');
    removeImage(kind === 'logo' ? logo : cover);
    kind === 'logo' ? setLogo(null) : setCover(null);
    refresh();
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ig = handle(String(fd.get('instagram') || ''));
    const tt = handle(String(fd.get('tiktok') || ''));
    if ((ig && !/^[A-Za-z0-9._]{1,40}$/.test(ig)) || (tt && !/^[A-Za-z0-9._]{1,40}$/.test(tt))) return toast('Escribe solo el usuario de Instagram o TikTok, sin espacios', 'error');
    setBusy(true);
    const { error } = await supabaseBrowser()
      .from('businesses')
      .update({
        store_enabled: !!fd.get('store_enabled'),
        store_tagline: String(fd.get('store_tagline') || '').trim() || null,
        store_about: String(fd.get('store_about') || '').trim() || null,
        default_shipping: toInt(String(fd.get('default_shipping'))),
        payment_key: String(fd.get('payment_key') || '').trim() || null,
        brand_color: color,
        instagram: ig || null,
        tiktok: tt || null,
      })
      .eq('id', biz.id);
    setBusy(false);
    if (error) return toast(errorText(error), 'error');
    await refresh();
    toast('Tienda actualizada');
  }

  return (
    <>
      <h2>Mi tienda en línea</h2>
      {plan === 'free' && <Link href="/app/plan" className="notice" style={{ textDecoration: 'none' }}>La tienda en línea está pausada en el plan Gratis. Activa el plan Emprendedor para recibir pedidos.</Link>}
      <div className="dash">
        <section className="card">
          <b>Tu link para la bio</b>
          <span className="muted tiny" style={{ wordBreak: 'break-all' }}>{url}</span>
          <div className="grid2">
            <button className="btn" onClick={copy}>Copiar link</button>
            <Link className="btn primary" href={`/t/${biz.slug}`} target="_blank">Ver mi tienda</Link>
          </div>
          <small className="muted">Tu clienta elige talla y color, y el pedido te llega a WhatsApp y a Pedidos con el stock apartado.</small>
        </section>

        <section className="card">
          <h3>Imagen de tu marca</h3>
          <div className="media-row">
            {logo ? <img src={logo} alt="Logo" className="prev" /> : <span className="prev" style={{ display: 'grid', placeItems: 'center', background: color, color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>{biz.name.slice(0, 1).toUpperCase()}</span>}
            <div className="grow"><b>Logo</b><div className="muted tiny">Cuadrado, se ve en la cabecera de la tienda.</div></div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn small" disabled={!!uploading} onClick={() => logoInput.current?.click()}>{uploading === 'logo' ? 'Subiendo…' : logo ? 'Cambiar' : 'Subir'}</button>
              {logo && <button className="icon-btn" aria-label="Quitar logo" onClick={() => clearImage('logo')}>✕</button>}
            </div>
          </div>
          <div className="media-row">
            {cover ? <img src={cover} alt="Portada" className="prev wide" /> : <span className="prev wide" style={{ background: `linear-gradient(135deg, ${color}, #1d1a2b)` }} />}
            <div className="grow"><b>Portada</b><div className="muted tiny">Horizontal: una foto de tus prendas o de tu marca.</div></div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn small" disabled={!!uploading} onClick={() => coverInput.current?.click()}>{uploading === 'cover' ? 'Subiendo…' : cover ? 'Cambiar' : 'Subir'}</button>
              {cover && <button className="icon-btn" aria-label="Quitar portada" onClick={() => clearImage('cover')}>✕</button>}
            </div>
          </div>
          <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => pickImage('logo', e.target.files)} />
          <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => pickImage('cover', e.target.files)} />
        </section>
      </div>

      <form className="card" onSubmit={save}>
        <label className="switch"><span>Recibir pedidos en línea</span><input name="store_enabled" type="checkbox" defaultChecked={biz.store_enabled} /></label>
        <div className="field">
          <span>Color de tu marca</span>
          <div className="swatches">
            {BRAND_COLORS.map((c) => (
              <button type="button" key={c} className="swatch" style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={color.toLowerCase() === c} onClick={() => setColor(c)} />
            ))}
            <label className="swatch" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', position: 'relative', overflow: 'hidden' }} aria-label="Otro color">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            </label>
          </div>
        </div>
        <div className="grid2">
          <label className="field"><span>Frase corta</span><input id="st-tagline" name="store_tagline" maxLength={120} defaultValue={biz.store_tagline || ''} placeholder="Ropa y accesorios · envíos en Bogotá" /></label>
          <label className="field"><span>Valor del domicilio</span><input id="st-ship" name="default_shipping" inputMode="numeric" defaultValue={biz.default_shipping} /></label>
        </div>
        <label className="field"><span>Sobre tu marca</span><textarea id="st-about" name="store_about" maxLength={400} defaultValue={biz.store_about || ''} placeholder="Quiénes son, qué venden, tiempos de entrega, cambios" /></label>
        <div className="grid2">
          <label className="field"><span>Instagram</span><input id="st-ig" name="instagram" defaultValue={biz.instagram || ''} placeholder="@tumarca" /></label>
          <label className="field"><span>TikTok</span><input id="st-tt" name="tiktok" defaultValue={biz.tiktok || ''} placeholder="@tumarca" /></label>
        </div>
        <label className="field"><span>Dónde te pagan</span><input id="st-pay" name="payment_key" maxLength={80} defaultValue={biz.payment_key || ''} placeholder="Nequi 300 123 4567 o llave Bre-B" /><small>Se le muestra a la clienta cuando hace el pedido y en los cobros por WhatsApp.</small></label>
        <button className="btn primary block" disabled={busy}>Guardar</button>
      </form>
      {!biz.phone && <div className="notice">Agrega tu WhatsApp en <Link href="/app/ajustes">Ajustes</Link> para que los pedidos de la tienda te lleguen.</div>}
    </>
  );
}
