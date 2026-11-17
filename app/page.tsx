import Link from 'next/link';

export default function Landing() {
  return (
    <div className="landing">
      <header>
        <Link href="/" className="logo">
          Vende<em>la</em>
        </Link>
        <div className="row">
          <Link href="/ingresar" className="btn ghost small">Ingresar</Link>
          <Link href="/registro" className="btn primary small">Probar gratis</Link>
        </div>
      </header>

      <section className="hero-block">
        <div className="stack">
          <h1>
            Deja el cuaderno. <em>Sabe cuánto ganas.</em>
          </h1>
          <p className="lead">
            Para emprendedoras que venden por TikTok, Instagram y WhatsApp: inventario con tallas y colores, pedidos a domicilio,
            cobros por Nequi o Bre-B, gastos del mes y tu ganancia real, todo desde el celular.
          </p>
          <div className="cta">
            <Link href="/registro" className="btn primary">Empieza 30 días gratis</Link>
            <Link href="/ingresar" className="btn">Ya tengo cuenta</Link>
          </div>
          <p className="muted tiny">Sin tarjeta. Después, $ 49.900 al mes o sigue con el plan Gratis.</p>
        </div>
        <div className="phone-mock" aria-hidden="true">
          <div className="card hero">
            <h3>Gané en noviembre</h3>
            <div className="big num">$ 1.284.000</div>
            <div className="sub">Vendí $ 3.120.000 · gasté $ 640.000</div>
            <div className="bar"><i style={{ width: '78%' }} /></div>
          </div>
          <div className="tiles">
            <div className="tile"><span>Vendí hoy</span><b className="num">$ 185.000</b></div>
            <div className="tile debt"><span>Me deben</span><b className="num">$ 94.000</b></div>
          </div>
          <div className="card">
            <h3>¿Qué red me vende más?</h3>
            <div className="hbar"><span>TikTok</span><span className="track"><i style={{ width: '100%' }} /></span><b className="num">$ 1,8 M</b></div>
            <div className="hbar"><span>Instagram</span><span className="track"><i style={{ width: '45%' }} /></span><b className="num">$ 820 mil</b></div>
          </div>
        </div>
      </section>

      <section className="features">
        {[
          ['Vender en 3 toques', 'Producto, talla y color, cobrar. El inventario se descuenta solo y le mandas el comprobante por WhatsApp.'],
          ['Pedidos a domicilio', 'Nuevo, en camino, entregado. Localidad, valor del envío y quién te debe, sin perder un pedido.'],
          ['Tu tienda en la bio', 'Un link con tu catálogo. Tu clienta elige y el pedido te llega a WhatsApp y a la app, con el stock apartado.'],
          ['¿Cuánto gané?', 'Ventas menos lo que te costó la mercancía menos los gastos. Y cuánto te falta para cubrir el mes.'],
          ['Qué red te vende', 'Marca de dónde llegó cada venta y descubre si TikTok, Instagram o Facebook te paga la pauta.'],
          ['Tus datos seguros', 'Cada negocio ve solo lo suyo, con copia de seguridad diaria. Úsala en el celular o en el computador.'],
        ].map(([t, d]) => (
          <div className="card feature" key={t}>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </section>

      <section className="stack" style={{ marginTop: 48 }}>
        <h2>Un solo plan, todo incluido</h2>
        <div className="price">
          <div className="plan-card"><b>Prueba</b><span className="total">$ 0</span><span className="muted">30 días con todo, sin tarjeta.</span></div>
          <div className="plan-card on"><b>Emprendedor</b><span className="total">$ 49.900</span><span className="muted">al mes. Trimestral $ 134.700 · anual $ 449.000.</span></div>
          <div className="plan-card"><b>Gratis</b><span className="total">$ 0</span><span className="muted">20 productos y 30 ventas al mes, para siempre.</span></div>
        </div>
      </section>

      <footer>
        <span>Vendela es un producto de Virtual Business Society · vb-society.co</span>
        <span>Hecho en Colombia</span>
      </footer>
    </div>
  );
}
