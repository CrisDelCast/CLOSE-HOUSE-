import api from './client';
import type {
  CreateVisitorInput,
  DenyVisitorInput,
  Visitor,
  VisitorStatus,
} from '../types';

export const fetchVisitors = async (
  status?: VisitorStatus,
): Promise<Visitor[]> => {
  const { data } = await api.get<Visitor[]>('/visitors', {
    params: status ? { status } : undefined,
  });
  return data;
};

export const createVisitor = async (payload: CreateVisitorInput) => {
  const { data } = await api.post<Visitor>('/visitors', payload);
  return data;
};

export const checkInVisitor = async (id: string) => {
  const { data } = await api.patch<Visitor>(`/visitors/${id}/check-in`);
  return data;
};

export const checkOutVisitor = async (id: string) => {
  const { data } = await api.patch<Visitor>(`/visitors/${id}/check-out`);
  return data;
};

export const denyVisitor = async (id: string, payload: DenyVisitorInput) => {
  const { data } = await api.patch<Visitor>(`/visitors/${id}/deny`, payload);
  return data;
};

