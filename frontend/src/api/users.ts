import api from './client';
import type { CreateUserInput, UpdateUserInput, User } from '../types';

export const fetchUsersByTenant = async (tenantId: string): Promise<User[]> => {
  const { data } = await api.get<User[]>(`/users?tenantId=${tenantId}`);
  return data;
};

export const createUser = async (input: CreateUserInput): Promise<User> => {
  const { data } = await api.post<User>('/users', input);
  return data;
};

export const updateUser = async (id: string, input: UpdateUserInput): Promise<User> => {
  const { data } = await api.patch<User>(`/users/${id}`, input);
  return data;
};

export const deleteUser = async (id: string): Promise<{ message: string }> => {
  const { data } = await api.delete<{ message: string }>(`/users/${id}`);
  return data;
};
