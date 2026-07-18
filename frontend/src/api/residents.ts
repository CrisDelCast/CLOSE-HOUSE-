import api from './client';
import type { CreateResidentInput, Resident } from '../types';

export const fetchResidents = async (tenantId: string) => {
  if (!tenantId) return [];
  
  // ❌ ANTES tenías: api.get(`/residents/${tenantId}`); -> Daba 404
  //  AHORA pásalo como query string para que coincida con tu @Query('tenantId')
  const response = await api.get(`/residents?tenantId=${tenantId}`); 
  
  return response.data;
};

export const createResident = async ({ 
  residentData, 
  tenantId 
}: { 
  residentData: CreateResidentInput; 
  tenantId: string; 
}) => {
  // Tu llamada a axios / fetch apuntando al tenant correspondiente
  const response = await api.post(`/tenants/${tenantId}/residents`, residentData);
  return response.data;
};

