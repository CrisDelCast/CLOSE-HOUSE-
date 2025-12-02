import api from './client';
import type { LoginPayload, LoginResponse } from '../types';

export const loginRequest = async (payload: LoginPayload) => {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
};

