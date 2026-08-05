import api from './client';
import type { CreateResidentInput, Resident } from '../types';

export const fetchResidents = async (tenantId: string) => {
  if (!tenantId) return [];
  
  // ❌ ANTES tenías: api.get(`/residents/${tenantId}`); -> Daba 404
  //  AHORA pásalo como query string para que coincida con tu @Query('tenantId')
  const response = await api.get(`/residents?tenantId=${tenantId}`); 
  
  return response.data;
};

export const createResident = async (
  residentData: CreateResidentInput,
  tenantId?: string,
): Promise<Resident> => {
  const query = tenantId ? `?tenantId=${tenantId}` : '';
  const response = await api.post<Resident>(`/residents${query}`, residentData);
  return response.data;
};

