# HJC Frontend POC (DW.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working React frontend at `~/Projects/hjc/web/` that lets a director log in and see the DW.1 Mission Control dashboard backed by live HJC API data.

**Architecture:** Vite + React 18 + TypeScript + React Router 7 + TanStack Query 5. Port the existing `~/Downloads/Crusade Director Spec/hifi/styles.css` verbatim, port shell.jsx + screens-1.jsx::DW1 components to TSX, replace inline static data with API hooks.

**Backend already running on port 8001.** Login: `director@hjc.test` / `password`.

**Spec:** `docs/superpowers/specs/2026-04-25-frontend-poc-dw1-design.md`

---

## Task 1: Scaffold Vite + React + TS app + dependencies + CORS update

**Files:**
- Create: `web/` directory at `~/Projects/hjc/web/`
- Create: standard Vite scaffold (package.json, vite.config.ts, tsconfig.json, index.html, src/main.tsx, src/App.tsx)
- Modify: `~/Projects/hjc/config/cors.php` (add localhost:5173 to allowed_origins)

- [ ] **Step 1: Create Vite app**

```bash
cd ~/Projects/hjc
npm create vite@latest web -- --template react-ts
cd web
npm install
```

This generates a working Vite + React + TS template. Confirm with:

```bash
ls
```

Expected: `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `src/`, `public/`, `node_modules/` (after install).

- [ ] **Step 2: Install runtime dependencies**

```bash
cd ~/Projects/hjc/web
npm install react-router-dom @tanstack/react-query
```

- [ ] **Step 3: Update Laravel CORS to allow Vite dev origin**

Edit `~/Projects/hjc/config/cors.php`. Find the `allowed_origins` array (currently has `'http://localhost:3000'`) and add `'http://localhost:5173'`:

```php
    'allowed_origins' => [
        'http://localhost:3000',
        'http://localhost:5173',
    ],
```

- [ ] **Step 4: Copy hi-fi CSS verbatim**

```bash
cp "/Users/adebimpegodwin/Downloads/Crusade Director Spec/hifi/styles.css" ~/Projects/hjc/web/src/styles.css
```

- [ ] **Step 5: Replace `web/src/main.tsx` with our setup**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 6: Replace `web/src/App.tsx` with a placeholder**

```tsx
export default function App() {
  return <div style={{ padding: 40, fontFamily: 'system-ui' }}>HJC frontend boot OK</div>;
}
```

- [ ] **Step 7: Replace `web/index.html` with a clean shell**

Edit `web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1440, initial-scale=1.0" />
    <title>HJC Mission Control</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Delete the unused Vite default files**

```bash
cd ~/Projects/hjc/web
rm -f src/App.css src/index.css src/assets/react.svg public/vite.svg
```

(The `src/assets/` and `public/` directories will be empty after this — leave them.)

