import axios from 'axios';

// Si existe la variable de entorno, la usa como base. Si no, usa ruta relativa (para local)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;