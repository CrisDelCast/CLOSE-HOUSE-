import type { Round } from "../types";
import api from "./client";

export const fetchCompletedRounds = async (
  tenantId: string, 
  filters?: { startDate?: string; endDate?: string }
): Promise<Round[]> => {
  const cleanedParams: Record<string, string> = {};
  
  if (filters?.startDate && filters.startDate.trim() !== '') {
    cleanedParams.startDate = filters.startDate;
  }
  if (filters?.endDate && filters.endDate.trim() !== '') {
    cleanedParams.endDate = filters.endDate;
  }

  const { data } = await api.get<Round[]>(`/rounds/tenant/${tenantId}`, {
    
    params: cleanedParams,
  });
  
  return data;
};