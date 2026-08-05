import api from './client';
import type { BulkUploadResult, CreateResidentInput, Resident } from '../types';

export const fetchResidents = async (tenantId: string) => {
  if (!tenantId) return [];
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

export const uploadResidentsBulk = async (
  file: File,
  tenantId?: string,
): Promise<BulkUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  const query = tenantId ? `?tenantId=${tenantId}` : '';
  const { data } = await api.post<BulkUploadResult>(`/residents/bulk-upload${query}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

