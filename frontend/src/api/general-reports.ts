import axios from './axios';

export type GeneralReportType = 'RECIBIDO' | 'ENTREGA' | 'NOVEDAD';

export interface GeneralReport {
  id: string;
  reportType: GeneralReportType;
  description: string;
  imageUrl?: string;
  createdAt: string;
  warnings?: string[];
  user?: {
    id: string;
    fullName: string;
  };
}

export const fetchGeneralReports = async (): Promise<GeneralReport[]> => {
  const { data } = await axios.get<GeneralReport[]>('/api/general-reports');
  return data;
};

export const createGeneralReport = async (formData: FormData) => {
  const { data } = await axios.post<GeneralReport>('/api/general-reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
