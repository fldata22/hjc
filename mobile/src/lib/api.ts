import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Base URL of the HJC Laravel API. Set EXPO_PUBLIC_API_URL in .env for device/prod.
// iOS simulator can reach the Mac via localhost; Android emulator uses 10.0.2.2.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8001/api';

const TOKEN_KEY = 'hjc_token';

// expo-secure-store is native-only; fall back to localStorage on web.
const isWeb = Platform.OS === 'web';

async function secureGet(key: string): Promise<string | null> {
  if (isWeb) return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string | null): Promise<void> {
  if (isWeb) {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

// In-memory cache so apiFetch can read the token synchronously. Hydrated at launch.
let tokenCache: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

/** Load the persisted token into the in-memory cache. Call once at app launch. */
export async function loadToken(): Promise<string | null> {
  tokenCache = await secureGet(TOKEN_KEY);
  return tokenCache;
}

export function getToken(): string | null {
  return tokenCache;
}

export async function setToken(token: string | null): Promise<void> {
  tokenCache = token;
  await secureSet(TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  body?: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (tokenCache) headers.set('Authorization', `Bearer ${tokenCache}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    await setToken(null);
    unauthorizedHandler?.();
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, `HTTP ${res.status}`, body);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export function extractApiMessage(e: unknown, fallback = 'Something went wrong'): string {
  if (e instanceof ApiError) {
    const body = e.body;
    if (body && typeof body === 'object') {
      const b = body as { message?: unknown; errors?: Record<string, string[]> };
      if (b.errors) {
        const first = Object.values(b.errors)[0]?.[0];
        if (first) return first;
      }
      if (typeof b.message === 'string') return b.message;
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}
