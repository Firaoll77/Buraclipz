import { BarberData, ServiceData, getAllBarbers, getAllServicesForAdmin } from "@/lib/data-store";

// In-memory barbers store for demo writes
let inMemoryBarbersOverride: BarberData[] | null = null;

export async function getAdminBarbers(): Promise<BarberData[]> {
  if (inMemoryBarbersOverride) return inMemoryBarbersOverride;
  return getAllBarbers();
}

export function setAdminBarbers(barbers: BarberData[]) {
  inMemoryBarbersOverride = barbers;
}

// Admin services store delegates to persistent data store
export async function getAdminServices(): Promise<ServiceData[]> {
  return getAllServicesForAdmin();
}

export function setAdminServices(_services: ServiceData[]) {
  // Persistence is handled directly in data-store via updateService/createService/deleteService
}

// In-memory time-off store for demo mode
export interface TimeOffData {
  id: string;
  barberId: string;
  barberName?: string;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
}

export const inMemoryTimeOff: TimeOffData[] = [];
