import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('director@hjc.test');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      const dest = (loc.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
      nav(dest, { replace: true });
    } catch (e) {
      setErr('Login failed. Check email + password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-page)', fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    }}>
      <form onSubmit={onSubmit} style={{
        background: 'var(--bg-primary)', padding: 32, borderRadius: 12,
        border: '0.5px solid var(--border)', width: 360, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div className="hf-brand-mark">H</div>
          <div>
            <div className="hf-brand-name">HJC</div>
            <div className="hf-brand-meta">Mission Control</div>
          </div>
        </div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 style={{ display: 'block', width: '100%', padding: 8, marginTop: 4,
                          border: '0.5px solid var(--border-strong)', borderRadius: 6, fontSize: 13 }} />
        </label>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                 style={{ display: 'block', width: '100%', padding: 8, marginTop: 4,
                          border: '0.5px solid var(--border-strong)', borderRadius: 6, fontSize: 13 }} />
        </label>
        {err && <div style={{ color: 'var(--text-danger)', fontSize: 12 }}>{err}</div>}
        <button type="submit" disabled={loading}
                className="hf-btn primary"
                style={{ marginTop: 4, justifyContent: 'center' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
