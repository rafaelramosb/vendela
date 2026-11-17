export const TZ = 'America/Bogota';

const moneyFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const money = (n: number | null | undefined) => moneyFmt.format(Math.round(Number(n) || 0)).replace(/ /g, ' ');

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Fecha de hoy en Bogotá como YYYY-MM-DD. */
export function todayCO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function monthStart(day = todayCO()): string {
  return day.slice(0, 8) + '01';
}

export function addMonths(isoDay: string, n: number): string {
  const [y, m] = isoDay.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

export function monthLabel(isoDay: string): string {
  const [y, m] = isoDay.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function dayLabel(isoDay: string): string {
  const today = todayCO();
  if (isoDay === today) return 'Hoy';
  const t = Date.parse(today + 'T00:00:00Z');
  const d = Date.parse(isoDay + 'T00:00:00Z');
  const diff = Math.round((t - d) / 864e5);
  if (diff === 1) return 'Ayer';
  const [, m, day] = isoDay.split('-').map(Number);
  return `${day} de ${MONTHS[m - 1]}`;
}

export const onlyDigits = (s: string) => String(s || '').replace(/\D/g, '');
export const toInt = (s: string | number) => {
  const n = parseInt(onlyDigits(String(s)), 10);
  return Number.isFinite(n) ? n : 0;
};

/** wa.me con indicativo de Colombia cuando el número tiene 10 dígitos. */
export function waLink(phone: string | null | undefined, text: string) {
  let p = onlyDigits(phone || '');
  if (p.length === 10) p = '57' + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export const LOCALIDADES = ['Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá', 'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'Puente Aranda', 'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz', 'Soacha', 'Chía', 'Otra'];
export const CHANNELS = ['TikTok', 'Instagram', 'Facebook', 'WhatsApp', 'Local', 'Otro'];
export const PAYMENTS = ['Nequi', 'Bre-B', 'Efectivo', 'Contraentrega', 'Tarjeta'];
export const CATEGORIES: Record<string, string> = {
  blusa: 'Blusas y bodies',
  jean: 'Jeans y pantalones',
  vestido: 'Vestidos',
  conjunto: 'Conjuntos',
  chaqueta: 'Chaquetas',
  bolso: 'Bolsos',
  aretes: 'Accesorios',
  calzado: 'Calzado',
  belleza: 'Belleza',
  otro: 'Otros',
};
export const EXPENSE_CATEGORIES = ['Arriendo', 'Internet y datos', 'Publicidad', 'Empaques', 'Domicilios', 'Servicios', 'Sueldos', 'Otro'];
export const STATUS_LABEL: Record<string, string> = { nuevo: 'Nuevo', encamino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' };

export type Plan = 'trial' | 'free' | 'pro';
export function effectivePlan(b: { plan: string; trial_ends_at: string; paid_until: string | null }): Plan {
  const now = Date.now();
  if (b.plan === 'pro' && b.paid_until && Date.parse(b.paid_until) > now) return 'pro';
  if (Date.parse(b.trial_ends_at) > now) return 'trial';
  return 'free';
}
export function daysLeft(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 864e5));
}

export const PRICES = [
  { months: 1, label: 'Mensual', total: 49900, note: '$ 49.900 al mes' },
  { months: 3, label: 'Trimestral', total: 134700, note: 'Ahorras 10%' },
  { months: 12, label: 'Anual', total: 449000, note: 'Ahorras 25%' },
];

export function errorText(e: any): string {
  const m = e?.message || String(e || 'Algo salió mal');
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.';
  if (/User already registered/i.test(m)) return 'Ese correo ya tiene cuenta. Ingresa o recupera tu contraseña.';
  if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  return m;
}
