import { notFound } from 'next/navigation';
import { getStore, brandVars } from '@/lib/store';
import { StoreProvider } from '@/components/store/StoreProvider';
import { StoreShell, Monogram } from '@/components/store/StoreShell';
import { waLink } from '@/lib/format';
import './store.css';

export const revalidate = 0;

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const store = await getStore(params.slug);
  if (!store) notFound();
  const style = brandVars(store.brand_color) as React.CSSProperties;
  if (!store.enabled)
    return (
      <div className="st" style={style}>
        <div className="st-closed">
          <Monogram name={store.name} logo={store.logo} size={72} />
          <h1>{store.name}</h1>
          <p>Esta tienda no está recibiendo pedidos en línea por ahora.</p>
          {store.phone && <a className="st-btn st-primary" href={waLink(store.phone, `Hola ${store.name}, quiero ver tu catálogo.`)} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>}
        </div>
      </div>
    );
  return (
    <div className="st" style={style}>
      <StoreProvider store={store}>
        <StoreShell>{children}</StoreShell>
      </StoreProvider>
    </div>
  );
}