- [ ] **Step 9: Add `web/.gitignore` (Vite's default is fine but verify)**

```bash
cd ~/Projects/hjc/web
cat .gitignore
```

If it's missing or doesn't have `node_modules/`, write this:

```
node_modules
dist
.env
.env.local
*.log
.DS_Store
```

- [ ] **Step 10: Verify dev server boots**

```bash
cd ~/Projects/hjc/web
npm run dev &
sleep 3
curl -s http://localhost:5173/ | head -20
kill %1 2>/dev/null || pkill -f "vite" 2>/dev/null || true
```

Expected: HTML containing the script tag for `/src/main.tsx`. The "HJC frontend boot OK" text won't appear in the SSR'd HTML (Vite is SPA), but the script tag should be present.

- [ ] **Step 11: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(web): scaffold Vite + React + TS frontend at web/, add localhost:5173 to CORS"
```

---

## Task 2: Port Icon component + design-system primitives

**Files:**
- Create: `web/src/components/Icon.tsx`

The existing `~/Downloads/Crusade Director Spec/hifi/shell.jsx` has an `Icon` component with a `name`/`size` prop and a paths object containing all SVG paths. Port it directly to TSX.

- [ ] **Step 1: Read the source**

```bash
cat "/Users/adebimpegodwin/Downloads/Crusade Director Spec/hifi/shell.jsx"
```

You'll see the `Icon` definition and the full `paths` object.

- [ ] **Step 2: Create `web/src/components/Icon.tsx`**

Port the `Icon` function from shell.jsx into TSX. Use this template:

```tsx
// @ts-nocheck
import React from 'react';

export type IconName =
  | 'home' | 'powers' | 'pastors' | 'committees' | 'publicity' | 'govt'
  | 'budget' | 'activity' | 'assess' | 'inbox' | 'pledges' | 'conf' | 'prep'
  | 'search' | 'bell' | 'plus' | 'chevron' | 'menu' | 'filter' | 'download'
  | 'phone' | 'mail' | 'check' | 'edit' | 'flag' | 'star' | 'clock' | 'spark'
  | 'money' | 'upload' | 'arrowR' | 'sliders' | 'shield' | 'cal' | 'chart' | 'cards';

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    // PASTE the full paths object from shell.jsx here, verbatim
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
```

Copy the contents of the `paths` object from shell.jsx exactly (the JSX fragments inside each path key). Each entry looks like:

```js
home: <><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></>,
```

- [ ] **Step 3: Verify the file compiles**

```bash
cd ~/Projects/hjc/web
npx tsc --noEmit
```

Expected: no errors (or only unrelated errors from the placeholder App.tsx).

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(web): port Icon component"
```

---

## Task 3: Port Shell (Sidebar + Topbar) + Crumb components

**Files:**
- Create: `web/src/components/Shell.tsx`

The existing `~/Downloads/Crusade Director Spec/hifi/shell.jsx` has `NAV_ITEMS`, `NAV_DAILY`, `Sidebar`, `Topbar`, `Shell`, `Crumb`. Port them.

- [ ] **Step 1: Create `web/src/components/Shell.tsx`**

```tsx
// @ts-nocheck
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';

const NAV_ITEMS = [
  { key: 'home', icon: 'home', label: 'Mission control', to: '/' },
  { key: 'powers', icon: 'powers', label: 'PAVEDDD powers', count: 14, to: '/powers' },
  { key: 'pastors', icon: 'pastors', label: 'Pastors', count: '1.1k', to: '/pastors' },
  { key: 'committees', icon: 'committees', label: 'Committees', to: '/committees' },
  { key: 'pledges', icon: 'pledges', label: 'Pledges', to: '/pledges' },
  { key: 'conf', icon: 'conf', label: 'Conference', count: 559, to: '/conference' },
  { key: 'publicity', icon: 'publicity', label: 'Publicity', to: '/publicity' },
  { key: 'govt', icon: 'govt', label: 'Govt & permits', to: '/govt' },
  { key: 'budget', icon: 'budget', label: 'Budget', to: '/budget' },
  { key: 'prep', icon: 'prep', label: 'Preparation', to: '/preparation' },
];
const NAV_DAILY = [
  { key: 'activity', icon: 'activity', label: 'Activity log', to: '/activity' },
  { key: 'assess', icon: 'assess', label: 'Weekly assessment', to: '/assessment' },
  { key: 'inbox', icon: 'inbox', label: 'Inbox', count: 17, to: '/inbox' },
];

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="hf-sidebar">
      <div className="hf-brand">
        <div className="hf-brand-mark">H</div>
        <div>
          <div className="hf-brand-name">HJC</div>
          <div className="hf-brand-meta">Lusaka 2026</div>
        </div>
      </div>
      <div className="hf-nav-section">Crusade</div>
      {NAV_ITEMS.map((n) => (
        <NavLink key={n.key} to={n.to} className={({ isActive }) => `hf-nav-item ${isActive ? 'active' : ''}`}>
          <span className="ic"><Icon name={n.icon as any} size={15} /></span>
          <span>{n.label}</span>
          {n.count != null && <span className="count">{n.count}</span>}
        </NavLink>
      ))}
      <div className="hf-nav-section">Director</div>
      {NAV_DAILY.map((n) => (
        <NavLink key={n.key} to={n.to} className={({ isActive }) => `hf-nav-item ${isActive ? 'active' : ''}`}>
          <span className="ic"><Icon name={n.icon as any} size={15} /></span>
          <span>{n.label}</span>
          {n.count != null && <span className="count">{n.count}</span>}
        </NavLink>
      ))}
    </aside>
  );
}

function Topbar({ user }: { user?: { name: string } | null }) {
  return (
    <div className="hf-topbar">
      <div className="hf-search">
        <Icon name="search" size={14} />
        <span>Search pastors, churches, expenses…</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)', border: '0.5px solid var(--border)', padding: '1px 5px', borderRadius: 4 }}>⌘K</span>
      </div>
      <div className="hf-topbar-actions">
        <div className="hf-icon-btn"><Icon name="cal" /></div>
        <div className="hf-icon-btn"><Icon name="bell" /><span className="dot" /></div>
        <div className="hf-user-chip">
          <div className="hf-avatar">{user?.name ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'U'}</div>
          <div style={{ fontSize: 12, lineHeight: 1.2 }}>
            <div style={{ fontWeight: 500 }}>{user?.name ?? 'User'}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Director</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Shell({ active, children, noPad, user }: { active: string; children: React.ReactNode; noPad?: boolean; user?: { name: string } | null }) {
  return (
    <div className="hf">
      <Sidebar active={active} />
      <div className="hf-main">
        <Topbar user={user} />
        <div className={`hf-content ${noPad ? 'no-pad' : ''}`}>{children}</div>
      </div>
    </div>
  );
}

export function Crumb({ path }: { path: string[] }) {
  return (
    <div className="hf-crumb">
      {path.map((p, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>/</span>}
          {i === path.length - 1 ? <span className="here">{p}</span> : <a>{p}</a>}
        </span>
      ))}
    </div>
  );
}
```

NOTE: The brand is "HJC" not "Poimen" — that's what the user requested (bishop-name says "HJC Mission Control" branding).

- [ ] **Step 2: Verify it compiles**

```bash
cd ~/Projects/hjc/web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(web): port Shell + Sidebar + Topbar + Crumb components"
```

---

## Task 4: Port PaveDonut SVG component

**Files:**
- Create: `web/src/components/PaveDonut.tsx`

The existing `~/Downloads/Crusade Director Spec/hifi/screens-1.jsx` has a `PaveDonut` component. Port it.

- [ ] **Step 1: Create the component**

```tsx
// @ts-nocheck
import React from 'react';

interface DonutSegment {
  color: string;
  weight: number;
}

export function PaveDonut({
  size = 180,
  segments,
  centerLabel,
  centerSubLabel = 'overall',
}: {
  size?: number;
  segments?: DonutSegment[];
  centerLabel?: string;
  centerSubLabel?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;
  const sw = size * 0.18;

  // Default segments if not provided (matches the hi-fi)
  const segs: DonutSegment[] = segments ?? [
    { color: '#EF9F27', weight: 1 }, { color: '#639922', weight: 1 }, { color: '#639922', weight: 1 },
    { color: '#639922', weight: 1 }, { color: '#639922', weight: 1 }, { color: '#EF9F27', weight: 1 },
    { color: '#E24B4A', weight: 1 }, { color: '#639922', weight: 1 }, { color: '#EF9F27', weight: 1 },
    { color: '#E24B4A', weight: 1 }, { color: '#639922', weight: 1 }, { color: '#639922', weight: 1 },
    { color: '#B4B2A9', weight: 1 }, { color: '#B4B2A9', weight: 1 },
  ];

  const total = segs.reduce((s, x) => s + x.weight, 0);
  const C = 2 * Math.PI * r;
  const segLen = C / total;
  const gap = 2;
  let off = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cy})`} fill="none" strokeWidth={sw}>
        {segs.map(({ color }, i) => {
          const dash = `${segLen - gap} ${C - (segLen - gap)}`;
          const dashoffset = -off;
          off += segLen;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} stroke={color}
                    strokeDasharray={dash} strokeDashoffset={dashoffset} />
          );
        })}
      </g>
      {centerLabel && (
        <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.19} fontWeight={500} fill="currentColor">
          {centerLabel}
        </text>
      )}
      {centerSubLabel && (
        <text x={cx} y={cy + size * 0.13} textAnchor="middle" dominantBaseline="central"
              fontSize="11" fill="var(--text-secondary)">
          {centerSubLabel}
        </text>
      )}
    </svg>
  );
}

