import axios from 'axios';
import { AUTH_STORAGE_KEY } from '../constants/storage';

// 1. Buscamos la variable de entorno. 
// Si no existe, usamos los valores por defecto (fallback) conservando el /api
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl) {
    // Si la variable de entorno ya trae el '/api' al final, lo dejamos tal cual.
    // Si no lo trae, se lo agregamos automáticamente para que el frontend siga apuntando bien.
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }

  // Fallbacks tradicionales si no hay variable de entorno definida
  return import.meta.env.PROD 
    ? 'https://motivated-kindness-production-e60a.up.railway.app/api' 
    : 'http://localhost:3000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
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

