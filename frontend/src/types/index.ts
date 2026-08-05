export type UserRole = 'ADMIN' | 'PORTERO' | 'SUPERADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  tenantId: string;
  fullName: string;
  email: string;
  password: string;
  role: Exclude<UserRole, 'SUPERADMIN'>;
}

export interface UpdateUserInput {
  tenantId?: string;
  fullName?: string;
  email?: string;
  password?: string;
  role?: Exclude<UserRole, 'SUPERADMIN'>;
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

export interface Round {
  id: string;
  tenantId: string;
  guard?: {
    fullName: string;
  };
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt: string | null;
  // Si tu backend algún día los manda, se usarán; si no, los calculamos abajo
  completedCheckpointsCount?: number;
  totalCheckpointsCount?: number;
  checks?: Array<{
    id: string;
    controlPoint?: {
      id: string;
    };
  }>;
}



export interface Vehicle {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
  color?: string;
}

export interface ParkingSpot {
  id: string;
  number: string;
  vehicles?: Vehicle[]; // Un parqueadero puede tener vehículos asignados
}

export interface Apartment {
  id: string;
  number: string;
  block: string;
  tenantId: string;
  residents?: Resident[];   // 👈 Relación en cascada
  parkingSpots?: ParkingSpot[]; // 👈 Relación en cascada
}

export interface Resident {
  id: string;
  tenantId: string;
  fullName: string;
  documentId: string;
  email: string;
  phone?: string;
  apartmentId: string;  // 👈 Llave foránea física hacia el apartamento
  apartment?: Apartment; // 👈 Objeto anidado que viene del JOIN en el Backend
  createdAt: string;
}

export interface CreateResidentInput {
  fullName: string;
  documentId: string;
  email: string;
  phone?: string;
  apartmentId: string;  // 👈 Ahora el frontend envía obligatoriamente el UUID seleccionado
}

export interface CreateApartmentInput {
  number: string;
  block?: string;
  tenantId: string;
}

export interface CreateParkingSpotInput {
  number: string;
  tenantId: string;
  apartmentId?: string;
}

export interface CreateVehicleInput {
  plate: string;
  brand?: string;
  color?: string;
  tenantId: string;
  parkingSpotId?: string;
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

export interface RoundConfigInput {
  timePerPoint: number;
  timeBetweenPoints: number;
  vehicleControlSchedule: string;
  totalRoundPoints: number;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  phoneCode: string;
  totalUnits: number;
  totalParkingSlots: number;
  scheduleType: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  rulesText?: string;
  roundConfig: RoundConfigInput; 
}

export type TenantStatus = 'ACTIVE' | 'SUSPENDED';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  phoneCode: string;
  totalUnits: number;
  totalParkingSlots: number;
  scheduleType: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  rulesText?: string;
  status: TenantStatus;
  createdAt: string;
  roundConfig?: RoundConfigInput; 
}