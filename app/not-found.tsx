import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="auth">
      <div className="card center">
        <h1 style={{ fontSize: 26 }}>No encontramos esta página</h1>
        <p className="muted" style={{ margin: 0 }}>Revisa el enlace o vuelve al inicio.</p>
        <Link href="/" className="btn primary">Ir a Vendela</Link>
      </div>
    </div>
  );
}
