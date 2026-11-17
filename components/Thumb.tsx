const COLORS: Record<string, string> = {
  negro: '#2b2a33', blanco: '#e9e9ee', beige: '#d8c2a3', azul: '#3d5e93', jean: '#3d5e93', floral: '#d9668f',
  camel: '#b98149', dorado: '#d6a92d', plateado: '#a9aeb6', gris: '#8b909a', lila: '#a98bd8', rojo: '#c4363b',
  verde: '#3f8a5a', rosado: '#e58aa8', rosa: '#e58aa8', cafe: '#7a5236', 'café': '#7a5236', morado: '#7b4bb3',
  amarillo: '#e2b93b', naranja: '#e07b39', vinotinto: '#7a1f33', fucsia: '#d0237a', crema: '#efe3c8',
};

export function colorOf(name?: string) {
  const k = (name || '').trim().toLowerCase();
  return COLORS[k] || COLORS[k.split(' ')[0]] || '#8b909a';
}

export function Thumb({ category, color, size = 52 }: { category?: string; color?: string; size?: number }) {
  const c = colorOf(color);
  let shape: JSX.Element;
  switch (category) {
    case 'jean':
      shape = <path d="M20 10h24l3 44h-10l-5-28-5 28H17z" fill={c} />;
      break;
    case 'vestido':
      shape = <path d="M26 10h12l-2 10 12 34H16l12-34z" fill={c} />;
      break;
    case 'bolso':
      shape = (
        <>
          <path d="M24 26c0-11 16-11 16 0" fill="none" stroke={c} strokeWidth="4" />
          <path d="M13 26h38l-4 28H17z" fill={c} />
        </>
      );
      break;
    case 'aretes':
      shape = (
        <>
          <circle cx="22" cy="36" r="10" fill="none" stroke={c} strokeWidth="4" />
          <circle cx="42" cy="36" r="10" fill="none" stroke={c} strokeWidth="4" />
          <circle cx="22" cy="22" r="3" fill={c} />
          <circle cx="42" cy="22" r="3" fill={c} />
        </>
      );
      break;
    case 'conjunto':
    case 'chaqueta':
      shape = (
        <>
          <path d="M22 10l-12 8 2 30 6-1 2-20v35h24V27l2 20 6 1 2-30-12-8c-2 4-6 6-10 6s-8-2-10-6z" fill={c} />
          {category === 'chaqueta' && <path d="M32 18v44" stroke="rgba(255,255,255,.55)" strokeWidth="2" />}
        </>
      );
      break;
    case 'calzado':
      shape = <path d="M10 40c6 0 10-8 12-16h8c2 6 8 10 16 12s8 6 8 10H10z" fill={c} />;
      break;
    case 'belleza':
      shape = (
        <>
          <rect x="26" y="24" width="12" height="30" rx="3" fill={c} />
          <path d="M28 24v-8l8-4v12z" fill={c} />
        </>
      );
      break;
    case 'otro':
      shape = <rect x="16" y="18" width="32" height="32" rx="6" fill={c} />;
      break;
    default:
      shape = <path d="M22 12l-10 6 4 10 6-3v27h20V25l6 3 4-10-10-6c-2 4-6 6-10 6s-8-2-10-6z" fill={c} />;
  }
  return (
    <span
      className="thumb"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${c} 18%, var(--surface))` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64">{shape}</svg>
    </span>
  );
}
