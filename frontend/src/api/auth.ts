import api from './client';
import type { LoginPayload, LoginResponse } from '../types';
/*import axios from 'axios';*/

export const loginRequest = async (payload: LoginPayload) => {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;

  //const response = await axios.post('http://192.168.0.49:3000/api/auth/login', payload);
  //return response.data;
};

