'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const isEmail = emailOrPhone.includes('@');
    
    const body = isLogin 
      ? { emailOrPhone, password, expectedRole: 'USER' }
      : { email: isEmail ? emailOrPhone : '', phone: !isEmail ? emailOrPhone : '', password, role: 'USER' };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard/user');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container glass-card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>
          Student Portal
        </h2>
        
        <div style={{ display: 'flex', marginBottom: '2rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            style={{ flex: 1, padding: '0.75rem', border: 'none', background: isLogin ? 'var(--primary)' : 'transparent', color: isLogin ? '#fff' : 'var(--text)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{ flex: 1, padding: '0.75rem', border: 'none', background: !isLogin ? 'var(--primary)' : 'transparent', color: !isLogin ? '#fff' : 'var(--text)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s' }}
          >
            Sign Up
          </button>
        </div>
        
        {error && (
          <div style={{ padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{isLogin ? 'Email, Phone Number, or Student ID' : 'Email or Phone Number'}</label>
            <input 
              type="text" 
              className="form-input" 
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder={isLogin ? "e.g., student@trust.com or TRST0001" : "e.g., student@trust.com"}
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="form-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required 
                style={{ paddingRight: '45px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
                  Forgot Password?
                </Link>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In as Student' : 'Create Student Account')}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
