// Shim so the ported hooks.ts (which imports from './client') resolves to the
// mobile API client. Keeps hooks.ts byte-identical to the web app for easy reuse.
export { apiFetch, ApiError, getToken, setToken, extractApiMessage } from '@/lib/api';
