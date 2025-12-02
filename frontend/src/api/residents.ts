import api from './client';
import type { CreateResidentInput, Resident } from '../types';

export const fetchResidents = async (): Promise<Resident[]> => {
  const { data } = await api.get<Resident[]>('/residents');
  return data;
};

export const createResident = async (payload: CreateResidentInput) => {
  const { data } = await api.post<Resident>('/residents', payload);
  return data;
};

