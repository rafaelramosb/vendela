import Link from 'next/link';

export const metadata = { title: 'Términos y tratamiento de datos' };

export default function Terminos() {
  return (
    <div className="landing" style={{ maxWidth: 720 }}>
      <header><Link href="/" className="logo">Vende<em>la</em></Link></header>
      <article className="stack">
        <h1 style={{ fontSize: 32 }}>Términos de uso y tratamiento de datos</h1>
        <p className="muted">Vendela es un servicio de Virtual Business Society S.A.S. (VBS), NIT 900969456, Colombia.</p>
        <h2>1. El servicio</h2>
        <p>Vendela te permite registrar productos, inventario, ventas, pedidos, clientas y gastos de tu negocio, y publicar un catálogo en línea. La información que registras es tuya; VBS la guarda y la protege para prestarte el servicio.</p>
        <h2>2. Prueba, planes y pagos</h2>
        <p>Tienes 30 días de prueba con todas las funciones, sin tarjeta. Al terminar pasas al plan Gratis (20 productos y 30 ventas al mes, sin tienda en línea) sin perder tus datos. El plan Emprendedor cuesta $ 49.900 al mes, $ 134.700 por tres meses o $ 449.000 al año, se paga por adelantado a través de Wompi y no se renueva automáticamente. No hay cláusula de permanencia.</p>
        <h2>3. Comprobantes y facturación</h2>
        <p>Los comprobantes de venta que genera Vendela no son facturas electrónicas. Si tu negocio está obligado a facturar ante la DIAN, debes hacerlo con un proveedor autorizado. Los reportes de Vendela son una ayuda de gestión y no reemplazan la asesoría de un contador.</p>
        <h2>4. Tratamiento de datos personales (Ley 1581 de 2012)</h2>
        <p>VBS trata tus datos (nombre, correo, celular) para crear tu cuenta, prestarte el servicio, cobrar el plan y darte soporte. Los datos de tus clientas que registras en Vendela los tratas tú como responsable; VBS actúa como encargado y solo los usa para prestarte el servicio. Debes contar con la autorización de tus clientas para registrar sus datos.</p>
        <p>Puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la autorización, escribiendo a los canales de soporte de VBS en vb-society.co. Puedes exportar tus ventas en cualquier momento desde Cuentas del mes.</p>
        <h2>5. Seguridad</h2>
        <p>Tu información está aislada de la de otros negocios, viaja cifrada y tiene copias de seguridad. Cuida tu contraseña y no la compartas.</p>
        <p className="muted tiny">Última actualización: noviembre de 2026. Documento base sujeto a revisión jurídica de VBS.</p>
      </article>
    </div>
  );
}
