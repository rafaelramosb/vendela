import Link from 'next/link';

export function AuthShell({ title, sub, children, foot }: { title: string; sub?: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="card">
        <Link href="/" className="logo">Vende<em>la</em></Link>
        <div>
          <h1 style={{ fontSize: 26 }}>{title}</h1>
          {sub && <p className="muted" style={{ margin: '6px 0 0' }}>{sub}</p>}
        </div>
        {children}
        {foot && <div className="tiny muted center">{foot}</div>}
      </div>
    </div>
  );
}
