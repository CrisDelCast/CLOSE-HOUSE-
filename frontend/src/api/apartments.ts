import axios from 'axios';
import type { Apartment } from '../types';

// Ajustamos la base con el prefijo /api si tu backend lo mapea de forma global
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const fetchApartmentsWithDetails = async (tenantId: string): Promise<Apartment[]> => {
  // Construimos la ruta exacta: properties/tenant/:tenantId/apartments
  const { data } = await axios.get<Apartment[]>(`${API_URL}/properties/tenant/${tenantId}/apartments`);
  return data;
};