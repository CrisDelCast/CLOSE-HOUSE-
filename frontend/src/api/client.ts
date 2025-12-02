import axios from 'axios';
import { AUTH_STORAGE_KEY } from '../constants/storage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as {
        token?: string;
        tenantId?: string;
      };

      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }

      if (parsed?.tenantId) {
        config.headers['x-tenant-id'] = parsed.tenantId;
      }
    } catch {
      // ignore malformed storage
    }
  }

  return config;
});

export default api;

