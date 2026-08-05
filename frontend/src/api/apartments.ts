import api from './client';
import type {
  Apartment,
  CreateApartmentInput,
  CreateParkingSpotInput,
  CreateVehicleInput,
  ParkingSpot,
  Vehicle,
} from '../types';

export const fetchApartmentsWithDetails = async (tenantId: string): Promise<Apartment[]> => {
  const { data } = await api.get<Apartment[]>(`/properties/tenant/${tenantId}/apartments`);
  return data;
};

export const createApartment = async (input: CreateApartmentInput): Promise<Apartment> => {
  const { data } = await api.post<Apartment>('/properties/apartments', input);
  return data;
};

export const createParkingSpot = async (input: CreateParkingSpotInput): Promise<ParkingSpot> => {
  const { data } = await api.post<ParkingSpot>('/properties/parking-spots', input);
  return data;
};

export const createVehicle = async (input: CreateVehicleInput): Promise<Vehicle> => {
  const { data } = await api.post<Vehicle>('/properties/vehicles', input);
  return data;
};
