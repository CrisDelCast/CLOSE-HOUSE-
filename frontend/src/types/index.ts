export type UserRole = 'ADMIN' | 'PORTERO';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

export interface LoginPayload {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Resident {
  id: string;
  tenantId: string;
  fullName: string;
  documentId: string;
  email: string;
  unitNumber: string;
  phone?: string;
  vehiclePlate?: string;
  createdAt: string;
}

export interface CreateResidentInput {
  fullName: string;
  documentId: string;
  email: string;
  unitNumber: string;
  phone?: string;
  vehiclePlate?: string;
}

export type VisitorStatus = 'PENDING' | 'IN' | 'OUT' | 'DENIED';

export interface Visitor {
  id: string;
  tenantId: string;
  residentId?: string;
  fullName: string;
  documentType: string;
  documentId: string;
  phone?: string;
  vehiclePlate?: string;
  purpose?: string;
  notes?: string;
  status: VisitorStatus;
  checkInAt?: string;
  checkOutAt?: string;
  authorizedBy?: string;
  createdAt: string;
  resident?: Resident;
}

export interface CreateVisitorInput {
  fullName: string;
  documentType: string;
  documentId: string;
  residentId?: string;
  phone?: string;
  vehiclePlate?: string;
  purpose?: string;
  notes?: string;
}

export interface DenyVisitorInput {
  notes?: string;
}


