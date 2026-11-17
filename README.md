# Vendela by VBS

Inventario con tallas y colores, ventas, pedidos a domicilio, gastos, clientas, cuentas del mes y tienda en línea
para emprendedoras que venden por TikTok, Instagram y WhatsApp. Suscripción: 30 días de prueba, plan Gratis
limitado y plan Emprendedor a $ 49.900/mes.

## Stack

| Capa | Tecnología |
| --- | --- |
| App | Next.js 14 (App Router), React 18, TypeScript |
| Datos y autenticación | Supabase (Postgres 17, Auth, RLS) · proyecto `vendela` (`yxduezbjfaeobjtmvheq`, us-east-1) |
| Hosting | Vercel |
| Cobro de suscripción | Wompi Web Checkout + webhook de eventos |

## Estructura

```
app/
  page.tsx                 Landing pública
  registro, ingresar, recuperar, nueva-clave, bienvenida, auth/callback
  app/                     App privada (requiere sesión y negocio)
    page.tsx               Inicio: ganancia del mes, me deben, por entregar, redes, stock bajo
    vender/                Venta en 3 toques + comprobante por WhatsApp
    pedidos/               Nuevo → En camino → Entregado, cobros, cancelación con devolución de stock
    productos/             Productos, variantes talla/color, ajustes de stock, compras
    gastos/ clientas/ cuentas/ tienda/ plan/ ajustes/ mas/
  t/[slug]/                Tienda pública: catálogo y pedido que entra a la app y sale por WhatsApp
  api/billing/checkout     Crea la referencia de pago y firma la URL de Wompi
  api/billing/webhook      Verifica la firma del evento y activa el plan
supabase/migrations/       Esquema, RLS y funciones (fuente de verdad de la base de datos)
```

## Modelo de seguridad

- Cada tabla tiene `business_id` y RLS: un usuario solo ve filas de negocios donde es miembro (`is_member`).
- Lo que mueve inventario o dinero (ventas, cancelaciones, compras, ajustes, pedidos de la tienda) solo ocurre por
  funciones `security definer` que validan acceso, bloquean filas y dejan rastro en `stock_movements`.
- El cliente no puede escribir `stock`, `plan`, `paid_until`, ni insertar pedidos directamente (permisos por columna).
- La tienda pública no lee tablas: usa `get_store` y `place_store_order`, con límite de pedidos por celular y por negocio.
- El plan se activa únicamente desde el webhook de Wompi con la llave secreta del servidor.
- Límites del plan Gratis aplicados en la base: 20 productos, 30 ventas al mes, tienda pausada.

## Desplegar en Vercel (2 minutos)

1. Entra a vercel.com/new e importa `rafaelramosb/vendela` (si no aparece, en "Adjust GitHub App Permissions" dale acceso a este repo).
2. Framework: Next.js (se detecta solo). No necesitas variables para el primer despliegue: las públicas de Supabase están en `.env.production`.
3. Deploy. Luego agrega en Settings → Environment Variables las de Wompi, `SUPABASE_SERVICE_ROLE_KEY` y `NEXT_PUBLIC_SUPPORT_WHATSAPP`, y vuelve a desplegar.

## Desarrollo local

```bash
cp .env.example .env.local   # completa las variables
npm install
npm run dev
```

## Variables de entorno

| Variable | Dónde | Obligatoria |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y servidor (llave publicable) | Sí |
| `NEXT_PUBLIC_SITE_URL` | URL pública, para redirecciones de pago | Sí |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | WhatsApp de soporte VBS (57 + número) | Recomendada |
| `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Servidor | Para cobrar en línea |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor, solo webhook | Para cobrar en línea |

## Puesta en producción: pasos manuales en paneles

1. **Supabase → Authentication → URL Configuration**: Site URL = dominio de producción; en Redirect URLs agrega
   `https://TU-DOMINIO/**`.
2. **Supabase → Authentication → Emails → SMTP**: configura un SMTP propio (Resend, Brevo, SES). El correo por
   defecto de Supabase solo entrega a miembros del equipo, así que sin esto las clientas no reciben la confirmación.
   Alternativa temporal: desactivar "Confirm email" en Authentication → Sign In / Providers → Email.
3. **Supabase → Authentication → Attack Protection**: activa la protección de contraseñas filtradas.
4. **Wompi** (comercios.wompi.co → Desarrolladores): copia llave pública, secreto de integridad y secreto de
   eventos a Vercel; configura la URL de eventos `https://TU-DOMINIO/api/billing/webhook`. Prueba primero con
   llaves de sandbox.
5. **Supabase → Project Settings → API Keys**: copia la llave secreta a `SUPABASE_SERVICE_ROLE_KEY` en Vercel.

## Migraciones

Las migraciones en `supabase/migrations` ya están aplicadas al proyecto `vendela`. Para un entorno nuevo:

```bash
supabase link --project-ref <ref>
supabase db push
```

## Pendiente (siguientes fases)

Factura electrónica DIAN con proveedor autorizado, multiusuario (vendedora/mensajero), métricas de Meta y TikTok,
asistente IA por WhatsApp, conciliación de pagos Bre-B, alerta al 80 % del tope de 3.500 UVT.
