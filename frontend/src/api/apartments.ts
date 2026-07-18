    import axios from 'axios';
    import type { Apartment } from '../types';

    // Ajustamos la base con el prefijo /api si tu backend lo mapea de forma global
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

    // En tu archivo de API del frontend:
    export const fetchApartmentsWithDetails = async (tenantId: string): Promise<Apartment[]> => {
        const { data } = await axios.get<Apartment[]>(
          `${API_BASE_URL}/api/properties/tenant/${tenantId}/apartments`
        );
        return data;
      };