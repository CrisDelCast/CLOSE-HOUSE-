import axios from 'axios'; // O la instancia de axios configurada que uses globalmente
import type { CreateTenantInput, Tenant } from '../types';

const API_URL = 'http://localhost:3000/api/tenants';

export const fetchTenants = async (): Promise<Tenant[]> => {
  const { data } = await axios.get<Tenant[]>(API_URL);
  return data;
};

export const createTenant = async (tenantData: CreateTenantInput): Promise<Tenant> => {
  const { data } = await axios.post<Tenant>(API_URL, tenantData);
  return data;
};