import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, getToken, loadToken, setToken, setUnauthorizedHandler } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
}

type AuthStatus = 'loading' | 'authed' | 'guest';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Hydrate the persisted token at launch.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = await loadToken();
      if (!mounted) return;
      setStatus(token ? 'authed' : 'guest');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Global 401 handler — drop the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('guest');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: User }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(res.token);
    setUser(res.user);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/logout', { method: 'POST' });
    } catch {
      // ignore — clear locally regardless
    }
    await setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, status, isAuthenticated: status === 'authed' && !!getToken(), login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
