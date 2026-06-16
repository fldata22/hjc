import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

const S = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#FAF8F5',
    fontFamily: "'Montserrat', -apple-system, system-ui, sans-serif",
    WebkitFontSmoothing: 'antialiased' as const,
    padding: '24px 20px',
  },
  wrap: {
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
  },
  brand: {
    marginBottom: 40,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  badge: {
    width: 44,
    height: 44,
    background: '#1C1917',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: '#FAF8F5',
    letterSpacing: '-0.02em',
  },
  brandName: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1C1917',
    letterSpacing: '-0.025em',
    lineHeight: 1,
  },
  brandMeta: {
    fontSize: 12,
    fontWeight: 500,
    color: '#A8A29E',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    marginBottom: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#57534E',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  input: {
    fontFamily: "'Montserrat', -apple-system, system-ui, sans-serif",
    fontSize: 14,
    color: '#1C1917',
    background: '#FFFFFF',
    border: '1px solid #E8E3DC',
    borderRadius: 8,
    padding: '11px 14px',
    outline: 'none',
    width: '100%',
  },
  inputFocus: {
    borderColor: '#8C6D4F',
  },
  btn: {
    fontFamily: "'Montserrat', -apple-system, system-ui, sans-serif",
    fontSize: 14,
    fontWeight: 600,
    background: '#1C1917',
    color: '#FAF8F5',
    border: '0',
    borderRadius: 8,
    padding: '13px 20px',
    cursor: 'pointer',
    width: '100%',
    letterSpacing: '-0.01em',
    transition: 'opacity 0.1s',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed' as const,
  },
  error: {
    marginTop: 12,
    padding: '10px 14px',
    background: '#FBF0EC',
    border: '1px solid #E5C4BA',
    borderRadius: 6,
    fontSize: 12,
    color: '#B54A2C',
  },
  footer: {
    marginTop: 32,
    fontSize: 11,
    color: '#A8A29E',
    textAlign: 'center' as const,
    letterSpacing: '0.04em',
  },
};

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      const dest = (loc.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
      nav(dest, { replace: true });
    } catch {
      setErr('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        <div style={S.brand}>
          <div style={S.badge}>H</div>
          <div>
            <div style={S.brandName}>HJC</div>
            <div style={S.brandMeta}>Mission Control</div>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={S.fieldGroup}>
            <div style={S.field}>
              <label style={S.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                style={{ ...S.input, ...(emailFocus ? S.inputFocus : {}) }}
                autoComplete="email"
                required
              />
            </div>
            <div style={S.field}>
              <label style={S.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPassFocus(true)}
                onBlur={() => setPassFocus(false)}
                style={{ ...S.input, ...(passFocus ? S.inputFocus : {}) }}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...S.btn, ...(loading ? S.btnDisabled : {}) }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {err && <div style={S.error}>{err}</div>}

        <div style={S.footer}>HJC Director · secure access</div>
      </div>
    </div>
  );
}