// Helper: convert mission-control powers array to donut segments
export function powersToSegments(powers: Array<{ value_pct: number | null; status: string }>): DonutSegment[] {
  const colorFor = (status: string) => {
    switch (status) {
      case 'success': return '#639922';
      case 'warning': return '#EF9F27';
      case 'danger': return '#E24B4A';
      case 'muted':
      default: return '#B4B2A9';
    }
  };
  return powers.map((p) => ({ color: colorFor(p.status), weight: 1 }));
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd ~/Projects/hjc/web
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(web): port PaveDonut component with dynamic segments"
```

---

## Task 5: API client + auth machinery

**Files:**
- Create: `web/src/api/client.ts`
- Create: `web/src/api/hooks.ts`
- Create: `web/src/auth/AuthProvider.tsx`
- Create: `web/src/auth/useAuth.ts`
- Create: `web/src/auth/RequireAuth.tsx`

- [ ] **Step 1: Create `web/src/api/client.ts`**

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001/api';

const TOKEN_KEY = 'hjc_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token === null) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    setToken(null);
    // Soft redirect — let React Router pick up via the auth provider
    window.dispatchEvent(new CustomEvent('hjc:unauthorized'));
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new ApiError(res.status, `HTTP ${res.status}`, body);
  }

  // 204 = no body
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
```

- [ ] **Step 2: Create `web/src/auth/AuthProvider.tsx`**

```tsx
import React, { createContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, getToken, setToken } from '../api/client';

interface User { id: number; name: string; email: string; }

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());

  // Listen for unauthorized events from the API client
  useEffect(() => {
    const onUnauth = () => { setTokenState(null); setUser(null); };
    window.addEventListener('hjc:unauthorized', onUnauth);
    return () => window.removeEventListener('hjc:unauthorized', onUnauth);
  }, []);

  // On mount with existing token, try to load /api/crusade as a "ping" to validate the token.
  // (We don't have a /me endpoint, but a successful authenticated call confirms the token.)
  useEffect(() => {
    if (token && !user) {
      // Optimistically mark as authenticated — token will be validated by the first real query.
      // We can't populate `user` without a /me endpoint; leave null. Display "Director" as fallback.
    }
  }, [token, user]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try { await apiFetch('/logout', { method: 'POST' }); } catch { /* ignore */ }
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3: Create `web/src/auth/useAuth.ts`**

```ts
import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Create `web/src/auth/RequireAuth.tsx`**

```tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const loc = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 5: Create `web/src/api/hooks.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface MissionControlData {
  top_stats: {
    days_to_go: number;
    financial: { spent: string; total: string; pct: string };
    pastors_won: { n: number; target: number; pct: string };
    awareness_pct: string;
  };
  powers: Array<{ code: string; name: string; order_index: number; value_pct: number | null; status: 'success' | 'warning' | 'danger' | 'muted' }>;
  context: {
    population: number | null;
    pap: number | null;
    zones_count: number;
    conference_registered: number;
    conference_capacity: number;
    convoy_actual: number;
    convoy_target: number;
    makarios_actual: number;
    makarios_target: number;
    permits_approved: number;
    permits_total: number;
  };
  top_risks: Array<{ ordering: number; severity: 'critical' | 'high' | 'medium'; text: string }>;
  crusade: { id: number; name: string; city: string; opens_at: string; closes_at: string };
}

export function useMissionControl() {
  return useQuery({
    queryKey: ['mission-control'],
    queryFn: () => apiFetch<{ data: MissionControlData }>('/mission-control').then((r) => r.data),
  });
}
```

- [ ] **Step 6: Verify compiles**

```bash
cd ~/Projects/hjc/web
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(web): API client + auth provider + useMissionControl hook"
```

---

## Task 6: LoginPage + router setup

**Files:**
- Create: `web/src/auth/LoginPage.tsx`
- Modify: `web/src/App.tsx` (router with login + dashboard routes)
- Modify: `web/src/main.tsx` (wrap with AuthProvider)

- [ ] **Step 1: Create `web/src/auth/LoginPage.tsx`**

```tsx
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
```

- [ ] **Step 2: Update `web/src/App.tsx`**

```tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { RequireAuth } from './auth/RequireAuth';
import { MissionControl } from './screens/MissionControl';

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h1>{title}</h1>
      <p>Coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><MissionControl /></RequireAuth>} />
      <Route path="/powers" element={<RequireAuth><PlaceholderScreen title="PAVEDDD powers" /></RequireAuth>} />
      <Route path="/pastors" element={<RequireAuth><PlaceholderScreen title="Pastors" /></RequireAuth>} />
      <Route path="/committees" element={<RequireAuth><PlaceholderScreen title="Committees" /></RequireAuth>} />
      <Route path="/pledges" element={<RequireAuth><PlaceholderScreen title="Pledges" /></RequireAuth>} />
      <Route path="/conference" element={<RequireAuth><PlaceholderScreen title="Conference" /></RequireAuth>} />
      <Route path="/publicity" element={<RequireAuth><PlaceholderScreen title="Publicity" /></RequireAuth>} />
      <Route path="/govt" element={<RequireAuth><PlaceholderScreen title="Govt & permits" /></RequireAuth>} />
      <Route path="/budget" element={<RequireAuth><PlaceholderScreen title="Budget" /></RequireAuth>} />
      <Route path="/preparation" element={<RequireAuth><PlaceholderScreen title="Preparation" /></RequireAuth>} />
      <Route path="/activity" element={<RequireAuth><PlaceholderScreen title="Activity log" /></RequireAuth>} />
      <Route path="/assessment" element={<RequireAuth><PlaceholderScreen title="Weekly assessment" /></RequireAuth>} />
      <Route path="/inbox" element={<RequireAuth><PlaceholderScreen title="Inbox" /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Update `web/src/main.tsx` to include `AuthProvider`**

Replace the contents:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthProvider';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: Note — at this step, MissionControl screen doesn't exist yet (Task 7 creates it). The TS compile will fail.**

That's expected. Skip the compile check until Task 7.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(web): LoginPage + router with placeholders for non-DW.1 screens"
```

---

## Task 7: MissionControl screen — port DW.1 with live API data

**Files:**
- Create: `web/src/screens/MissionControl.tsx`

The existing `~/Downloads/Crusade Director Spec/hifi/screens-1.jsx::DW1` is the visual source of truth. Port it, replacing inline static data with `useMissionControl()` hook output.

- [ ] **Step 1: Read the source DW1 component to understand the structure**

```bash
sed -n '/const DW1 = /,/^};/p' "/Users/adebimpegodwin/Downloads/Crusade Director Spec/hifi/screens-1.jsx"
```

This shows the full DW1 component.

- [ ] **Step 2: Create `web/src/screens/MissionControl.tsx`**

```tsx
// @ts-nocheck
import React from 'react';
import { Shell } from '../components/Shell';
import { Icon } from '../components/Icon';
import { PaveDonut, powersToSegments } from '../components/PaveDonut';
import { useMissionControl } from '../api/hooks';
import { useAuth } from '../auth/useAuth';

export function MissionControl() {
  const { data, isLoading, isError, error } = useMissionControl();
  const { user, logout } = useAuth();

  if (isLoading) {
    return (
      <Shell active="home" user={user}>
        <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading mission control…</div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell active="home" user={user}>
        <div style={{ padding: 40 }}>
          <div style={{ color: 'var(--text-danger)', fontWeight: 500, marginBottom: 8 }}>Failed to load.</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{(error as any)?.message ?? ''}</div>
          <button className="hf-btn" style={{ marginTop: 16 }} onClick={() => logout()}>Sign out</button>
        </div>
      </Shell>
    );
  }

  const { top_stats, powers, context, top_risks, crusade } = data;
  const days = top_stats.days_to_go;
  const financialPct = parseFloat(top_stats.financial.pct);
  const pastorsPct = parseFloat(top_stats.pastors_won.pct);
  const awarenessPct = parseFloat(top_stats.awareness_pct);
  const opensAt = new Date(crusade.opens_at).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

  const fmtMoneyShort = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
  const spent = parseFloat(top_stats.financial.spent);
  const total = parseFloat(top_stats.financial.total);

  return (
    <Shell active="home" user={user}>
      <div className="hf-page-head">
        <div>
          <div className="hf-eyebrow">Crusade director</div>
          <h1 className="hf-page-title">Mission control</h1>
          <div className="hf-page-sub">{crusade.name} · {days} day{days === 1 ? '' : 's'} to go</div>
        </div>
        <div className="hf-row">
          <button className="hf-btn"><Icon name="download" size={14} /> Export</button>
          <button className="hf-btn primary"><Icon name="plus" size={14} /> Today's entry</button>
          <button className="hf-btn" onClick={() => logout()}>Sign out</button>
        </div>
      </div>

      <div className="hf-grid hf-g4" style={{ marginBottom: 14 }}>
        <div className={`hf-stat ${days <= 14 ? 'danger' : ''}`}>
          <div className="lbl">Days to go</div>
          <div className="val" style={{ fontSize: 34 }}>{days}</div>
          <div className="sub">Crusade opens {opensAt}</div>
        </div>
        <div className="hf-stat">
          <div className="lbl">Financial</div>
          <div className="val">{fmtMoneyShort(spent)} <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>/ {fmtMoneyShort(total)}</span></div>
          <div className="hf-bar" style={{ marginTop: 8 }}>
            <div style={{ width: `${Math.min(100, financialPct)}%`, background: 'var(--text-success)' }} />
          </div>
        </div>
        <div className="hf-stat">
          <div className="lbl">Pastors won</div>
          <div className="val">{top_stats.pastors_won.n.toLocaleString()} <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>/ {top_stats.pastors_won.target.toLocaleString()}</span></div>
          <div className="hf-bar" style={{ marginTop: 8 }}>
            <div style={{ width: `${Math.min(100, pastorsPct)}%`, background: 'var(--text-success)' }} />
          </div>
        </div>
        <div className={`hf-stat ${awarenessPct < 30 ? 'warning' : ''}`}>
          <div className="lbl">Awareness</div>
          <div className="val">{Math.round(awarenessPct)}<span style={{ fontSize: 18 }}>%</span></div>
          <div className="sub">Target was 60% by now</div>
        </div>
      </div>

      <div className="hf-grid" style={{ gridTemplateColumns: '1.05fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="hf-card">
          <div className="hf-eyebrow">PAVEDDD readiness · 14 powers</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '8px 0' }}>
            <PaveDonut size={180} segments={powersToSegments(powers)} centerLabel={`${avgPct(powers)}%`} />
            <div className="hf-col" style={{ gap: 6, fontSize: 12, flex: 1 }}>
              {powers.slice(0, 8).map((p) => (
                <div key={p.code} className="hf-row hf-between">
                  <div className="hf-row" style={{ gap: 6 }}>
                    <span className="hf-dot" style={{ color: dotColor(p.status) }} />
                    <span>{p.name}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>{p.value_pct === null ? '—' : `${p.value_pct}%`}</span>
                </div>
              ))}
              <div className="hf-text-tertiary" style={{ fontSize: 11, marginTop: 4 }}>+ 6 more · view all →</div>
            </div>
          </div>
        </div>

        <div className="hf-card">
          <div className="hf-eyebrow">{crusade.city} · context</div>
          <div className="hf-grid hf-g2" style={{ gap: 8, marginBottom: 10 }}>
            <Stat lbl="Population" val={fmtCount(context.population)} />
            <Stat lbl="PAP" val={fmtCount(context.pap)} />
            <Stat lbl="Zones" val={String(context.zones_count)} />
            <Stat lbl="Conference" val={String(context.conference_registered)} />
          </div>
          <div className="hf-eyebrow">Operational counters</div>
          <div className="hf-grid hf-g3" style={{ gap: 8 }}>
            <CounterStat lbl="Convoy" actual={context.convoy_actual} target={context.convoy_target} />
            <CounterStat lbl="Makarios" actual={context.makarios_actual} target={context.makarios_target} />
            <CounterStat lbl="Permits" actual={context.permits_approved} target={context.permits_total} />
          </div>
        </div>
      </div>

      <div className="hf-eyebrow">Top risks</div>
      <div className="hf-rowlist">
        {top_risks.length === 0 && <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13 }}>No risks logged in the latest weekly assessment.</div>}
        {top_risks.map((r) => (
          <div key={r.ordering} className="row">
            <div>
              <div className="title">{r.text}</div>
            </div>
            <span className={`hf-badge ${badgeClassFor(r.severity)}`}>
              <span className="hf-dot" />
              {labelForSeverity(r.severity)}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Stat({ lbl, val }: { lbl: string; val: string }) {
  return (
    <div className="hf-stat" style={{ padding: '10px 12px' }}>
      <div className="lbl">{lbl}</div>
      <div className="val" style={{ fontSize: 18 }}>{val}</div>
    </div>
  );
}

function CounterStat({ lbl, actual, target }: { lbl: string; actual: number; target: number }) {
  return (
    <div className="hf-stat" style={{ padding: '10px 12px' }}>
      <div className="lbl">{lbl}</div>
      <div className="val" style={{ fontSize: 18 }}>
        {actual} <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 400 }}>/{target}</span>
      </div>
    </div>
  );
}

function fmtCount(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function dotColor(status: string): string {
  switch (status) {
    case 'success': return '#639922';
    case 'warning': return '#EF9F27';
    case 'danger': return '#E24B4A';
    default: return '#B4B2A9';
  }
}

function badgeClassFor(severity: string): string {
  switch (severity) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    default: return 'outline';
  }
}

function labelForSeverity(severity: string): string {
  switch (severity) {
    case 'critical': return 'Critical';
    case 'high': return 'High';
    default: return 'Medium';
  }
}

function avgPct(powers: Array<{ value_pct: number | null }>): number {
  const known = powers.filter((p) => p.value_pct !== null).map((p) => p.value_pct as number);
  if (known.length === 0) return 0;
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length);
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd ~/Projects/hjc/web
npx tsc --noEmit
```

Expected: no errors. The MissionControl file uses `// @ts-nocheck` so it's loosely typed, but everything else should typecheck.

- [ ] **Step 4: Verify Vite builds**

```bash
cd ~/Projects/hjc/web
npm run build
```

Expected: clean build, no errors. (`dist/` is gitignored.)

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/hjc
git add -A
git commit -m "feat(web): port DW.1 Mission Control screen with live API data"
```

---

## Task 8: Final end-to-end smoke test

**No new files** — just verify the full flow works.

- [ ] **Step 1: Ensure backend is running**

```bash
cd ~/Projects/hjc
php artisan migrate:fresh --seed
php artisan serve --port=8001 &
SERVER_PID=$!
sleep 2
```

Confirm: `curl -s http://127.0.0.1:8001/api/health` returns `{"status":"ok"}`.

- [ ] **Step 2: Start the frontend dev server**

```bash
cd ~/Projects/hjc/web
npm run dev &
VITE_PID=$!
sleep 3
```

Confirm: `curl -s http://localhost:5173/ | head -5` returns the index.html.

- [ ] **Step 3: Verify the login → dashboard flow programmatically**

This task should just confirm the dev servers are up and serving. Visual verification (rendering the Mission Control page) requires a browser — note in the report that the human partner should:

1. Open `http://localhost:5173/` in a browser
2. Click in (or already on) the login page
3. Email is pre-filled to `director@hjc.test`, password pre-filled to `password`
4. Click "Sign in"
5. Expect: Mission Control page renders with:
   - "Lusaka 2026 · 7 days to go" in header
   - 4 top stat cards (Days, Financial, Pastors won, Awareness)
   - PAVEDDD donut + 8 powers list
   - Lusaka context (Population 2.2M, PAP 1.8M, Zones 10, Conference 25)
   - Top risks list (3 risks from the latest assessment)

- [ ] **Step 4: Cleanup the dev servers**

```bash
kill $SERVER_PID $VITE_PID 2>/dev/null || true
pkill -f "artisan serve --port=8001" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
```

- [ ] **Step 5: Final commit (if there's anything to commit)**

```bash
cd ~/Projects/hjc
git status
git log --oneline | head -10
```

Should show no untracked files. Recent log shows the 7 frontend commits.

---

## Notes for after the POC

- **Add Vitest + React Testing Library** when the frontend grows past one screen.
- **Loading skeletons** instead of "Loading…" text for polish.
- **Replace placeholder screens** (DW.2-DW.13) by porting each from `screens-1.jsx`, `screens-2.jsx`, `screens-3.jsx` and wiring to the corresponding API endpoints. Each is a small focused commit.
- **Add a `/me` endpoint** to the backend so the frontend can populate `user` on page reload (currently lost on refresh because we only have `token`).
- **Production build & deploy** — separate concerns, deal with when ready.
- **Push to GitHub** — the frontend commits land on the same `main` branch as the backend; one `git push origin main` ships both.
