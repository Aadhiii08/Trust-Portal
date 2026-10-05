import Link from 'next/link';

export default function Home() {
  return (
    <div className="auth-wrapper">
      <div className="auth-container glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h1 style={{ marginBottom: '1.5rem', color: '#134e5e', fontSize: '1.7rem', fontWeight: 'bold', lineHeight: '1.4' }}>
          Welcome to Pushpa Mahaveer Chand<br/>Marlecha Charitable Trust
        </h1>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mipl-logo.png.png" alt="MIPL Logo" style={{ height: '58px', width: 'auto', objectFit: 'contain' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mint-logo.png.png" alt="MINT Logo" style={{ height: '25px', width: 'auto', objectFit: 'contain' }} />
        </div>

        <p style={{ marginBottom: '2.5rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Please choose your access type to continue.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '280px', margin: '0 auto' }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
              Student Login
            </button>
          </Link>
          
          <Link href="/admin-login" style={{ textDecoration: 'none' }}>
            <button className="btn btn-secondary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: 'transparent', border: '2px solid var(--border)', color: '#134e5e' }}>
              Admin Login
            </button>
          </Link>
          
          <Link href="/superadmin-login" style={{ textDecoration: 'none' }}>
            <button className="btn btn-secondary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: 'transparent', border: '2px solid var(--border)', color: '#134e5e' }}>
              Super Admin Login
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
