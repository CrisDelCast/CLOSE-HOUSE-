// 1. Importa 'api' (tu cliente personalizado) en lugar de 'axios' directo
import api from './client'; 
import type { CreateTenantInput, Tenant } from '../types';

// 2. Deja solo la ruta relativa, ya que 'client' se encarga de ponerle el dominio correcto (localhost o Railway)
const API_URL = '/tenants';

export const fetchTenants = async (): Promise<Tenant[]> => {
  // 3. Usa 'api' en lugar de 'axios'
  const { data } = await api.get<Tenant[]>(API_URL);
  return data;
};

export const createTenant = async (tenantData: CreateTenantInput): Promise<Tenant> => {
  // 3. Usa 'api' en lugar de 'axios'
  const { data } = await api.post<Tenant>(API_URL, tenantData);
  return data;
};