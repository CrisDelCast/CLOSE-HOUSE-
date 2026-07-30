import axios from './axios';

export interface VehicleReportChecklist {
  vidrios?: { status: string; observations?: string };
  carroceria?: { status: string; observations?: string };
  luces?: { status: string; observations?: string };
  llantas?: { status: string; observations?: string };
  espejos?: { status: string; observations?: string };
}

export interface VehicleReport {
  id: string;
  status: string;
  observations?: string;
  imageUrl?: string;
  checklist?: VehicleReportChecklist;
  createdAt: string;
  warnings?: string[];
  vehicle?: {
    id: string;
    plate: string;
    brand?: string;
    color?: string;
  };
  user?: {
    id: string;
    fullName: string;
  };
}

export const fetchVehicleReports = async (): Promise<VehicleReport[]> => {
  const { data } = await axios.get<VehicleReport[]>('/api/vehicle-reports');
  return data;
};
